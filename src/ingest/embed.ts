import { readFile, writeFile } from "node:fs/promises";
import type { Chunk } from "./chunk.ts";
import { embedPassages } from "../lib/embedder.ts";

const IN_FILE = "data/chunks.json";
const OUT_FILE = "data/index.json";
const BATCH = 16;

export interface IndexedChunk extends Chunk {
  vector: number[];
}

async function main() {
  const chunks: Chunk[] = JSON.parse(await readFile(IN_FILE, "utf8"));
  const indexed: IndexedChunk[] = [];
  const start = Date.now();

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    // Le titre est ajouté au texte : il donne du contexte au modèle.
    const vectors = await embedPassages(batch.map((c) => `${c.heading}\n${c.text}`));
    batch.forEach((c, j) => {
      // 5 décimales suffisent et divisent la taille du fichier par trois
      indexed.push({ ...c, vector: vectors[j].map((x) => Math.round(x * 1e5) / 1e5) });
    });
    process.stdout.write(`\r${indexed.length}/${chunks.length} morceaux vectorisés`);
  }

  await writeFile(OUT_FILE, JSON.stringify(indexed));
  const secs = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n${indexed.length} vecteurs (dim ${indexed[0]?.vector.length}) → ${OUT_FILE} en ${secs} s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
