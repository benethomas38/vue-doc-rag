import { describe, it, expect } from "vitest";
import { createWeather, outdoorAdvice } from "./weather.ts";

const reply = (daily: Record<string, number[]>) => async () => ({ ok: true, status: 200, json: async () => ({ daily }) });

describe("météo", () => {
  it("traduit la réponse d'Open-Meteo et donne un conseil", async () => {
    const forecast = createWeather(
      reply({ weather_code: [61], temperature_2m_min: [1.6], temperature_2m_max: [7.4], precipitation_probability_max: [85], wind_speed_10m_max: [14.2], sunset: ["2026-11-28T16:47"] } as never),
    );
    expect(await forecast("2026-11-28", "2026-11-24")).toEqual({
      ok: true, date: "2026-11-28", ciel: "pluie", tempMin: 2, tempMax: 7, risquePluie: 85, ventMax: 14, coucherSoleil: "16:47",
      conseil: "Pluie probable : surfaces glissantes, prévoir un repli en salle.",
    });
  });

  it("ne demande rien au-delà de 16 jours ni dans le passé", async () => {
    let calls = 0;
    const forecast = createWeather(async () => {
      calls++;
      throw new Error("ne doit pas être appelé");
    });
    expect((await forecast("2027-01-30", "2026-11-24")).ok).toBe(false);
    expect((await forecast("2026-11-20", "2026-11-24")).ok).toBe(false);
    expect(calls).toBe(0);
  });

  it("encaisse une panne du service sans faire planter l'agent", async () => {
    const forecast = createWeather(async () => {
      throw new Error("timeout");
    });
    expect(await forecast("2026-11-28", "2026-11-24")).toEqual({ ok: false, erreur: "Le service météo n'a pas répondu à temps." });
  });

  it("conseille selon les conditions", () => {
    expect(outdoorAdvice({ ciel: "orage", tempMax: 20, risquePluie: 90, ventMax: 10 })).toMatch(/salle/);
    expect(outdoorAdvice({ ciel: "ciel dégagé", tempMax: 18, risquePluie: 0, ventMax: 10 })).toMatch(/correctes/);
  });
});
