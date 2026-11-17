import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import type { IndexedChunk } from "../ingest/embed.ts";
import { embedQuery } from "../lib/embedder.ts";
import { topK } from "../lib/vector.ts";
import { Bm25 } from "../lib/bm25.ts";
import { reciprocalRankFusion } from "../lib/fusion.ts";
import { buildPrompt, citedSources, SYSTEM_PROMPT, type Source } from "./prompt.ts";

const TOP_K = 6;         // passages envoyés à Claude
const CANDIDATES = 20;   // candidats retenus par chaque méthode avant fusion
// Haiku : rapide et peu cher, idéal pour développer. Passe à Sonnet si tu veux de meilleures réponses.
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-5-5";

const client = new Anthropic(); // lit ANTHROPIC_API_KEY dans l'environnement
let index: IndexedChunk[] = [];
let byId = new Map<string, IndexedChunk>();
let bm25: Bm25 | null = null;

export async function loadIndex(): Promise<number> {
  index = JSON.parse(await readFile("data/index.json", "utf8"));
  byId = new Map(index.map((c) => [c.id, c]));
  bm25 = new Bm25(index.map((c) => `${c.heading}\n${c.text}`));
  return index.length;
}

/** Recherche hybride : vecteurs (le sens) + BM25 (les mots exacts), fusionnés par RRF. */
export async function retrieve(question: string, k = TOP_K): Promise<IndexedChunk[]> {
  if (!bm25) throw new Error("Index non chargé : appelle loadIndex() au démarrage");

  const vectorIds = topK(await embedQuery(question), index, CANDIDATES).map((r) => r.item.id);
  const keywordIds = bm25.search(question, CANDIDATES).map((r) => index[r.index].id);

  return reciprocalRankFusion([vectorIds, keywordIds])
    .slice(0, k)
    .map((id) => byId.get(id)!);
}

export interface Answer {
  answer: string;
  sources: Source[];
}

export async function ask(question: string): Promise<Answer> {
  // 1. Retrouver les passages les plus pertinents
  const passages = await retrieve(question);

  // 2. Les envoyer à Claude avec la question
  const { content, sources } = buildPrompt(question, passages);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const answer = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // 3. Ne renvoyer que les sources réellement citées
  return { answer, sources: citedSources(answer, sources) };
}

export type StreamEvent =
  | { type: "sources"; data: { sources: Source[] } }  // tous les passages envoyés à Claude
  | { type: "delta"; data: { text: string } }         // un morceau de réponse
  | { type: "done"; data: { sources: Source[] } };    // les sources réellement citées

/** Même chose que ask(), mais la réponse arrive morceau par morceau. */
export async function* askStream(question: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const passages = await retrieve(question);
  const { content, sources } = buildPrompt(question, passages);
  yield { type: "sources", data: { sources } };

  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    },
    { signal },
  );

  let answer = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      answer += event.delta.text;
      yield { type: "delta", data: { text: event.delta.text } };
    }
  }

  yield { type: "done", data: { sources: citedSources(answer, sources) } };
}
