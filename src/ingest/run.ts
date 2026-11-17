import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { chunkMarkdown, type Chunk } from "./chunk.ts";

const DOCS_DIR = "data/vue-docs/src";
const OUT_FILE = "data/chunks.json";
// On commence par le guide et l'API ; le reste (tutoriel, exemples) viendra plus tard.
const INCLUDE = ["guide", "api"];

async function listMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(e.parentPath, e.name));
}

/** Chemin relatif toujours avec des "/", même sous Windows. */
function toPosix(file: string): string {
  return relative(DOCS_DIR, file).split(sep).join("/");
}

async function main() {
  const files = (await listMarkdown(DOCS_DIR)).filter((f) =>
    INCLUDE.some((p) => toPosix(f).startsWith(p + "/")),
  );

  const all: Chunk[] = [];
  for (const file of files) {
    const md = await readFile(file, "utf8");
    all.push(...chunkMarkdown(md.replace(/\r\n/g, "\n"), toPosix(file)));
  }

  await mkdir("data", { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`${files.length} fichiers → ${all.length} morceaux → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
