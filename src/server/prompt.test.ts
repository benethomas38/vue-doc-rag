import { describe, it, expect } from "vitest";
import { buildPrompt, citedSources, sourceUrl } from "./prompt.ts";
import type { Chunk } from "../ingest/chunk.ts";

describe("sourceUrl", () => {
  it("transforme le chemin en URL de la doc", () => {
    expect(sourceUrl("guide/essentials/computed.md")).toBe("https://vuejs.org/guide/essentials/computed");
  });

  it("gère les pages index", () => {
    expect(sourceUrl("guide/index.md")).toBe("https://vuejs.org/guide");
  });
});

describe("citedSources", () => {
  const sources = [1, 2, 3, 4].map((n) => ({ n, title: `T${n}`, url: `u${n}` }));

  it("garde uniquement les sources citées, y compris collées [2][4]", () => {
    const res = citedSources("Voir [2][4], et encore [2].", sources);
    expect(res.map((s) => s.n)).toEqual([2, 4]);
  });

  it("renvoie une liste vide si rien n'est cité", () => {
    expect(citedSources("Pas de source.", sources)).toEqual([]);
  });
});

describe("buildPrompt", () => {
  const chunks: Chunk[] = [
    { id: "a#0", source: "guide/a.md", heading: "A > Intro", text: "Texte A" },
    { id: "b#0", source: "api/b.md", heading: "B", text: "Texte B" },
  ];

  it("numérote les sources dans l'ordre", () => {
    const { sources } = buildPrompt("Question ?", chunks);
    expect(sources).toEqual([
      { n: 1, title: "A > Intro", url: "https://vuejs.org/guide/a" },
      { n: 2, title: "B", url: "https://vuejs.org/api/b" },
    ]);
  });

  it("inclut les extraits numérotés et la question", () => {
    const { content } = buildPrompt("Question ?", chunks);
    expect(content).toContain('<extrait n="1" titre="A > Intro">\nTexte A\n</extrait>');
    expect(content).toContain('<extrait n="2"');
    expect(content.trim().endsWith("Question : Question ?")).toBe(true);
  });
});
