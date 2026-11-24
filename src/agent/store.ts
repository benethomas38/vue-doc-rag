/**
 * Agenda de démo, en mémoire et séparé par visiteur.
 * Chaque visiteur a son propre agenda : ce qu'un inconnu publie n'apparaît jamais chez les autres,
 * donc personne ne peut afficher n'importe quoi sur le site.
 * Les sessions inactives sont oubliées au bout de quelques heures.
 */
import { RECURRING, spotById } from "./data.ts";
import { addDays, weekday } from "./dates.ts";

export interface EventDraft {
  id: string;
  titre: string;
  date: string;      // AAAA-MM-JJ
  debut: string;     // HH:MM
  fin: string;       // HH:MM
  spotId: string;
  places: number;
  niveau: string;
  description: string;
  planB?: string;
}

export interface AgendaEntry {
  id: string;
  titre: string;
  date: string;
  debut: string;
  fin: string;
  lieu: string;
  source: "recurrent" | "publie";
}

interface Session {
  drafts: Map<string, EventDraft>;
  published: EventDraft[];
  lastSeen: number;
}

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 2000;
const MAX_DRAFTS = 20;
const MAX_PUBLISHED = 20;

export const SESSION_ID = /^[a-zA-Z0-9-]{16,64}$/;

export function createStore(now: () => number = Date.now) {
  const sessions = new Map<string, Session>();

  function cleanup() {
    const limit = now() - SESSION_TTL_MS;
    for (const [id, s] of sessions) if (s.lastSeen < limit) sessions.delete(id);
    // Au pire, on oublie les plus anciennes (une Map garde l'ordre d'insertion)
    while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
  }

  function session(id: string): Session {
    let s = sessions.get(id);
    if (!s) {
      cleanup();
      s = { drafts: new Map(), published: [], lastSeen: now() };
      sessions.set(id, s);
    }
    s.lastSeen = now();
    return s;
  }

  return {
    saveDraft(sessionId: string, draft: EventDraft) {
      const s = session(sessionId);
      s.drafts.set(draft.id, draft);
      while (s.drafts.size > MAX_DRAFTS) s.drafts.delete(s.drafts.keys().next().value!);
    },

    getDraft(sessionId: string, draftId: string): EventDraft | undefined {
      return sessions.get(sessionId)?.drafts.get(draftId);
    },

    /** Appelé uniquement par la route de publication, c'est-à-dire par un clic humain. */
    publish(sessionId: string, draftId: string): EventDraft | { erreur: string } {
      const s = session(sessionId);
      const draft = s.drafts.get(draftId);
      if (!draft) return { erreur: "Brouillon introuvable ou expiré." };
      if (s.published.some((e) => e.id === draftId)) return { erreur: "Cet événement est déjà publié." };
      if (s.published.length >= MAX_PUBLISHED) return { erreur: "Ton agenda de démo est plein." };
      s.published.push(draft);
      return draft;
    },

    /** Agenda d'un jour : créneaux récurrents + événements publiés par ce visiteur. */
    agendaFor(sessionId: string, date: string): AgendaEntry[] {
      const entries: AgendaEntry[] = RECURRING.filter((r) => r.weekday === weekday(date)).map((r, i) => ({
        id: `rec-${date}-${i}`,
        titre: r.titre,
        date,
        debut: r.debut,
        fin: r.fin,
        lieu: spotById(r.spotId)?.nom ?? r.spotId,
        source: "recurrent",
      }));
      for (const e of sessions.get(sessionId)?.published ?? []) {
        if (e.date === date) {
          entries.push({
            id: e.id,
            titre: e.titre,
            date: e.date,
            debut: e.debut,
            fin: e.fin,
            lieu: spotById(e.spotId)?.nom ?? e.spotId,
            source: "publie",
          });
        }
      }
      return entries.sort((a, b) => a.debut.localeCompare(b.debut));
    },

    /** Les prochains jours, pour le panneau d'agenda de l'interface. */
    upcoming(sessionId: string, from: string, days: number): AgendaEntry[] {
      const all: AgendaEntry[] = [];
      for (let i = 0; i < days; i++) all.push(...this.agendaFor(sessionId, addDays(from, i)));
      // Les événements publiés plus loin dans le futur apparaissent aussi
      const last = addDays(from, days - 1);
      for (const e of sessions.get(sessionId)?.published ?? []) {
        if (e.date > last) all.push(...this.agendaFor(sessionId, e.date).filter((x) => x.id === e.id));
      }
      return all;
    },
  };
}

export type Store = ReturnType<typeof createStore>;

/** true si deux créneaux "HH:MM" se chevauchent. */
export function overlaps(a: { debut: string; fin: string }, b: { debut: string; fin: string }): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}
