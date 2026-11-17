import { readFile } from "node:fs/promises";
import type { IndexedChunk } from "./embed.ts";
import { embedQuery } from "../lib/embedder.ts";
import { topK } from "../lib/vector.ts";

// Usage : npm run search -- "comment fonctionne computed ?"
async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage : npm run search -- "ta question"');
    process.exit(1);
  }

  const index: IndexedChunk[] = JSON.parse(await readFile("data/index.json", "utf8"));
  const results = topK(await embedQuery(question), index, 5);

  for (const { item, score } of results) {
    console.log(`\n[${score.toFixed(3)}] ${item.source} — ${item.heading}`);
    console.log(item.text.slice(0, 200).replace(/\n/g, " ") + "…");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
