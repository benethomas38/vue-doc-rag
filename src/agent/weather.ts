/**
 * Météo à Grenoble via Open-Meteo : gratuit, sans clé, prévisions jusqu'à 16 jours.
 * Un vrai appel à un service extérieur, avec délai maximal et cache pour rester sobre.
 */
import { daysBetween } from "./dates.ts";

const GRENOBLE = { latitude: 45.188, longitude: 5.724 };
const TIMEOUT_MS = 4000;
const CACHE_MS = 30 * 60 * 1000;

// Codes météo WMO utilisés par Open-Meteo
const CODES: [number[], string][] = [
  [[0], "ciel dégagé"],
  [[1, 2], "quelques nuages"],
  [[3], "couvert"],
  [[45, 48], "brouillard"],
  [[51, 53, 55, 56, 57], "bruine"],
  [[61, 63, 80, 81], "pluie"],
  [[65, 82], "forte pluie"],
  [[66, 67], "pluie verglaçante"],
  [[71, 73, 75, 77, 85, 86], "neige"],
  [[95, 96, 99], "orage"],
];

export function describeCode(code: number): string {
  return CODES.find(([codes]) => codes.includes(code))?.[1] ?? "inconnu";
}

export type Forecast =
  | {
      ok: true;
      date: string;
      ciel: string;
      tempMin: number;
      tempMax: number;
      risquePluie: number; // %
      ventMax: number;     // km/h
      coucherSoleil?: string; // HH:MM
      conseil: string;
    }
  | { ok: false; erreur: string };

/** Conseil pour une séance en extérieur : c'est ce qui aide l'agent à proposer un plan B. */
export function outdoorAdvice(f: { ciel: string; tempMax: number; risquePluie: number; ventMax: number }): string {
  if (/orage|neige|verglaçante|forte pluie/.test(f.ciel)) return "Déconseillé en extérieur : prévoir la salle.";
  if (f.risquePluie >= 60) return "Pluie probable : surfaces glissantes, prévoir un repli en salle.";
  if (f.tempMax <= 3) return "Très froid : échauffement long et repli en salle conseillé.";
  if (f.ventMax >= 50) return "Vent fort : éviter les hauteurs.";
  if (f.risquePluie >= 30) return "Risque d'averse : mentionner un plan B.";
  if (f.tempMax >= 30) return "Forte chaleur : prévoir de l'eau et éviter le milieu de journée.";
  return "Conditions correctes pour l'extérieur.";
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function createWeather(fetchImpl: FetchLike = fetch, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; value: Forecast }>();

  return async function forecast(date: string, today: string): Promise<Forecast> {
    const ahead = daysBetween(today, date);
    if (ahead < 0) return { ok: false, erreur: "Cette date est passée." };
    if (ahead > 15) return { ok: false, erreur: "Prévision indisponible : Open-Meteo ne voit pas au-delà de 16 jours." };

    const hit = cache.get(date);
    if (hit && now() - hit.at < CACHE_MS) return hit.value;

    const params = new URLSearchParams({
      latitude: String(GRENOBLE.latitude),
      longitude: String(GRENOBLE.longitude),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunset",
      timezone: "Europe/Paris",
      start_date: date,
      end_date: date,
    });

    try {
      const res = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return { ok: false, erreur: `Service météo indisponible (${res.status}).` };
      const body = (await res.json()) as { daily?: Record<string, (number | null)[]> & { sunset?: string[] } };
      const d = body.daily;
      if (!d || d.weather_code?.[0] == null) return { ok: false, erreur: "Réponse météo incomplète." };

      const base = {
        ciel: describeCode(d.weather_code[0]!),
        tempMin: Math.round(d.temperature_2m_min?.[0] ?? NaN),
        tempMax: Math.round(d.temperature_2m_max?.[0] ?? NaN),
        risquePluie: d.precipitation_probability_max?.[0] ?? 0,
        ventMax: Math.round(d.wind_speed_10m_max?.[0] ?? 0),
      };
      // "2026-11-28T16:47" → "16:47" : utile pour une séance qui finirait de nuit
      const sunset = d.sunset?.[0]?.slice(11, 16);
      const value: Forecast = { ok: true, date, ...base, ...(sunset ? { coucherSoleil: sunset } : {}), conseil: outdoorAdvice(base) };
      cache.set(date, { at: now(), value });
      return value;
    } catch {
      return { ok: false, erreur: "Le service météo n'a pas répondu à temps." };
    }
  };
}
