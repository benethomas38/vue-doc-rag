/**
 * Recherche par mots-clés BM25, l'algorithme classique des moteurs de recherche.
 * Complète la recherche vectorielle : elle retrouve les termes exacts
 * (computed, v-model, defineProps…) que le modèle d'embeddings peut rater.
 */

// Mots trop fréquents pour être utiles (français + anglais)
const STOPWORDS = new Set(
  ("le la les un une des de du et ou en au aux est que qui quoi quel quelle comment pourquoi " +
    "dans pour par sur avec sans entre ce cette ces mon ton son je tu il on nous vous faire " +
    "the a an and or of to in on for with is are be it this that how what why when can do does")
    .split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export class Bm25 {
  private docs: Map<string, number>[] = [];
  private lengths: number[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;
  private k1 = 1.2;  // saturation de la fréquence d'un terme
  private b = 0.75;  // pénalité pour les documents longs

  constructor(texts: string[]) {
    for (const text of texts) {
      const tf = new Map<string, number>();
      const tokens = tokenize(text);
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push(tf);
      this.lengths.push(tokens.length);
    }
    this.avgLength = this.lengths.reduce((a, b) => a + b, 0) / (texts.length || 1);
  }

  /** Renvoie les indices des documents les plus pertinents, du meilleur au moins bon. */
  search(query: string, k: number): { index: number; score: number }[] {
    const terms = [...new Set(tokenize(query))];
    const n = this.docs.length;
    const results: { index: number; score: number }[] = [];

    this.docs.forEach((tf, i) => {
      let score = 0;
      for (const t of terms) {
        const f = tf.get(t);
        if (!f) continue;
        const df = this.df.get(t)!;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.lengths[i]) / this.avgLength)));
      }
      if (score > 0) results.push({ index: i, score });
    });

    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
