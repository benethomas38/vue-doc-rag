/**
 * Routes du « Donjon qui parle » :
 *   POST /api/game/talk          une réplique au PNJ → sa réponse en SSE (texte puis action éventuelle)
 *   GET  /api/game/riddle/:index la question de l'énigme de la Sphinge (sans la réponse)
 */
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { createDailyQuota } from "../server/quota.ts";
import { riddle } from "./riddles.ts";
import { MAX_MESSAGE, NPC_IDS, readGame, readHistory, readMood, talk, type NpcId, type StreamTalk } from "./npcs.ts";

export interface GameRouterOptions {
  stream: StreamTalk;
  model: string;
  perHour: number;
  perDay: number;
}

export function createGameRouter(opts: GameRouterOptions) {
  const router = Router();
  const dailyQuota = createDailyQuota(opts.perDay);

  // Une réplique = un appel à Claude, court (300 tokens max) : les limites sont plus larges que pour le RAG
  const perVisitor = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: opts.perHour,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: `Les personnages sont fatigués (${opts.perHour} répliques par heure). Reviens un peu plus tard !` },
  });
  const light = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });

  router.get("/riddle/:index", light, (req: Request, res: Response) => {
    res.json({ question: riddle(Number(req.params.index)).question });
  });

  router.post("/talk", perVisitor, async (req: Request, res: Response) => {
    const npc = req.body?.npc as NpcId;
    if (!NPC_IDS.includes(npc)) {
      res.status(400).json({ error: "Personnage inconnu." });
      return;
    }
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      res.status(400).json({ error: "Dis quelque chose !" });
      return;
    }
    if (message.length > MAX_MESSAGE) {
      res.status(400).json({ error: `Réplique trop longue (${MAX_MESSAGE} caractères max).` });
      return;
    }
    if (!dailyQuota.take()) {
      res.status(429).json({ error: "Les personnages ont assez parlé pour aujourd'hui. Reviens demain !" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // Onglet fermé ou dialogue quitté : on coupe l'appel à Claude
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const events = talk({
        stream: opts.stream,
        model: opts.model,
        npc,
        message,
        history: readHistory(req.body?.history),
        game: readGame(req.body?.game),
        mood: readMood(req.body?.mood),
        signal: controller.signal,
      });
      for await (const event of events) send(event.type, event.data);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error(err);
        send("error", { message: "Le personnage s'est étranglé avec sa réplique. Réessaie !" });
      }
    }
    res.end();
  });

  return router;
}
