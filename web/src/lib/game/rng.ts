/**
 * Générateur pseudo-aléatoire à graine (mulberry32).
 * Son état tient dans un seul nombre, rangé dans l'état du jeu : une partie se rejoue
 * à l'identique avec la même graine, ce qui rend le moteur testable.
 */
export interface RngState {
  rng: number;
}

/** Nombre dans [0, 1[. Fait avancer l'état. */
export function random(s: RngState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entier dans [min, max] (bornes incluses). */
export function int(s: RngState, min: number, max: number): number {
  return min + Math.floor(random(s) * (max - min + 1));
}

export function chance(s: RngState, probability: number): boolean {
  return random(s) < probability;
}

export function pick<T>(s: RngState, list: readonly T[]): T {
  return list[Math.floor(random(s) * list.length)];
}

/** Tirage pondéré : [[valeur, poids], …]. */
export function weighted<T>(s: RngState, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = random(s) * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function shuffle<T>(s: RngState, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
