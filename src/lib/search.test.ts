import { describe, it, expect } from "vitest";
import { Bm25, tokenize } from "./bm25.ts";
import { reciprocalRankFusion } from "./fusion.ts";

describe("tokenize", () => {
  it("met en minuscules, retire accents et mots vides", () => {
    expect(tokenize("Quelle différence entre Computed et une méthode ?")).toEqual([
      "difference",
      "computed",
      "methode",
    ]);
  });

  it("garde les termes Vue avec tiret", () => {
    expect(tokenize("Utiliser v-model")).toContain("v-model");
  });
});

describe("Bm25", () => {
  const bm = new Bm25([
    "Transitions and animations in Vue",
    "Computed properties are cached based on their reactive dependencies",
    "Methods run again on every re-render, unlike computed",
  ]);

  it("classe en premier les documents qui contiennent le terme", () => {
    const ids = bm.search("computed", 3).map((r) => r.index);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(0);
  });

  it("ne renvoie rien si aucun terme ne correspond", () => {
    expect(bm.search("pinia", 3)).toEqual([]);
  });
});

describe("reciprocalRankFusion", () => {
  it("favorise les éléments bien classés dans les deux listes", () => {
    const fused = reciprocalRankFusion([
      ["a", "b", "c"],
      ["b", "d", "a"],
    ]);
    expect(fused[0]).toBe("b");
    expect(fused).toHaveLength(4);
  });
});
