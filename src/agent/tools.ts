/**
 * Les outils que Claude peut appeler. Chacun = un nom, une description qui dit au modèle
 * QUAND s'en servir, un schéma JSON des paramètres, et une fonction exécutée côté serveur.
 *
 * Règle d'or : le modèle propose, le serveur vérifie. Chaque paramètre est revalidé ici,
 * car un LLM peut envoyer une date mal formée, un spot qui n'existe pas ou 5000 places.
 * Aucun outil ne publie : creer_brouillon et modifier_brouillon préparent une fiche, c'est un humain qui la publie.
 */
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { findSpots, spotById, SPOTS } from "./data.ts";
import { daysBetween, formatLong, isValidIso, resolveDate } from "./dates.ts";
import { overlaps, type EventDraft, type Store } from "./store.ts";
import type { Forecast } from "./weather.ts";

export interface ToolContext {
  sessionId: string;
  today: string;
  store: Store;
  forecast: (date: string, today: string) => Promise<Forecast>;
}

export const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "resoudre_date",
    description:
      "Transforme une date en langage naturel (« samedi », « demain », « le 12 décembre », « dans 2 semaines ») " +
      "en date précise AAAA-MM-JJ. Utilise-le systématiquement plutôt que de calculer toi-même. " +
      "Si le résultat contient « ambigu », signale-le à l'utilisateur.",
    input_schema: {
      type: "object",
      properties: { expression: { type: "string", description: "La date telle que l'utilisateur l'a écrite." } },
      required: ["expression"],
    },
  },
  {
    name: "verifier_agenda",
    description: "Liste les créneaux déjà prévus par l'association un jour donné, pour repérer les conflits.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "Date AAAA-MM-JJ." } },
      required: ["date"],
    },
  },
  {
    name: "chercher_spot",
    description:
      "Cherche un lieu d'entraînement connu de l'association à partir de son nom ou d'un mot-clé " +
      "(« Bastille », « parc Mistral », « en salle »). Sans résultat, renvoie la liste des spots disponibles.",
    input_schema: {
      type: "object",
      properties: { recherche: { type: "string" } },
      required: ["recherche"],
    },
  },
  {
    name: "meteo",
    description:
      "Prévisions météo à Grenoble pour une date (jusqu'à 16 jours), avec un conseil pour une séance en extérieur. " +
      "À appeler pour tout événement en extérieur.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "Date AAAA-MM-JJ." } },
      required: ["date"],
    },
  },
  {
    name: "creer_brouillon",
    description:
      "Crée la fiche brouillon de l'événement. Ne publie rien : l'utilisateur la relira et cliquera lui-même sur Publier. " +
      "À appeler en dernier, une fois la date résolue, l'agenda vérifié et le spot trouvé.",
    input_schema: {
      type: "object",
      properties: {
        titre: { type: "string", description: "Court et clair, 60 caractères max." },
        date: { type: "string", description: "AAAA-MM-JJ" },
        debut: { type: "string", description: "HH:MM" },
        fin: { type: "string", description: "HH:MM. Par défaut, 2 h après le début." },
        spot_id: { type: "string", description: "Identifiant renvoyé par chercher_spot." },
        places: { type: "integer", description: "Nombre de places. Par défaut 20.", minimum: 1, maximum: 300 },
        niveau: { type: "string", description: "Par exemple « tous niveaux », « débutants », « confirmés »." },
        description: { type: "string", description: "2 à 4 phrases pour les participants : programme, matériel, point de rendez-vous." },
        plan_b: { type: "string", description: "Solution de repli si la météo s'annonce mauvaise." },
      },
      required: ["titre", "date", "debut", "fin", "spot_id", "places", "niveau", "description"],
    },
  },
  {
    name: "modifier_brouillon",
    description:
      "Modifie une fiche brouillon existante, à partir de son identifiant (donné dans l'historique : « id=… »). " +
      "N'envoie que les champs qui changent. Si seul le début change, la fin est décalée pour garder la même durée. " +
      "Ne fonctionne pas sur une fiche déjà publiée. Après un changement de date ou d'horaire, revérifie l'agenda (et la météo si la date change).",
    input_schema: {
      type: "object",
      properties: {
        brouillon_id: { type: "string", description: "Identifiant de la fiche à modifier." },
        titre: { type: "string" },
        date: { type: "string", description: "AAAA-MM-JJ" },
        debut: { type: "string", description: "HH:MM" },
        fin: { type: "string", description: "HH:MM" },
        spot_id: { type: "string" },
        places: { type: "integer", minimum: 1, maximum: 300 },
        niveau: { type: "string" },
        description: { type: "string" },
        plan_b: { type: "string", description: "Chaîne vide pour retirer le plan B." },
      },
      required: ["brouillon_id"],
    },
  },
];

type Input = Record<string, unknown>;

function str(input: Input, key: string, max = 200): string | null {
  const v = input[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Exécute un outil. Renvoie toujours un objet sérialisable ; `erreur` signale un échec au modèle. */
export async function runTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<{ ok: boolean; output: unknown }> {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Input;
  const fail = (erreur: string) => ({ ok: false, output: { erreur } });

  switch (name) {
    case "resoudre_date": {
      const expression = str(input, "expression");
      if (!expression) return fail("Paramètre « expression » manquant.");
      const r = resolveDate(expression, ctx.today);
      if (!r.ok) return fail(r.erreur);
      if (r.date < ctx.today) return fail(`Le ${r.jour} est déjà passé.`);
      return { ok: true, output: r };
    }

    case "verifier_agenda": {
      const date = str(input, "date");
      if (!date || !isValidIso(date)) return fail("Date attendue au format AAAA-MM-JJ.");
      const creneaux = ctx.store.agendaFor(ctx.sessionId, date);
      return { ok: true, output: { date, jour: formatLong(date), creneaux } };
    }

    case "chercher_spot": {
      const recherche = str(input, "recherche");
      if (!recherche) return fail("Paramètre « recherche » manquant.");
      const found = findSpots(recherche);
      if (!found.length) {
        return {
          ok: false,
          output: {
            erreur: `Aucun spot connu pour « ${recherche} ».`,
            spotsDisponibles: SPOTS.map((s) => ({ id: s.id, nom: s.nom, type: s.type })),
          },
        };
      }
      return { ok: true, output: { spots: found.map(({ motsCles: _, ...s }) => s) } };
    }

    case "meteo": {
      const date = str(input, "date");
      if (!date || !isValidIso(date)) return fail("Date attendue au format AAAA-MM-JJ.");
      const f = await ctx.forecast(date, ctx.today);
      return f.ok ? { ok: true, output: f } : fail(f.erreur);
    }

    case "creer_brouillon": {
      const checked = checkDraft(input, ctx.today);
      if ("erreur" in checked) return fail(checked.erreur);
      const draft: EventDraft = { id: randomUUID(), ...checked };
      ctx.store.saveDraft(ctx.sessionId, draft);
      return { ok: true, output: draftResult(draft, ctx, "Brouillon prêt. Il n'est PAS publié : l'utilisateur doit cliquer sur Publier.") };
    }

    case "modifier_brouillon": {
      const id = str(input, "brouillon_id", 64);
      const current = id ? ctx.store.getDraft(ctx.sessionId, id) : undefined;
      if (!id || !current) return fail("Fiche introuvable : vérifie l'identifiant (id=…) dans l'historique.");
      if (ctx.store.isPublished(ctx.sessionId, id)) {
        return fail("Cette fiche est déjà publiée, elle ne peut plus être modifiée. Propose de créer une nouvelle fiche.");
      }

      // On part de la fiche actuelle et on n'écrase que les champs fournis
      const merged: Input = {
        titre: current.titre, date: current.date, debut: current.debut, fin: current.fin,
        spot_id: current.spotId, places: current.places, niveau: current.niveau,
        description: current.description, plan_b: current.planB,
      };
      for (const key of Object.keys(merged)) if (input[key] !== undefined) merged[key] = input[key];
      if (input.plan_b === "") merged.plan_b = undefined;

      // Seul le début change : on garde la durée
      if (typeof input.debut === "string" && input.fin === undefined && TIME.test(input.debut)) {
        merged.fin = shiftEnd(current.debut, current.fin, input.debut) ?? merged.fin;
      }

      const checked = checkDraft(merged, ctx.today);
      if ("erreur" in checked) return fail(checked.erreur);
      const draft: EventDraft = { id: current.id, ...checked };
      ctx.store.saveDraft(ctx.sessionId, draft);
      return { ok: true, output: draftResult(draft, ctx, "Fiche modifiée, toujours en brouillon : l'utilisateur doit cliquer sur Publier.") };
    }

    default:
      return fail(`Outil inconnu : ${name}.`);
  }
}

/** Vérifie tous les champs d'une fiche. Renvoie la fiche (sans id) ou la liste des problèmes. */
function checkDraft(input: Input, today: string): Omit<EventDraft, "id"> | { erreur: string } {
  const titre = str(input, "titre", 80);
  const date = str(input, "date");
  const debut = str(input, "debut");
  const fin = str(input, "fin");
  const spotId = str(input, "spot_id");
  const niveau = str(input, "niveau", 60);
  const description = str(input, "description", 800);
  const planB = input.plan_b === undefined ? undefined : str(input, "plan_b", 300) ?? undefined;
  const places = input.places;

  const errors: string[] = [];
  if (!titre) errors.push("titre manquant ou trop long (80 caractères max)");
  if (!date || !isValidIso(date)) errors.push("date invalide (AAAA-MM-JJ)");
  else if (date < today) errors.push("la date est passée");
  else if (daysBetween(today, date) > 365) errors.push("date à plus d'un an");
  if (!debut || !TIME.test(debut)) errors.push("heure de début invalide (HH:MM)");
  if (!fin || !TIME.test(fin)) errors.push("heure de fin invalide (HH:MM)");
  if (debut && fin && TIME.test(debut) && TIME.test(fin) && fin <= debut) errors.push("la fin doit être après le début");
  if (!spotId || !spotById(spotId)) errors.push("spot_id inconnu : utilise chercher_spot");
  if (typeof places !== "number" || !Number.isInteger(places) || places < 1 || places > 300) {
    errors.push("places doit être un entier entre 1 et 300");
  }
  if (!niveau) errors.push("niveau manquant");
  if (!description) errors.push("description manquante ou trop longue");
  if (errors.length) return { erreur: `Brouillon refusé : ${errors.join(" ; ")}.` };

  return {
    titre: titre!, date: date!, debut: debut!, fin: fin!, spotId: spotId!, places: places as number,
    niveau: niveau!, description: description!, ...(planB ? { planB } : {}),
  };
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Nouvelle heure de fin qui garde la durée d'origine ; null si on dépasse minuit. */
export function shiftEnd(oldStart: string, oldEnd: string, newStart: string): string | null {
  const end = minutes(newStart) + minutes(oldEnd) - minutes(oldStart);
  return end < 24 * 60 ? clock(end) : null;
}

/** Ce que le modèle reçoit après création ou modification : la fiche, les conflits, le statut. */
function draftResult(draft: EventDraft, ctx: ToolContext, statut: string) {
  // On signale les conflits sans bloquer : c'est à l'humain de trancher
  const conflits = ctx.store.agendaFor(ctx.sessionId, draft.date).filter((e) => e.id !== draft.id && overlaps(e, draft));
  return {
    brouillon: draft,
    conflits: conflits.map((c) => `${c.titre} (${c.debut}-${c.fin}, ${c.lieu})`),
    statut,
  };
}

/** Fiche prête à afficher dans l'interface (le spot complet plutôt que son identifiant). */
export function presentDraft(draft: EventDraft) {
  const spot = spotById(draft.spotId)!;
  return {
    ...draft,
    jour: formatLong(draft.date),
    spot: { id: spot.id, nom: spot.nom, type: spot.type, adresse: spot.adresse, rendezVous: spot.rendezVous },
  };
}
