/**
 * Calculs sur les données de l'AnalyserNode, sans dépendance au DOM (donc testables).
 *
 * L'AnalyserNode donne une FFT linéaire : chaque case couvre la même largeur en Hz.
 * L'oreille, elle, entend en échelle logarithmique (une octave = un doublement de fréquence).
 * On regroupe donc les cases en bandes de largeur croissante pour que les basses,
 * qui portent le rythme du rap, aient autant de place à l'écran que les aigus.
 */

/** Indices de cases FFT qui délimitent `count` bandes logarithmiques (count + 1 bornes). */
export function bandEdges(
  count: number,
  sampleRate: number,
  fftSize: number,
  minHz = 32,
  maxHz = 16000,
): Uint16Array {
  const binHz = sampleRate / fftSize;
  const lastBin = fftSize / 2 - 1;
  const top = Math.min(maxHz, (lastBin + 1) * binHz);
  const edges = new Uint16Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const hz = minHz * Math.pow(top / minHz, i / count);
    edges[i] = Math.min(lastBin + 1, Math.round(hz / binHz));
  }
  // Les premières bandes peuvent tomber sur la même case : on garantit au moins une case par bande
  for (let i = 1; i <= count; i++) {
    if (edges[i] <= edges[i - 1]) edges[i] = edges[i - 1] + 1;
  }
  return edges;
}

/**
 * Moyenne de chaque bande, ramenée entre 0 et 1.
 * `tilt` relève les aigus, naturellement moins forts dans un mix, pour un spectre plus lisible.
 */
export function toBands(
  freq: Uint8Array,
  edges: Uint16Array,
  out: Float32Array,
  tilt = 0.5,
): Float32Array {
  const count = out.length;
  for (let i = 0; i < count; i++) {
    const from = edges[i];
    const to = Math.min(edges[i + 1], freq.length);
    let sum = 0;
    for (let b = from; b < to; b++) sum += freq[b];
    const avg = to > from ? sum / (to - from) / 255 : 0;
    out[i] = Math.min(1, avg * (1 + (tilt * i) / count));
  }
  return out;
}

/** Niveau moyen (0 à 1) entre deux fréquences, par exemple les basses pour le kick. */
export function rangeLevel(
  freq: Uint8Array,
  sampleRate: number,
  fftSize: number,
  fromHz: number,
  toHz: number,
): number {
  const binHz = sampleRate / fftSize;
  const from = Math.max(0, Math.floor(fromHz / binHz));
  const to = Math.min(freq.length, Math.max(from + 1, Math.ceil(toHz / binHz)));
  let sum = 0;
  for (let b = from; b < to; b++) sum += freq[b];
  return sum / (to - from) / 255;
}

/** Volume global (RMS) de la forme d'onde, entre 0 et 1. Les octets sont centrés sur 128. */
export function waveRms(wave: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < wave.length; i++) {
    const v = (wave[i] - 128) / 128;
    sum += v * v;
  }
  return wave.length ? Math.sqrt(sum / wave.length) : 0;
}

export interface BeatDetectorOptions {
  /** Nombre d'images retenues pour la moyenne glissante (≈ 1 s à 60 images/s). */
  history?: number;
  /** Un beat = énergie au-dessus de moyenne × threshold. */
  threshold?: number;
  /** Énergie minimale, pour ignorer les silences et le souffle. */
  minEnergy?: number;
  /** Délai minimal entre deux beats, en ms. */
  cooldownMs?: number;
}

/**
 * Détection de beat par énergie : on compare l'énergie des basses à sa moyenne récente.
 * Simple et robuste sur du rap, où le kick domine le bas du spectre.
 * Un beat = une attaque (l'énergie monte) nettement au-dessus de la moyenne récente.
 */
export function createBeatDetector(options: BeatDetectorOptions = {}) {
  const size = options.history ?? 60;
  const threshold = options.threshold ?? 1.4;
  const minEnergy = options.minEnergy ?? 0.18;
  const cooldown = options.cooldownMs ?? 250;

  const history = new Float32Array(size);
  let filled = 0;
  let index = 0;
  let sum = 0;
  let lastBeat = -Infinity;
  let previous = 0;

  return function detect(energy: number, nowMs: number): boolean {
    const mean = filled ? sum / filled : 0;
    const isBeat =
      filled >= Math.min(10, size) &&
      energy > minEnergy &&
      energy > mean * threshold &&
      // Il faut une attaque : sans ça, la queue d'un kick qui dure redéclenche un beat
      energy > previous * 1.04 &&
      nowMs - lastBeat >= cooldown;
    previous = energy;

    // Mise à jour de la moyenne glissante (tampon circulaire)
    sum += energy - history[index];
    history[index] = energy;
    index = (index + 1) % size;
    if (filled < size) filled++;

    if (isBeat) lastBeat = nowMs;
    return isBeat;
  };
}

/** 83.4 → "1:23" */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "02 - Mon_morceau (master).mp3" → "02 - Mon morceau (master)" */
export function trackTitle(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_/g, " ").trim() || "Sans titre";
}
