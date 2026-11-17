import { describe, it, expect } from "vitest";
import { chunkMarkdown, cleanMarkdown } from "./chunk.ts";

describe("cleanMarkdown", () => {
  it("retire le frontmatter et le script setup", () => {
    const md = "---\ntitle: x\n---\n<script setup>\nimport A from 'a'\n</script>\n# Titre";
    expect(cleanMarkdown(md)).toBe("# Titre");
  });
});

describe("chunkMarkdown", () => {
  it("découpe par titres avec le fil d'Ariane", () => {
    const md = "# Computed\nIntro\n## Writable\nTexte A\n### Détail\nTexte B";
    const chunks = chunkMarkdown(md, "guide/computed.md");
    expect(chunks.map((c) => c.heading)).toEqual([
      "Computed",
      "Computed > Writable",
      "Computed > Writable > Détail",
    ]);
    expect(chunks[1].text).toBe("Texte A");
  });

  it("ignore les # à l'intérieur des blocs de code", () => {
    const md = "## Section\n```sh\n# un commentaire shell\n```";
    const chunks = chunkMarkdown(md, "a.md");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("# un commentaire shell");
  });

  it("retire les ancres VitePress des titres", () => {
    const chunks = chunkMarkdown("## Props {#props}\nTexte", "a.md");
    expect(chunks[0].heading).toBe("Props");
  });

  it("redécoupe une section trop longue sans couper le code", () => {
    const para = "Lorem ipsum ".repeat(60);
    const code = "```js\n" + "const a = 1\n\nconst b = 2\n".repeat(20) + "```";
    const md = `## Long\n${para}\n\n${para}\n\n${code}`;
    const chunks = chunkMarkdown(md, "a.md");
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      const fences = (c.text.match(/```/g) ?? []).length;
      expect(fences % 2).toBe(0);
    }
  });
});
