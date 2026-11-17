import { describe, it, expect } from "vitest";
import { dot, topK } from "./vector.ts";

describe("dot", () => {
  it("calcule le produit scalaire", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("refuse des vecteurs de tailles différentes", () => {
    expect(() => dot([1, 2], [1])).toThrow();
  });
});

describe("topK", () => {
  const items = [
    { id: "a", vector: [1, 0] },
    { id: "b", vector: [0, 1] },
    { id: "c", vector: [0.7, 0.7] },
  ];

  it("trie par score décroissant et limite à k", () => {
    const res = topK([1, 0], items, 2);
    expect(res.map((r) => r.item.id)).toEqual(["a", "c"]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    topK([0, 1], items, 3);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
