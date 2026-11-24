/**
 * Le graphe Web Audio du visualiseur. Trois sources possibles, un seul analyseur :
 *
 *   <audio> (fichier) ─┐
 *   boucle de démo ────┴─▶ input ─┬─▶ AnalyserNode            (lu à chaque image)
 *                                 └─▶ volume ─▶ haut-parleurs
 *   micro ─────────────────────────▶ AnalyserNode            (jamais vers les haut-parleurs : pas de larsen)
 *
 * L'analyseur est branché avant le volume : baisser le son ne change pas l'animation.
 */
import { DemoLoop } from "./demoLoop";

export type SourceKind = "none" | "file" | "demo" | "mic";

export interface EngineEvents {
  onState(): void;
  onError(message: string): void;
}

export const FFT_SIZE = 2048;

export class AudioEngine {
  readonly audio: HTMLAudioElement;
  kind: SourceKind = "none";
  title = "";

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private input: GainNode | null = null;
  private volumeNode: GainNode | null = null;
  private demo: DemoLoop | null = null;
  private mic: { stream: MediaStream; node: MediaStreamAudioSourceNode } | null = null;
  private objectUrl = "";
  private volume = 0.8;
  private events: EngineEvents;

  constructor(events: EngineEvents) {
    this.events = events;
    this.audio = new Audio();
    this.audio.preload = "metadata";
    for (const e of ["play", "pause", "ended", "loadedmetadata", "durationchange"]) {
      this.audio.addEventListener(e, () => events.onState());
    }
    this.audio.addEventListener("error", () => {
      if (this.kind === "file") events.onError("Ton navigateur ne sait pas lire ce fichier. Essaie un MP3, un WAV ou un M4A.");
    });
  }

  get sampleRate() {
    return this.ctx?.sampleRate ?? 48000;
  }

  get playing(): boolean {
    if (this.kind === "file") return !this.audio.paused;
    if (this.kind === "demo") return !!this.demo?.running;
    return this.kind === "mic";
  }

  /** Le contexte audio doit naître (ou reprendre) pendant un clic : règle d'autoplay des navigateurs. */
  private async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.78;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -22;

      const input = ctx.createGain();
      const volume = ctx.createGain();
      volume.gain.value = this.volume;
      input.connect(analyser);
      input.connect(volume).connect(ctx.destination);
      // createMediaElementSource ne peut être appelé qu'une fois par élément : on garde le même <audio>
      ctx.createMediaElementSource(this.audio).connect(input);

      this.ctx = ctx;
      this.analyser = analyser;
      this.input = input;
      this.volumeNode = volume;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  /** Coupe la source en cours avant d'en lancer une autre. */
  private stopCurrent() {
    this.audio.pause();
    this.demo?.stop();
    if (this.mic) {
      this.mic.node.disconnect();
      for (const track of this.mic.stream.getTracks()) track.stop();
      this.mic = null;
    }
  }

  async loadFile(file: File) {
    const looksLikeAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(file.name);
    if (!looksLikeAudio) {
      this.events.onError("Ce fichier ne ressemble pas à un fichier audio.");
      return;
    }
    await this.ensureContext();
    this.stopCurrent();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    // Le fichier reste dans le navigateur : on le lit via une URL locale, rien n'est envoyé
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.kind = "file";
    this.title = file.name;
    this.events.onState();
    try {
      await this.audio.play();
    } catch {
      // L'erreur de format arrive par l'événement "error"
    }
  }

  async startDemo() {
    const ctx = await this.ensureContext();
    this.stopCurrent();
    this.demo ??= new DemoLoop(ctx, this.input!);
    this.demo.start();
    this.kind = "demo";
    this.title = "Boucle de démo, 88 BPM";
    this.events.onState();
  }

  async startMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.events.onError("Ton navigateur ne donne pas accès au micro sur cette page.");
      return;
    }
    const ctx = await this.ensureContext();
    let stream: MediaStream;
    try {
      // Pas de traitement vocal : on veut la musique telle quelle
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      this.events.onError("Accès au micro refusé. Tu peux l'autoriser dans les réglages du navigateur.");
      return;
    }
    this.stopCurrent();
    const node = ctx.createMediaStreamSource(stream);
    node.connect(this.analyser!);
    this.mic = { stream, node };
    this.kind = "mic";
    this.title = "Micro : fais jouer de la musique près de ton ordinateur";
    this.events.onState();
  }

  async toggle() {
    if (this.kind === "file") {
      await this.ensureContext();
      if (this.audio.paused) await this.audio.play().catch(() => {});
      else this.audio.pause();
    } else if (this.kind === "demo" && this.demo) {
      await this.ensureContext();
      if (this.demo.running) this.demo.stop();
      else this.demo.start();
    } else if (this.kind === "mic") {
      this.stopCurrent();
      this.kind = "none";
      this.title = "";
    }
    this.events.onState();
  }

  seek(seconds: number) {
    if (this.kind !== "file" || !Number.isFinite(this.audio.duration)) return;
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, seconds));
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.volumeNode && this.ctx) this.volumeNode.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
  }

  /** Remplit les tableaux avec l'image audio courante. Renvoie false tant que rien n'a été lancé. */
  read(freq: Uint8Array<ArrayBuffer>, wave: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(freq);
    this.analyser.getByteTimeDomainData(wave);
    return true;
  }

  dispose() {
    this.stopCurrent();
    this.demo?.dispose();
    this.audio.removeAttribute("src");
    this.audio.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    void this.ctx?.close();
    this.ctx = null;
  }
}
