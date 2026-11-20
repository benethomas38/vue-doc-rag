import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { ask, askStream, loadIndex } from "./rag.ts";
import { createDailyQuota } from "./quota.ts";

const PORT = Number(process.env.PORT ?? 3001);
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR ?? 10);   // questions par visiteur et par heure
const PER_DAY = Number(process.env.DAILY_LIMIT ?? 200);           // questions par jour, tous visiteurs
const WEB_DIST = resolve("web/dist");                             // interface Vue buildée

const app = express();
// Derrière l'hébergeur (Render, Railway, Nginx…), l'IP du visiteur arrive dans X-Forwarded-For
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));

// --- Protection de la clé API -----------------------------------------------

const perVisitor = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: PER_HOUR,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: `Limite atteinte (${PER_HOUR} questions par heure). Réessaie un peu plus tard !` },
});

const dailyQuota = createDailyQuota(PER_DAY);
function perDay(_req: Request, res: Response, next: NextFunction) {
  if (!dailyQuota.take()) {
    res.status(429).json({ error: "La démo a atteint sa limite du jour. Reviens demain !" });
    return;
  }
  next();
}

// --- API ----------------------------------------------------------------------

/** Valide la question ; renvoie null et répond en 400 si elle est invalide. */
function readQuestion(req: Request, res: Response): string | null {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    res.status(400).json({ error: "Le champ 'question' est obligatoire." });
    return null;
  }
  if (question.length > 1000) {
    res.status(400).json({ error: "Question trop longue (1000 caractères max)." });
    return null;
  }
  return question;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, remainingToday: dailyQuota.remaining() });
});

// Réponse complète en une fois (pratique pour tester avec Invoke-RestMethod)
app.post("/api/ask", perVisitor, async (req, res) => {
  const question = readQuestion(req, res);
  if (!question) return;
  if (!dailyQuota.take()) {
    res.status(429).json({ error: "La démo a atteint sa limite du jour. Reviens demain !" });
    return;
  }

  try {
    res.json(await ask(question));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
});

// Réponse en streaming (Server-Sent Events), utilisée par l'interface Vue
app.post("/api/ask/stream", perVisitor, (req, res, next) => {
  // On valide avant de consommer le quota : une question vide ne compte pas
  if (readQuestion(req, res) !== null) perDay(req, res, next);
}, async (req, res) => {
  const question = (req.body.question as string).trim();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // empêche Nginx de retenir le flux
  });
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Si le visiteur ferme l'onglet, on arrête l'appel à Claude (et on arrête de payer)
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    for await (const event of askStream(question, controller.signal)) {
      send(event.type, event.data);
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error(err);
      send("error", { message: "Erreur lors de la génération de la réponse." });
    }
  }
  res.end();
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route inconnue." });
});

// --- Site (production) ----------------------------------------------------------
// En développement, c'est Vite qui sert l'interface. En production, c'est ce serveur.

if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { maxAge: "1h", index: false }));
  // Toutes les autres URL renvoient l'app Vue, qui gère ses routes (/projets, /projets/vue-doc-rag…)
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(resolve(WEB_DIST, "index.html"));
  });
}

// --- Démarrage ------------------------------------------------------------------

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY manquante : ajoute-la dans le fichier .env (ou dans les variables de l'hébergeur)");
  process.exit(1);
}

const count = await loadIndex();
app.listen(PORT, () => {
  console.log(`Index chargé : ${count} morceaux`);
  console.log(`Limites : ${PER_HOUR}/heure par visiteur, ${PER_DAY}/jour au total`);
  console.log(`Serveur prêt sur http://localhost:${PORT}`);
});
