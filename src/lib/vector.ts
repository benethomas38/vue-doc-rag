/** Produit scalaire. Les vecteurs étant normalisés, c'est la similarité cosinus. */
export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Dimensions différentes : ${a.length} vs ${b.length}`);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export interface Scored<T> {
  item: T;
  score: number;
}

/** Renvoie les k éléments les plus proches de la requête, du plus pertinent au moins pertinent. */
export function topK<T extends { vector: number[] }>(query: number[], items: T[], k: number): Scored<T>[] {
  return items
    .map((item) => ({ item, score: dot(query, item.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
