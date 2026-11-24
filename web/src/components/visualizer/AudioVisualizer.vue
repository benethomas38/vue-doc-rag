<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { AudioEngine, FFT_SIZE, type SourceKind } from "../../lib/visualizer/engine";
import {
  bandEdges,
  createBeatDetector,
  formatTime,
  rangeLevel,
  toBands,
  trackTitle,
  waveRms,
} from "../../lib/visualizer/analysis";
import { MODES, createScene, draw, type AudioFrame, type Mode } from "../../lib/visualizer/renderers";

const BAND_COUNT = 72;

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const kind = ref<SourceKind>("none");
const title = ref("");
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);
const mode = ref<Mode>("anneau");
const error = ref("");
const dragging = ref(false);
const fullscreen = ref(false);

const engine = new AudioEngine({
  onState: syncState,
  onError: (message) => {
    error.value = message;
    syncState();
  },
});

function syncState() {
  kind.value = engine.kind;
  title.value = engine.kind === "file" ? trackTitle(engine.title) : engine.title;
  playing.value = engine.playing;
  duration.value = Number.isFinite(engine.audio.duration) ? engine.audio.duration : 0;
}

const canSeek = computed(() => kind.value === "file" && duration.value > 0);
const playLabel = computed(() => {
  if (kind.value === "mic") return "Couper le micro";
  return playing.value ? "Pause" : "Lecture";
});

/* ---------- Sources ---------- */

async function openFile(file: File | undefined) {
  if (!file) return;
  error.value = "";
  await engine.loadFile(file);
}

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  void openFile(input.files?.[0]);
  input.value = ""; // permet de rouvrir le même fichier
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  void openFile(e.dataTransfer?.files?.[0]);
}

function onDragLeave(e: DragEvent) {
  // dragleave se déclenche aussi en survolant un enfant : on ne réagit qu'en sortant du bloc
  if (!root.value?.contains(e.relatedTarget as Node | null)) dragging.value = false;
}

async function startDemo() {
  error.value = "";
  await engine.startDemo();
}

async function startMic() {
  error.value = "";
  await engine.startMic();
}

const toggle = () => engine.toggle();

function onSeek(e: Event) {
  engine.seek(Number((e.target as HTMLInputElement).value));
  currentTime.value = engine.audio.currentTime;
}

function onVolume(e: Event) {
  volume.value = Number((e.target as HTMLInputElement).value);
  engine.setVolume(volume.value);
}

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await root.value?.requestFullscreen?.().catch(() => {});
}

function onFullscreenChange() {
  fullscreen.value = document.fullscreenElement === root.value;
  resize();
}

/** Espace : lecture/pause. Flèches : ±5 s. 1, 2, 3 : modes. F : plein écran. */
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  // On laisse les curseurs et les boutons gérer leurs propres touches
  if (target.matches("input[type=range]") && e.key.startsWith("Arrow")) return;
  if (target.matches("button, input") && (e.key === " " || e.key === "Enter")) return;

  if (e.key === " " && kind.value !== "none") {
    e.preventDefault();
    void toggle();
  } else if (e.key === "ArrowRight" && canSeek.value) {
    engine.seek(engine.audio.currentTime + 5);
  } else if (e.key === "ArrowLeft" && canSeek.value) {
    engine.seek(engine.audio.currentTime - 5);
  } else if (["1", "2", "3"].includes(e.key)) {
    mode.value = MODES[Number(e.key) - 1].id;
  } else if (e.key.toLowerCase() === "f") {
    void toggleFullscreen();
  }
}

/* ---------- Boucle d'animation ---------- */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = createScene(BAND_COUNT, reducedMotion);
const freq = new Uint8Array(new ArrayBuffer(FFT_SIZE / 2));
const wave = new Uint8Array(new ArrayBuffer(FFT_SIZE));
const frame: AudioFrame = {
  bands: new Float32Array(BAND_COUNT),
  wave,
  bass: 0,
  level: 0,
  pulse: 0,
  time: 0,
};
const detectBeat = createBeatDetector();
let edges = bandEdges(BAND_COUNT, engine.sampleRate, FFT_SIZE);
let edgesRate = engine.sampleRate;

let ctx2d: CanvasRenderingContext2D | null = null;
let cssW = 0;
let cssH = 0;
let raf = 0;
let last = 0;
let visible = true;
let resizeObserver: ResizeObserver | undefined;
let intersection: IntersectionObserver | undefined;

function resize() {
  const el = canvas.value;
  if (!el) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = el.clientWidth;
  cssH = el.clientHeight;
  el.width = Math.round(cssW * dpr);
  el.height = Math.round(cssH * dpr);
  // On dessine en pixels CSS, le contexte s'occupe de la densité de l'écran
  ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
  scene.lastMode = null;
}

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  if (!visible || !ctx2d || !cssW) return;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
  last = now;

  if (engine.sampleRate !== edgesRate) {
    edgesRate = engine.sampleRate;
    edges = bandEdges(BAND_COUNT, edgesRate, FFT_SIZE);
  }

  if (engine.read(freq, wave)) {
    toBands(freq, edges, frame.bands);
    frame.bass = rangeLevel(freq, edgesRate, FFT_SIZE, 30, 140);
    frame.level = waveRms(wave);
    if (detectBeat(frame.bass, now)) frame.pulse = 1;
  } else {
    // Rien de lancé : une respiration lente pour que la scène ne soit pas morte
    const breath = (Math.sin(now / 900) + 1) / 2;
    frame.bands.fill(0.04 + breath * 0.04);
    wave.fill(128);
    frame.bass = breath * 0.1;
  }
  frame.pulse = Math.max(0, frame.pulse - dt * 4);
  frame.time = now / 1000;

  draw(ctx2d, cssW, cssH, mode.value, frame, scene, dt);

  if (kind.value === "file") currentTime.value = engine.audio.currentTime;
}

onMounted(() => {
  ctx2d = canvas.value!.getContext("2d", { alpha: false });
  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.value!);
  // Hors écran, on ne dessine rien : pas de calcul inutile pendant qu'on lit le reste de la page
  intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  intersection.observe(canvas.value!);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  intersection?.disconnect();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  engine.dispose();
});
</script>

<template>
  <div
    ref="root"
    class="viz"
    tabindex="-1"
    :class="{ 'is-dragging': dragging, 'is-fullscreen': fullscreen }"
    @keydown="onKeydown"
    @dragenter.prevent="dragging = true"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="stage" @pointerdown="root?.focus({ preventScroll: true })">
      <canvas ref="canvas" class="canvas" aria-hidden="true" />

      <div v-if="kind === 'none'" class="empty">
        <p class="empty__title">Glisse un morceau ici</p>
        <p class="empty__text">MP3, WAV, M4A, FLAC… Le fichier reste dans ton navigateur, rien n'est envoyé.</p>
        <div class="empty__actions">
          <button class="btn btn--primary" @click="fileInput?.click()">Choisir un fichier</button>
          <button class="btn btn--light" @click="startDemo">Boucle de démo</button>
          <button class="btn btn--light" @click="startMic">Micro</button>
        </div>
      </div>
      <p v-else class="now" aria-live="polite">{{ title }}</p>

      <p v-if="dragging" class="drop">Lâche pour écouter</p>
      <button class="fs" :aria-pressed="fullscreen" @click="toggleFullscreen">
        {{ fullscreen ? "Quitter le plein écran" : "Plein écran" }}
      </button>
    </div>

    <div class="controls">
      <button class="play" :disabled="kind === 'none'" :aria-label="playLabel" @click="toggle">
        <svg v-if="playing && kind !== 'mic'" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
        <svg v-else-if="kind === 'mic'" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </button>

      <div class="seek">
        <span class="time">{{ canSeek ? formatTime(currentTime) : "--:--" }}</span>
        <input
          type="range"
          min="0"
          :max="duration || 1"
          step="0.1"
          :value="currentTime"
          :disabled="!canSeek"
          aria-label="Position dans le morceau"
          :aria-valuetext="`${formatTime(currentTime)} sur ${formatTime(duration)}`"
          @input="onSeek"
        />
        <span class="time">{{ canSeek ? formatTime(duration) : "--:--" }}</span>
      </div>

      <label class="volume">
        <span class="visually-hidden">Volume</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /></svg>
        <input type="range" min="0" max="1" step="0.01" :value="volume" @input="onVolume" />
      </label>

      <div class="modes" role="radiogroup" aria-label="Style d'animation">
        <button
          v-for="(m, i) in MODES"
          :key="m.id"
          role="radio"
          :aria-checked="mode === m.id"
          :title="`Touche ${i + 1}`"
          @click="mode = m.id"
        >
          {{ m.label }}
        </button>
      </div>

      <div v-if="kind !== 'none'" class="sources">
        <button class="link" @click="fileInput?.click()">Autre fichier</button>
        <button v-if="kind !== 'demo'" class="link" @click="startDemo">Démo</button>
        <button v-if="kind !== 'mic'" class="link" @click="startMic">Micro</button>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="keys">Raccourcis : Espace lecture/pause, ← → avancer ou reculer de 5 s, 1 2 3 changer de style, F plein écran.</p>

    <input ref="fileInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.opus" hidden @change="onFilePicked" />
  </div>
</template>

<style scoped>
.viz {
  --stage-bg: #0a2540;
  display: flex;
  flex-direction: column;
  border: 2px solid var(--ink);
  border-radius: 6px;
  overflow: hidden;
  background: var(--paper);
}
.viz:focus {
  outline: none; /* focus posé au clic sur la scène, pour les raccourcis clavier */
}
.stage {
  position: relative;
  aspect-ratio: 16 / 9;
  max-height: 72vh;
  background: var(--stage-bg);
}
.canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.is-dragging .stage {
  outline: 4px dashed var(--teal);
  outline-offset: -12px;
}

.empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 4px;
  padding: 24px;
  text-align: center;
  color: #ffffff;
  pointer-events: none;
}
.empty__title {
  margin: 0;
  font-size: clamp(28px, 5vw, 52px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
}
.empty__text {
  margin: 0 0 16px;
  max-width: 44ch;
  color: #c9d6e2;
  font-size: 15px;
}
.empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  pointer-events: auto;
}
.btn--light {
  border-color: #ffffff;
  color: #ffffff;
}
.btn--light:hover {
  background: #ffffff;
  color: var(--ink);
}

.now {
  position: absolute;
  left: 16px;
  bottom: 12px;
  right: 180px;
  margin: 0;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}
.drop {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  background: rgba(10, 37, 64, 0.75);
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  pointer-events: none;
}
.fs {
  position: absolute;
  right: 12px;
  bottom: 10px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  background: rgba(10, 37, 64, 0.6);
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.fs:hover {
  background: #ffffff;
  color: var(--ink);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding: 14px 16px;
  border-top: 2px solid var(--ink);
}
.play {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: var(--blue);
  color: #ffffff;
  cursor: pointer;
}
.play:hover:not(:disabled) {
  background: var(--blue-deep);
}
.play:disabled {
  background: var(--gray);
  color: var(--muted);
  cursor: not-allowed;
}
.play svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}
.seek {
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.seek input {
  flex: 1;
}
.time {
  min-width: 3.2em;
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  color: var(--muted);
  text-align: center;
}
.volume {
  display: flex;
  align-items: center;
  gap: 6px;
}
.volume svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.volume input {
  width: 96px;
}
input[type="range"] {
  accent-color: var(--blue);
}
.modes {
  display: flex;
  border: 2px solid var(--ink);
  border-radius: 4px;
  overflow: hidden;
}
.modes button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.modes button + button {
  border-left: 2px solid var(--ink);
}
.modes button[aria-checked="true"] {
  background: var(--ink);
  color: #ffffff;
}
.sources {
  display: flex;
  gap: 14px;
}
.link {
  padding: 0;
  border: none;
  background: none;
  color: var(--blue-deep);
  font: inherit;
  font-size: 15px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.link:hover {
  color: var(--ink);
}
.error {
  margin: 0;
  padding: 10px 16px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
}
.keys {
  margin: 0;
  padding: 0 16px 12px;
  color: var(--muted);
  font-size: 14px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Plein écran : la scène prend toute la hauteur, les contrôles restent en bas */
.viz.is-fullscreen {
  border: none;
  border-radius: 0;
  height: 100vh;
}
.is-fullscreen .stage {
  flex: 1;
  aspect-ratio: auto;
  max-height: none;
}
.is-fullscreen .keys {
  display: none;
}

@media (max-width: 600px) {
  .stage {
    aspect-ratio: 4 / 5;
  }
  .now {
    right: 16px;
    bottom: 52px;
  }
  .volume {
    display: none; /* sur mobile, le volume se règle avec les boutons du téléphone */
  }
}
</style>
