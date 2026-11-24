/**
 * Les trois rendus Canvas 2D. Chaque fonction reçoit l'image audio du moment
 * et dessine une image complète : aucune dépendance à Vue ni au moteur audio.
 *
 * Couleurs : celles du site (bleu nuit, bleu, turquoise), du grave vers l'aigu.
 */

export type Mode = "anneau" | "spectre" | "onde";

export const MODES: { id: Mode; label: string }[] = [
  { id: "anneau", label: "Anneau" },
  { id: "spectre", label: "Spectre" },
  { id: "onde", label: "Onde" },
];

export interface AudioFrame {
  bands: Float32Array;      // énergie par bande logarithmique, 0 à 1
  wave: Uint8Array;         // forme d'onde, centrée sur 128
  bass: number;             // niveau des basses, 0 à 1
  level: number;            // volume global (RMS), 0 à 1
  pulse: number;            // 1 au moment d'un beat, puis décroît vers 0
  time: number;             // secondes depuis le début
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 à la naissance, 0 à la mort
  size: number;
  color: string;
}

export interface Scene {
  peaks: Float32Array;
  peakSpeed: Float32Array;
  particles: Particle[];
  colors: string[];
  reducedMotion: boolean;
  lastMode: Mode | null;
  /** Gain automatique de la forme d'onde : un morceau calme reste lisible, un morceau fort ne déborde pas. */
  waveGain: number;
}

const INK = "#0a2540";
const STOPS: [number, number, number][] = [
  [73, 192, 178],  // turquoise
  [0, 112, 192],   // bleu
  [120, 170, 255], // bleu clair
  [230, 231, 232], // gris du CV
];

/** Couleur interpolée sur le dégradé, pour t entre 0 (grave) et 1 (aigu). */
export function gradientColor(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function createScene(bandCount: number, reducedMotion: boolean): Scene {
  return {
    peaks: new Float32Array(bandCount),
    peakSpeed: new Float32Array(bandCount),
    particles: [],
    colors: Array.from({ length: bandCount }, (_, i) => gradientColor(i / (bandCount - 1))),
    reducedMotion,
    lastMode: null,
    waveGain: 1,
  };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: Mode,
  frame: AudioFrame,
  scene: Scene,
  dt: number,
) {
  // En changeant de mode, on efface les traînées du mode précédent
  const modeChanged = scene.lastMode !== mode;
  scene.lastMode = mode;

  if (mode === "onde" && !modeChanged) {
    // Fond semi-transparent : l'image précédente s'efface lentement, d'où les traînées
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = scene.reducedMotion ? 1 : 0.22;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  } else {
    background(ctx, w, h, frame, scene);
  }

  if (mode === "anneau") drawRing(ctx, w, h, frame, scene, dt);
  else if (mode === "spectre") drawSpectrum(ctx, w, h, frame, scene, dt);
  else drawWave(ctx, w, h, frame, scene, dt);

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function background(ctx: CanvasRenderingContext2D, w: number, h: number, frame: AudioFrame, scene: Scene) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  // Halo qui respire avec les basses. Volontairement doux : pas de flash brutal.
  const glow = scene.reducedMotion ? 0.08 : 0.06 + frame.bass * 0.12 + frame.pulse * 0.06;
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, `rgba(0, 112, 192, ${glow})`);
  g.addColorStop(1, "rgba(0, 112, 192, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Ajuste doucement scene.waveGain pour que le pic de l'onde vise ~90 % de la hauteur disponible. */
function updateWaveGain(wave: Uint8Array, scene: Scene, dt: number) {
  let peak = 0;
  for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i] - 128) / 128);
  const target = peak > 0.01 ? Math.min(4, Math.max(1, 0.9 / peak)) : scene.waveGain;
  // Baisse tout de suite (pas de débordement sur un kick), remonte lentement (pas de pompage)
  if (target < scene.waveGain) scene.waveGain = target;
  else scene.waveGain += (target - scene.waveGain) * Math.min(1, dt * 1.5);
}

/* ---------- Anneau : spectre circulaire en miroir, cœur qui bat, particules ---------- */

function drawRing(ctx: CanvasRenderingContext2D, w: number, h: number, frame: AudioFrame, scene: Scene, dt: number) {
  const { bands, pulse, bass } = frame;
  const n = bands.length;
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h);
  const motion = scene.reducedMotion ? 0 : 1;
  const radius = size * 0.2 * (1 + motion * (pulse * 0.07 + bass * 0.05));
  const maxLen = size * 0.26;
  const spin = motion * frame.time * 0.05;

  // Particules lâchées sur chaque beat
  if (pulse > 0.98 && motion) spawnParticles(scene, cx, cy, radius, 18 + Math.round(bass * 20));
  updateParticles(ctx, scene, dt);

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, ((Math.PI * radius) / n) * 0.62);
  for (let i = 0; i < n; i++) {
    const v = Math.pow(bands[i], 1.2);
    const len = 3 + v * maxLen;
    ctx.strokeStyle = scene.colors[i];
    ctx.globalAlpha = 0.45 + v * 0.55;
    // Moitié droite et son miroir à gauche : les basses en haut, les aigus en bas
    for (const side of [1, -1]) {
      const a = -Math.PI / 2 + side * ((i + 0.5) / n) * Math.PI + spin;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cx + cos * (radius + 4), cy + sin * (radius + 4));
      ctx.lineTo(cx + cos * (radius + 4 + len), cy + sin * (radius + 4 + len));
      ctx.stroke();
    }
  }

  // Cœur : disque sombre, cerclé de turquoise, avec la forme d'onde à l'intérieur
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const core = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  core.addColorStop(0, "#123a63");
  core.addColorStop(1, INK);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#49c0b2";
  ctx.lineWidth = 2 + pulse * 2;
  ctx.stroke();

  const wave = frame.wave;
  updateWaveGain(wave, scene, dt);
  const inner = radius * 0.78;
  ctx.strokeStyle = "rgba(230, 231, 232, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const step = Math.max(1, Math.floor(wave.length / 256));
  for (let i = 0; i < wave.length; i += step) {
    const x = cx - inner + (i / (wave.length - 1)) * inner * 2;
    // Fenêtre en cosinus : la courbe s'aplatit sur les bords du cercle
    const win = Math.sin((i / (wave.length - 1)) * Math.PI);
    const y = cy + ((wave[i] - 128) / 128) * scene.waveGain * radius * 0.6 * win;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function spawnParticles(scene: Scene, cx: number, cy: number, radius: number, count: number) {
  for (let k = 0; k < count && scene.particles.length < 260; k++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    scene.particles.push({
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 1,
      size: 1 + Math.random() * 2.2,
      color: Math.random() < 0.6 ? "#49c0b2" : "#e6e7e8",
    });
  }
}

function updateParticles(ctx: CanvasRenderingContext2D, scene: Scene, dt: number) {
  const list = scene.particles;
  ctx.globalCompositeOperation = "lighter";
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt * 0.7;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 0.8;
    p.vy *= 1 - dt * 0.8;
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------- Spectre : barres classiques avec chapeaux qui retombent et reflet ---------- */

function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, frame: AudioFrame, scene: Scene, dt: number) {
  const { bands } = frame;
  const n = bands.length;
  const padX = Math.max(16, w * 0.04);
  const base = h * 0.76;
  const maxH = h * 0.62;
  const slot = (w - padX * 2) / n;
  const barW = Math.max(1.5, slot * 0.68);

  for (let i = 0; i < n; i++) {
    const v = Math.pow(bands[i], 1.15);
    const bh = Math.max(2, v * maxH);
    const x = padX + i * slot + (slot - barW) / 2;

    // Chapeau : monte avec la barre, retombe avec une petite gravité
    if (v >= scene.peaks[i]) {
      scene.peaks[i] = v;
      scene.peakSpeed[i] = 0;
    } else {
      scene.peakSpeed[i] += dt * 1.6;
      scene.peaks[i] = Math.max(0, scene.peaks[i] - scene.peakSpeed[i] * dt);
    }

    ctx.fillStyle = scene.colors[i];
    ctx.globalAlpha = 0.95;
    ctx.fillRect(x, base - bh, barW, bh);

    // Reflet sous la ligne de base
    ctx.globalAlpha = 0.16;
    ctx.fillRect(x, base + 4, barW, bh * 0.35);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e6e7e8";
    ctx.fillRect(x, base - Math.max(2, scene.peaks[i] * maxH) - 5, barW, 2);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(230, 231, 232, 0.35)";
  ctx.fillRect(padX, base + 1, w - padX * 2, 1);
}

/* ---------- Onde : oscilloscope à traînées, épaissi par les basses ---------- */

function drawWave(ctx: CanvasRenderingContext2D, w: number, h: number, frame: AudioFrame, scene: Scene, dt: number) {
  const { wave, bass, level, pulse } = frame;
  updateWaveGain(wave, scene, dt);
  const mid = h / 2;
  const amp = h * 0.38;
  const motion = scene.reducedMotion ? 0 : 1;

  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";

  // Deux passes : un trait large et diffus, puis un trait fin et net
  const passes = [
    { color: "#0070c0", width: 6 + bass * 14, alpha: 0.35 },
    { color: "#49c0b2", width: 2 + level * 3, alpha: 0.95 },
  ];
  const step = Math.max(1, Math.floor(wave.length / Math.min(1024, w)));
  for (const pass of passes) {
    ctx.strokeStyle = pass.color;
    ctx.lineWidth = pass.width;
    ctx.globalAlpha = pass.alpha;
    ctx.beginPath();
    for (let i = 0; i < wave.length; i += step) {
      const x = (i / (wave.length - 1)) * w;
      const y = mid + ((wave[i] - 128) / 128) * scene.waveGain * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Ligne d'horizon qui s'allume sur les beats
  ctx.globalAlpha = 0.2 + pulse * 0.4 * motion;
  ctx.fillStyle = "#e6e7e8";
  ctx.fillRect(0, mid, w, 1);
  ctx.globalAlpha = 1;
}
