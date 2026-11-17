/**
 * Reciprocal Rank Fusion : fusionne plusieurs classements en un seul.
 * Chaque élément gagne 1 / (k + rang) dans chaque liste où il apparaît.
 * On n'utilise que les rangs, pas les scores : pas besoin de comparer
 * un score BM25 avec une similarité cosinus, qui n'ont pas la même échelle.
 */
export function reciprocalRankFusion(rankings: string[][], k = 60): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
