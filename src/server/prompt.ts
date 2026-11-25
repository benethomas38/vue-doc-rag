import type { Chunk } from "../ingest/chunk.ts";

export interface Source {
  n: number;        // numéro cité dans la réponse : [1], [2]…
  title: string;    // fil d'Ariane du passage
  url: string;      // page de la doc officielle
}

export const SYSTEM_PROMPT = `Tu es un assistant expert de Vue.js.
Tu réponds uniquement à partir des extraits de la documentation officielle fournis.
- Réponds dans la langue de la question.
- Cite tes sources avec leur numéro entre crochets, par exemple [1] ou [2][3].
- Donne un exemple de code court quand c'est utile, en Composition API avec <script setup> par défaut.
- Commence directement par la réponse. Si les extraits ne couvrent qu'une partie de la question, réponds avec ce qu'ils contiennent et signale la limite en une phrase à la fin, pas en introduction.
- Si les extraits ne permettent pas de répondre du tout, dis-le clairement au lieu d'inventer.`;

/** URL de la page officielle à partir du chemin du fichier Markdown. */
export function sourceUrl(source: string): string {
  const path = source.replace(/\.md$/, "").replace(/(^|\/)index$/, "");
  return `https://vuejs.org/${path}`;
}

/** Ne garde que les sources réellement citées dans la réponse ([1], [2][3]…). */
export function citedSources(answer: string, sources: Source[]): Source[] {
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return sources.filter((s) => cited.has(s.n));
}

/** Construit le message envoyé à Claude et la liste des sources numérotées. */
export function buildPrompt(question: string, chunks: Chunk[]): { content: string; sources: Source[] } {
  const sources: Source[] = chunks.map((c, i) => ({
    n: i + 1,
    title: c.heading,
    url: sourceUrl(c.source),
  }));

  const excerpts = chunks
    .map((c, i) => `<extrait n="${i + 1}" titre="${c.heading}">\n${c.text}\n</extrait>`)
    .join("\n\n");

  const content = `Extraits de la documentation Vue.js :\n\n${excerpts}\n\nQuestion : ${question}`;
  return { content, sources };
}
