export interface Chunk {
  id: string;
  source: string;   // chemin du fichier, ex: "guide/essentials/computed.md"
  heading: string;  // fil d'Ariane des titres, ex: "Computed Properties > Writable Computed"
  text: string;
}

const MAX_CHARS = 1500;

/** Retire le frontmatter YAML et les blocs <script setup> propres à VitePress. */
export function cleanMarkdown(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/<script setup>[\s\S]*?<\/script>/g, "")
    .trim();
}

/**
 * Découpe un fichier Markdown par titres (##, ###), en gardant le fil d'Ariane.
 * Les sections trop longues sont redécoupées par paragraphes.
 * Les blocs de code ne sont jamais coupés en deux.
 */
export function chunkMarkdown(md: string, source: string): Chunk[] {
  const lines = cleanMarkdown(md).split("\n");
  const sections: { heading: string; body: string[] }[] = [];
  const trail: string[] = [];
  let current = { heading: "", body: [] as string[] };
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith("```")) inCode = !inCode;
    const m = !inCode && /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      if (current.body.join("").trim()) sections.push(current);
      const level = m[1].length;
      trail.length = level - 1;
      trail[level - 1] = m[2].replace(/\s*\{#.*\}$/, "").trim();
      current = { heading: trail.filter(Boolean).join(" > "), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.join("").trim()) sections.push(current);

  const chunks: Chunk[] = [];
  for (const s of sections) {
    for (const piece of splitBySize(s.body.join("\n").trim())) {
      chunks.push({
        id: `${source}#${chunks.length}`,
        source,
        heading: s.heading,
        text: piece,
      });
    }
  }
  return chunks;
}

function splitBySize(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  // Paragraphes, sans couper les blocs de code
  const blocks: string[] = [];
  let buf: string[] = [];
  let inCode = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("```")) inCode = !inCode;
    if (!inCode && line.trim() === "" && buf.length) {
      blocks.push(buf.join("\n"));
      buf = [];
    } else buf.push(line);
  }
  if (buf.length) blocks.push(buf.join("\n"));

  const out: string[] = [];
  let acc = "";
  for (const b of blocks) {
    if (acc && acc.length + b.length > MAX_CHARS) {
      out.push(acc.trim());
      acc = "";
    }
    acc += b + "\n\n";
  }
  if (acc.trim()) out.push(acc.trim());
  return out;
}
