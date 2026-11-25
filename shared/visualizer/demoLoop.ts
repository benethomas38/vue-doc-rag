/**
 * Une petite instru boom bap générée en direct avec la Web Audio API :
 * aucun fichier audio, que des oscillateurs et du bruit blanc.
 * Elle sert à tester le visualiseur sans avoir de morceau sous la main.
 *
 * Planification « lookahead » : un minuteur se réveille toutes les 25 ms et programme
 * sur l'horloge audio les notes des 120 prochaines ms. L'horloge audio est précise,
 * setInterval ne l'est pas : on combine les deux pour un tempo stable.
 */

const BPM = 88;
const STEPS = 16; // doubles croches par mesure
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

// La mineur : Am, F, C, G (une mesure chacun)
const BASS = [45, 41, 48, 43]; // notes MIDI des fondamentales
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const KICK = [0, 7, 10];
const SNARE = [4, 12];

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class DemoLoop {
  private ctx: AudioContext;
  private out: GainNode;
  private nodes: AudioNode[];
  private noise: AudioBuffer;
  private timer: number | undefined;
  private step = 0;
  private bar = 0;
  private nextTime = 0;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    // Un compresseur en sortie, comme sur un vrai master : le son est plus dense et plus fort
    const master = ctx.createDynamicsCompressor();
    master.threshold.value = -18;
    master.ratio.value = 4;
    master.attack.value = 0.002;
    master.release.value = 0.12;
    const makeup = ctx.createGain();
    makeup.gain.value = 1.25;
    this.out = ctx.createGain();
    this.out.gain.value = 0.6;
    this.out.connect(master).connect(makeup).connect(destination);
    this.nodes = [master, makeup];

    // 1 s de bruit blanc, réutilisé par la caisse claire et les charleys
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  get running() {
    return this.timer !== undefined;
  }

  start() {
    if (this.running) return;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.schedule();
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = undefined;
  }

  dispose() {
    this.stop();
    this.out.disconnect();
    for (const node of this.nodes) node.disconnect();
  }

  private schedule() {
    const stepDur = 60 / BPM / 4;
    while (this.nextTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      this.playStep(this.step, this.bar, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % STEPS;
      if (this.step === 0) this.bar = (this.bar + 1) % BASS.length;
    }
  }

  private playStep(step: number, bar: number, t: number, stepDur: number) {
    // Léger swing sur les contretemps, typique du boom bap
    const time = step % 2 === 1 ? t + stepDur * 0.12 : t;

    if (KICK.includes(step)) this.kick(time);
    if (SNARE.includes(step)) this.snare(time);
    if (step % 2 === 0) this.hat(time, step === 14 ? 0.22 : 0.045, step % 4 === 2 ? 0.16 : 0.09);
    if (KICK.includes(step)) this.bass(midiToHz(BASS[bar] - 12), time, stepDur * (step === 0 ? 6 : 3));
    if (step === 0 || step === 10) {
      for (const n of CHORDS[bar]) this.keys(midiToHz(n), time, stepDur * (step === 0 ? 9 : 5));
    }
  }

  private envelope(gain: GainNode, time: number, peak: number, decay: number, attack = 0.003) {
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  private kick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
    this.envelope(gain, time, 1, 0.4);
    osc.connect(gain).connect(this.out);
    osc.start(time);
    osc.stop(time + 0.45);
  }

  private snare(time: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    this.envelope(gain, time, 0.55, 0.2);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(time, Math.random() * 0.5);
    src.stop(time + 0.25);

    const body = this.ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(200, time);
    body.frequency.exponentialRampToValueAtTime(150, time + 0.08);
    const bodyGain = this.ctx.createGain();
    this.envelope(bodyGain, time, 0.3, 0.09);
    body.connect(bodyGain).connect(this.out);
    body.start(time);
    body.stop(time + 0.12);
  }

  private hat(time: number, decay: number, level: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;
    const gain = this.ctx.createGain();
    this.envelope(gain, time, level, decay, 0.001);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(time, Math.random() * 0.5);
    src.stop(time + decay + 0.02);
  }

  private bass(freq: number, time: number, length: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + length);
    const gain = this.ctx.createGain();
    this.envelope(gain, time, 0.32, length, 0.01);
    osc.connect(filter).connect(gain).connect(this.out);
    osc.start(time);
    osc.stop(time + length + 0.05);
  }

  private keys(freq: number, time: number, length: number) {
    // Un son de piano électrique simplifié : sinus + triangle une octave au-dessus
    const gain = this.ctx.createGain();
    this.envelope(gain, time, 0.07, length, 0.01);
    gain.connect(this.out);
    for (const [type, mult] of [["sine", 1], ["triangle", 2]] as const) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + length + 0.05);
    }
  }
}
