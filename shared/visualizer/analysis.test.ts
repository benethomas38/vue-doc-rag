import { describe, it, expect } from "vitest";
import {
  bandEdges,
  createBeatDetector,
  formatTime,
  rangeLevel,
  toBands,
  trackTitle,
  waveRms,
} from "./analysis";

describe("bandEdges", () => {
  it("donne des bornes strictement croissantes, même dans les basses", () => {
    const edges = bandEdges(64, 48000, 2048);
    expect(edges).toHaveLength(65);
    for (let i = 1; i < edges.length; i++) expect(edges[i]).toBeGreaterThan(edges[i - 1]);
  });

  it("ne dépasse jamais le nombre de cases de la FFT", () => {
    const edges = bandEdges(96, 44100, 2048, 32, 30000);
    expect(edges[edges.length - 1]).toBeLessThanOrEqual(1024 + 96);
    expect(edges[0]).toBe(Math.round(32 / (44100 / 2048)));
  });
});

describe("toBands", () => {
  it("moyenne chaque bande entre 0 et 1", () => {
    const freq = new Uint8Array(8).fill(255);
    const out = toBands(freq, Uint16Array.from([0, 2, 4, 8]), new Float32Array(3), 0);
    expect(Array.from(out)).toEqual([1, 1, 1]);
  });

  it("relève les aigus avec tilt sans dépasser 1", () => {
    const freq = new Uint8Array(8).fill(102); // 0.4
    const out = toBands(freq, Uint16Array.from([0, 4, 8]), new Float32Array(2), 1);
    expect(out[0]).toBeCloseTo(0.4);
    expect(out[1]).toBeCloseTo(0.6);
  });
});

describe("rangeLevel et waveRms", () => {
  it("mesure seulement la plage demandée", () => {
    const freq = new Uint8Array(1024);
    freq.fill(255, 0, 4); // 0 à ~94 Hz à 48 kHz / 2048
    expect(rangeLevel(freq, 48000, 2048, 0, 90)).toBe(1);
    expect(rangeLevel(freq, 48000, 2048, 2000, 4000)).toBe(0);
  });

  it("vaut 0 pour un silence", () => {
    expect(waveRms(new Uint8Array(256).fill(128))).toBe(0);
  });
});

describe("createBeatDetector", () => {
  it("repère un pic après une période calme, puis respecte le délai minimal", () => {
    const detect = createBeatDetector({ history: 30, cooldownMs: 200 });
    let t = 0;
    for (let i = 0; i < 30; i++) expect(detect(0.25, (t += 16))).toBe(false);
    expect(detect(0.8, (t += 16))).toBe(true);
    expect(detect(0.9, (t += 16))).toBe(false); // trop tôt
    for (let i = 0; i < 15; i++) detect(0.25, (t += 16));
    expect(detect(0.9, (t += 16))).toBe(true);
  });

  it("ne redéclenche pas sur la queue d'un kick qui décroît", () => {
    const detect = createBeatDetector({ history: 30, cooldownMs: 100 });
    let t = 0;
    for (let i = 0; i < 30; i++) detect(0.2, (t += 16));
    expect(detect(0.9, (t += 16))).toBe(true);
    const tail = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4].map((e) => detect(e, (t += 16)));
    expect(tail.every((b) => !b)).toBe(true);
  });

  it("ignore le silence", () => {
    const detect = createBeatDetector();
    let t = 0;
    for (let i = 0; i < 20; i++) detect(0, (t += 16));
    expect(detect(0.1, (t += 16))).toBe(false);
  });
});

describe("formatTime et trackTitle", () => {
  it("formate les durées", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(83.9)).toBe("1:23");
    expect(formatTime(NaN)).toBe("0:00");
  });

  it("nettoie le nom de fichier", () => {
    expect(trackTitle("02 - Mon_morceau (master).mp3")).toBe("02 - Mon morceau (master)");
    expect(trackTitle(".flac")).toBe("Sans titre");
  });
});
