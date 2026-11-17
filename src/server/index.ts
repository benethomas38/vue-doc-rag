import express from "express";
import { ask, loadIndex } from "./rag.ts";

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/ask", async (req, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    res.status(400).json({ error: "Le champ 'question' est obligatoire." });
    return;
  }
  if (question.length > 1000) {
    res.status(400).json({ error: "Question trop longue (1000 caractères max)." });
    return;
  }

  try {
    res.json(await ask(question));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
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
