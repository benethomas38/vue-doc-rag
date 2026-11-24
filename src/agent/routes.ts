/**
 * Routes de l'assistant AGP :
 *   POST /api/agent/run      la demande → l'agent travaille, étapes envoyées en SSE
 *   POST /api/agent/publish  publie un brouillon : appelé par le bouton, jamais par le modèle
 *   GET  /api/agent/agenda   l'agenda de démo du visiteur (14 prochains jours)
 */
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { runAgent, type CreateMessage, type HistoryItem } from "./agent.ts";
import { todayInParis } from "./dates.ts";
import { SESSION_ID, createStore } from "./store.ts";
import { presentDraft } from "./tools.ts";
import { createWeather } from "./weather.ts";
import { createDailyQuota } from "../server/quota.ts";

export interface AgentRouterOptions {
  create: CreateMessage;
  model: string;
  perHour: number;
  perDay: number;
}

const MAX_REQUEST = 600;
const MAX_HISTORY = 6;

export function createAgentRouter(opts: AgentRouterOptions) {
  const router = Router();
  const store = createStore();
  const forecast = createWeather();
  const dailyQuota = createDailyQuota(opts.perDay);

  const perVisitor = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: opts.perHour,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: `Limite atteinte (${opts.perHour} demandes par heure). Réessaie un peu plus tard !` },
  });
  // Publier et lire l'agenda ne coûtent rien en API, mais on évite quand même le martelage
  const light = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false });

  function readSession(value: unknown, res: Response): string | null {
    if (typeof value === "string" && SESSION_ID.test(value)) return value;
    res.status(400).json({ error: "Identifiant de session invalide." });
    return null;
  }

  function readHistory(value: unknown): HistoryItem[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (h): h is HistoryItem =>
          !!h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string" && h.text.trim() !== "",
      )
      .slice(-MAX_HISTORY)
      .map((h) => ({ role: h.role, text: h.text.slice(0, 1500) }));
  }

  router.post("/run", perVisitor, async (req: Request, res: Response) => {
    const sessionId = readSession(req.body?.session, res);
    if (!sessionId) return;
    const request = typeof req.body?.request === "string" ? req.body.request.trim() : "";
    if (!request) {
      res.status(400).json({ error: "Écris ta demande." });
      return;
    }
    if (request.length > MAX_REQUEST) {
      res.status(400).json({ error: `Demande trop longue (${MAX_REQUEST} caractères max).` });
      return;
    }
    // Les messages d'un même échange doivent alterner : on retire un éventuel dernier message utilisateur
    const history = readHistory(req.body?.history);
    while (history.length && history[0].role !== "user") history.shift();
    if (history.at(-1)?.role === "user") history.pop();

    if (!dailyQuota.take()) {
      res.status(429).json({ error: "La démo a atteint sa limite du jour. Reviens demain !" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // Onglet fermé : on arrête la boucle (et les appels payants)
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const events = runAgent({
        create: opts.create,
        model: opts.model,
        request,
        history,
        signal: controller.signal,
        ctx: { sessionId, today: todayInParis(), store, forecast },
      });
      for await (const event of events) send(event.type, event.data);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error(err);
        send("error", { message: "L'agent a rencontré une erreur. Réessaie dans un instant." });
      }
    }
    res.end();
  });

  router.post("/publish", light, (req: Request, res: Response) => {
    const sessionId = readSession(req.body?.session, res);
    if (!sessionId) return;
    const draftId = typeof req.body?.draftId === "string" ? req.body.draftId : "";
    const result = store.publish(sessionId, draftId);
    if ("erreur" in result) {
      res.status(400).json({ error: result.erreur });
      return;
    }
    res.json({ event: presentDraft(result) });
  });

  router.get("/agenda", light, (req: Request, res: Response) => {
    const sessionId = readSession(req.query.session, res);
    if (!sessionId) return;
    res.json({ today: todayInParis(), entries: store.upcoming(sessionId, todayInParis(), 14) });
  });

  return router;
}
