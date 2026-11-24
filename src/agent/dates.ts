/**
 * Dates en langage naturel → date précise. Volontairement déterministe :
 * un LLM se trompe facilement sur « samedi prochain » ou sur le jour de la semaine
 * d'une date, alors on lui donne un outil qui calcule à sa place.
 *
 * Toutes les dates sont des chaînes "AAAA-MM-JJ" au fuseau de Grenoble (Europe/Paris).
 */

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];
const NUMBERS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, dix: 10, quinze: 15 };

/** Date du jour à Grenoble, quel que soit le fuseau du serveur. */
export function todayInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

/** Ajoute des jours à une date "AAAA-MM-JJ" (calcul en UTC : pas de piège d'heure d'été). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "2026-11-28" → "samedi 28 novembre 2026" */
export function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m - 1];
  return `${WEEKDAYS[weekday(iso)]} ${d === 1 ? "1er" : d} ${month} ${y}`;
}

export function isValidIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export type ResolvedDate =
  | { ok: true; date: string; jour: string; ambigu?: string; alternative?: string }
  | { ok: false; erreur: string };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function result(date: string, extra: { ambigu?: string; alternative?: string } = {}): ResolvedDate {
  return { ok: true, date, jour: formatLong(date), ...extra };
}

/** Prochain jour de la semaine donné, à partir de demain (jamais aujourd'hui). */
function nextWeekday(today: string, target: number): string {
  const diff = ((target - weekday(today) + 7) % 7) || 7;
  return addDays(today, diff);
}

function toNumber(word: string): number | null {
  if (/^\d+$/.test(word)) return Number(word);
  return NUMBERS[word] ?? null;
}

/** Construit une date à partir de jour/mois/année ; sans année, prend la prochaine occurrence. */
function fromParts(today: string, day: number, month: number, year?: number): ResolvedDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  let y = year ?? Number(today.slice(0, 4));
  if (y < 100) y += 2000;
  let iso = `${y}-${pad(month)}-${pad(day)}`;
  if (!isValidIso(iso)) return { ok: false, erreur: `Le ${day}/${month} n'existe pas.` };
  if (year === undefined && iso < today) {
    iso = `${y + 1}-${pad(month)}-${pad(day)}`;
    if (!isValidIso(iso)) return { ok: false, erreur: `Le ${day}/${month} n'existe pas.` };
  }
  return result(iso);
}

export function resolveDate(expression: string, today: string): ResolvedDate {
  const text = normalize(expression);
  if (!text) return { ok: false, erreur: "Expression vide." };

  // Formats explicites d'abord
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return isValidIso(iso[0]) ? result(iso[0]) : { ok: false, erreur: `${iso[0]} n'est pas une date valide.` };
  }
  const numeric = text.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (numeric) {
    return fromParts(today, Number(numeric[1]), Number(numeric[2]), numeric[3] ? Number(numeric[3]) : undefined);
  }
  const named = text.match(/\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?\b/);
  if (named) {
    return fromParts(today, Number(named[1]), MONTHS.indexOf(named[2]) + 1, named[3] ? Number(named[3]) : undefined);
  }

  // Expressions relatives
  if (/\bapres[- ]demain\b/.test(text)) return result(addDays(today, 2));
  if (/\bdemain\b/.test(text)) return result(addDays(today, 1));
  if (/\b(aujourd hui|ce soir|cet apres[- ]midi|ce matin)\b/.test(text)) return result(today);

  const inDays = text.match(/\bdans\s+(\w+)\s+(jours?|semaines?)\b/);
  if (inDays) {
    const n = toNumber(inDays[1]);
    if (n === null) return { ok: false, erreur: `Je ne comprends pas « ${inDays[1]} ».` };
    return result(addDays(today, inDays[2].startsWith("semaine") ? n * 7 : n));
  }
  if (/\bdans (une|1) semaine\b|\bla semaine prochaine\b/.test(text) && !WEEKDAYS.some((d) => text.includes(d))) {
    return result(addDays(today, 7), { ambigu: "« la semaine prochaine » ne dit pas quel jour : j'ai pris dans 7 jours." });
  }

  if (/\b(ce )?week[- ]?end\b/.test(text)) {
    const saturday = nextWeekday(today, 6);
    const prochain = /\bprochain\b/.test(text);
    const sat = prochain && weekday(today) >= 1 && weekday(today) <= 5 ? addDays(saturday, 7) : saturday;
    return result(sat, { ambigu: "Un week-end, c'est deux jours : j'ai pris le samedi.", alternative: addDays(sat, 1) });
  }

  const day = WEEKDAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(text));
  if (day !== -1) {
    const next = nextWeekday(today, day);
    if (/\ben huit\b/.test(text)) return result(addDays(next, 7));
    if (/\bprochain\b/.test(text)) {
      // « samedi prochain » dit un mardi : le samedi qui vient, ou celui d'après ? Les deux s'entendent.
      return result(next, {
        ambigu: `« ${WEEKDAYS[day]} prochain » peut désigner le ${formatLong(next)} ou le suivant : j'ai pris le plus proche.`,
        alternative: addDays(next, 7),
      });
    }
    return result(next);
  }

  return {
    ok: false,
    erreur: "Expression non reconnue. Essaie « samedi », « demain », « le 12 décembre » ou une date AAAA-MM-JJ.",
  };
}
