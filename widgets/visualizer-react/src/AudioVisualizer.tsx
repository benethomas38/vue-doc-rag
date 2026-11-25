import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { AudioEngine, FFT_SIZE, type SourceKind } from "../../../shared/visualizer/engine";
import {
  bandEdges,
  createBeatDetector,
  formatTime,
  rangeLevel,
  toBands,
  trackTitle,
  waveRms,
} from "../../../shared/visualizer/analysis";
import { MODES, createScene, draw, type AudioFrame, type Mode } from "../../../shared/visualizer/renderers";
import s from "./AudioVisualizer.module.css";

const BAND_COUNT = 72;

/** L'état de l'interface, recopié depuis le moteur audio à chaque changement. */
interface EngineState {
  kind: SourceKind;
  title: string;
  playing: boolean;
  duration: number;
}

const IDLE: EngineState = { kind: "none", title: "", playing: false, duration: 0 };

function readState(engine: AudioEngine): EngineState {
  return {
    kind: engine.kind,
    title: engine.kind === "file" ? trackTitle(engine.title) : engine.title,
    playing: engine.playing,
    duration: Number.isFinite(engine.audio.duration) ? engine.audio.duration : 0,
  };
}

/**
 * Le visualiseur audio, en React. Le moteur (Web Audio, analyse, rendu Canvas) est le même
 * code TypeScript que la version Vue d'origine : seul le composant change.
 */
export function AudioVisualizer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);

  const [state, setState] = useState<EngineState>(IDLE);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [mode, setMode] = useState<Mode>("anneau");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // La boucle d'animation lit ces valeurs sans être recréée à chaque rendu
  const modeRef = useRef(mode);
  const kindRef = useRef(state.kind);
  useEffect(() => {
    modeRef.current = mode;
    kindRef.current = state.kind;
  }, [mode, state.kind]);

  const { kind, title, playing, duration } = state;
  const canSeek = kind === "file" && duration > 0;
  const playLabel = kind === "mic" ? "Couper le micro" : playing ? "Pause" : "Lecture";

  /* ---------- Moteur audio + boucle d'animation ---------- */

  useEffect(() => {
    const canvas = canvasRef.current!;
    const root = rootRef.current!;
    const sync = () => setState(readState(engine));
    const engine = new AudioEngine({
      onState: sync,
      onError: (message) => {
        setError(message);
        sync();
      },
    });
    engineRef.current = engine;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = createScene(BAND_COUNT, reducedMotion);
    const freq = new Uint8Array(new ArrayBuffer(FFT_SIZE / 2));
    const wave = new Uint8Array(new ArrayBuffer(FFT_SIZE));
    const frame: AudioFrame = { bands: new Float32Array(BAND_COUNT), wave, bass: 0, level: 0, pulse: 0, time: 0 };
    const detectBeat = createBeatDetector();
    let edgesRate = engine.sampleRate;
    let edges = bandEdges(BAND_COUNT, edgesRate, FFT_SIZE);

    const ctx2d = canvas.getContext("2d", { alpha: false });
    let cssW = 0;
    let cssH = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let lastShownTime = -1;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
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

      draw(ctx2d, cssW, cssH, modeRef.current, frame, scene, dt);

      // La position du morceau : un rendu React par dixième de seconde suffit, pas 60 par seconde
      if (kindRef.current === "file") {
        const t = Math.round(engine.audio.currentTime * 10) / 10;
        if (t !== lastShownTime) {
          lastShownTime = t;
          setCurrentTime(engine.audio.currentTime);
        }
      }
    }

    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === root);
      resize();
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    // Hors écran, on ne dessine rien : pas de calcul inutile pendant qu'on lit le reste de la page
    const intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    intersection.observe(canvas);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  /* ---------- Sources ---------- */

  const openFile = useCallback(async (file: File | undefined) => {
    if (!file || !engineRef.current) return;
    setError("");
    await engineRef.current.loadFile(file);
  }, []);

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    void openFile(e.target.files?.[0]);
    e.target.value = ""; // permet de rouvrir le même fichier
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void openFile(e.dataTransfer.files?.[0]);
  }

  function onDragLeave(e: DragEvent) {
    // dragleave se déclenche aussi en survolant un enfant : on ne réagit qu'en sortant du bloc
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setDragging(false);
  }

  async function startDemo() {
    setError("");
    await engineRef.current?.startDemo();
  }

  async function startMic() {
    setError("");
    await engineRef.current?.startMic();
  }

  const toggle = () => void engineRef.current?.toggle();
  const pickFile = () => fileRef.current?.click();

  function seek(seconds: number) {
    const engine = engineRef.current;
    if (!engine) return;
    engine.seek(seconds);
    setCurrentTime(engine.audio.currentTime);
  }

  function onVolume(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    engineRef.current?.setVolume(value);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current?.requestFullscreen?.().catch(() => {});
  }

  /** Espace : lecture/pause. Flèches : ±5 s. 1, 2, 3 : modes. F : plein écran. */
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    // On laisse les curseurs et les boutons gérer leurs propres touches
    if (target.matches("input[type=range]") && e.key.startsWith("Arrow")) return;
    if (target.matches("button, input") && (e.key === " " || e.key === "Enter")) return;
    const engine = engineRef.current;

    if (e.key === " " && kind !== "none") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight" && canSeek && engine) {
      seek(engine.audio.currentTime + 5);
    } else if (e.key === "ArrowLeft" && canSeek && engine) {
      seek(engine.audio.currentTime - 5);
    } else if (["1", "2", "3"].includes(e.key)) {
      setMode(MODES[Number(e.key) - 1].id);
    } else if (e.key.toLowerCase() === "f") {
      void toggleFullscreen();
    }
  }

  const rootClass = [s.viz, dragging && s.isDragging, fullscreen && s.isFullscreen].filter(Boolean).join(" ");

  return (
    <div
      ref={rootRef}
      className={rootClass}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={s.stage} onPointerDown={() => rootRef.current?.focus({ preventScroll: true })}>
        <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />

        {kind === "none" ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>Glisse un morceau ici</p>
            <p className={s.emptyText}>MP3, WAV, M4A, FLAC… Le fichier reste dans ton navigateur, rien n'est envoyé.</p>
            <div className={s.emptyActions}>
              <button className="btn btn--primary" onClick={pickFile}>
                Choisir un fichier
              </button>
              <button className={`btn ${s.btnLight}`} onClick={startDemo}>
                Boucle de démo
              </button>
              <button className={`btn ${s.btnLight}`} onClick={startMic}>
                Micro
              </button>
            </div>
          </div>
        ) : (
          <p className={s.now} aria-live="polite">
            {title}
          </p>
        )}

        {dragging && <p className={s.drop}>Lâche pour écouter</p>}
        <button className={s.fs} aria-pressed={fullscreen} onClick={toggleFullscreen}>
          {fullscreen ? "Quitter le plein écran" : "Plein écran"}
        </button>
      </div>

      <div className={s.controls}>
        <button className={s.play} disabled={kind === "none"} aria-label={playLabel} onClick={toggle}>
          <PlayIcon kind={kind} playing={playing} />
        </button>

        <div className={s.seek}>
          <span className={s.time}>{canSeek ? formatTime(currentTime) : "--:--"}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            disabled={!canSeek}
            aria-label="Position dans le morceau"
            aria-valuetext={`${formatTime(currentTime)} sur ${formatTime(duration)}`}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <span className={s.time}>{canSeek ? formatTime(duration) : "--:--"}</span>
        </div>

        <label className={s.volume}>
          <span className={s.visuallyHidden}>Volume</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
          </svg>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={onVolume} />
        </label>

        <div className={s.modes} role="radiogroup" aria-label="Style d'animation">
          {MODES.map((m, i) => (
            <button key={m.id} role="radio" aria-checked={mode === m.id} title={`Touche ${i + 1}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {kind !== "none" && (
          <div className={s.sources}>
            <button className={s.link} onClick={pickFile}>
              Autre fichier
            </button>
            {kind !== "demo" && (
              <button className={s.link} onClick={startDemo}>
                Démo
              </button>
            )}
            {kind !== "mic" && (
              <button className={s.link} onClick={startMic}>
                Micro
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <p className={s.keys}>Raccourcis : Espace lecture/pause, ← → avancer ou reculer de 5 s, 1 2 3 changer de style, F plein écran.</p>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.opus"
        hidden
        onChange={onFilePicked}
      />
    </div>
  );
}

function PlayIcon({ kind, playing }: { kind: SourceKind; playing: boolean }) {
  if (kind === "mic") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h12v12H6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z"} />
    </svg>
  );
}
