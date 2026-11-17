import express, { type Request, type Response } from "express";
import { ask, askStream, loadIndex } from "./rag.ts";

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(express.json());

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
  res.json({ ok: true });
});

// Réponse complète en une fois (pratique pour tester avec Invoke-RestMethod)
app.post("/api/ask", async (req, res) => {
  const question = readQuestion(req, res);
  if (!question) return;

  try {
    res.json(await ask(question));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
});

// Réponse en streaming (Server-Sent Events), utilisée par l'interface Vue
app.post("/api/ask/stream", async (req, res) => {
  const question = readQuestion(req, res);
  if (!question) return;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Si l'utilisateur ferme l'onglet, on arrête l'appel à Claude (et on arrête de payer)
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

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY manquante : ajoute-la dans le fichier .env");
  process.exit(1);
}

const count = await loadIndex();
app.listen(PORT, () => {
  console.log(`Index chargé : ${count} morceaux`);
  console.log(`Serveur prêt sur http://localhost:${PORT}`);
});
