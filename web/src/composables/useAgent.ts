import { computed, ref } from "vue";
import { parseSSE } from "../lib/sse";

export interface Step {
  id: string;
  name: string;
  input: unknown;
  status: "running" | "ok" | "error";
  output?: unknown;
}

export interface Draft {
  id: string;
  titre: string;
  date: string;
  jour: string;
  debut: string;
  fin: string;
  places: number;
  niveau: string;
  description: string;
  planB?: string;
  spot: { id: string; nom: string; type: "exterieur" | "interieur"; adresse: string; rendezVous: string };
  published?: boolean;
  publishing?: boolean;
  publishError?: string;
}

/** Une réponse de l'agent = une suite ordonnée de textes, d'étapes et de fiches. */
export type Part =
  | { kind: "text"; text: string }
  | { kind: "step"; step: Step }
  | { kind: "draft"; draft: Draft };

export interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string; // demande de l'utilisateur
  parts: Part[];
  status: "running" | "done" | "error";
  error?: string;
}

let nextId = 1;

/** Identifiant aléatoire propre à l'onglet : ton agenda de démo n'est visible que par toi. */
function sessionId(): string {
  const key = "agp-agent-session";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function useAgent() {
  const session = sessionId();
  const turns = ref<Turn[]>([]);
  const loading = computed(() => turns.value.some((t) => t.status === "running"));
  /** Incrémenté quand l'agenda a pu changer : le panneau d'agenda se recharge. */
  const agendaVersion = ref(0);

  /** L'historique envoyé au serveur : seulement du texte, résumé côté assistant. */
  function history() {
    // Les tours vont par paires (demande, réponse) : on écarte les paires dont la réponse a échoué
    return turns.value
      .filter((t, i, all) => (t.role === "user" ? all[i + 1]?.status === "done" : t.status === "done"))
      .map((t) => {
        if (t.role === "user") return { role: "user" as const, text: t.text };
        const texts = t.parts.filter((p) => p.kind === "text").map((p) => p.text);
        const drafts = t.parts.filter((p) => p.kind === "draft").map((p) => p.draft);
        for (const d of drafts) {
          texts.push(`[Brouillon créé : « ${d.titre} », ${d.jour} ${d.debut}-${d.fin}, ${d.spot.nom}, ${d.places} places, ${d.niveau}${d.published ? ", publié" : ""}]`);
        }
        return { role: "assistant" as const, text: texts.join("\n") };
      })
      .filter((h) => h.text.trim());
  }

  async function run(request: string) {
    const previous = history();
    turns.value.push({ id: nextId++, role: "user", text: request, parts: [], status: "done" });
    turns.value.push({ id: nextId++, role: "assistant", text: "", parts: [], status: "running" });
    // L'élément du tableau réactif : le modifier met l'affichage à jour
    const turn = turns.value[turns.value.length - 1];
    const steps = new Map<string, Step>();

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, request, history: previous }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Erreur serveur (${res.status})`);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSSE(buffer + value);
        buffer = parsed.rest;

        for (const { event, data } of parsed.events) {
          const d = data as Record<string, unknown>;
          if (event === "text") {
            turn.parts.push({ kind: "text", text: String(d.text ?? "") });
          } else if (event === "step_start") {
            turn.parts.push({ kind: "step", step: { id: String(d.id), name: String(d.name), input: d.input, status: "running" } });
            const part = turn.parts[turn.parts.length - 1];
            if (part.kind === "step") steps.set(part.step.id, part.step);
          } else if (event === "step_end") {
            const step = steps.get(String(d.id));
            if (step) {
              step.status = d.ok ? "ok" : "error";
              step.output = d.output;
            }
          } else if (event === "draft") {
            turn.parts.push({ kind: "draft", draft: d.draft as Draft });
          } else if (event === "error") {
            throw new Error(String(d.message ?? "Erreur"));
          }
        }
      }
      turn.status = "done";
    } catch (err) {
      turn.status = "error";
      turn.error = err instanceof Error ? err.message : "Erreur inconnue";
      for (const s of steps.values()) if (s.status === "running") s.status = "error";
    }
    agendaVersion.value++;
  }

  /** Le seul chemin vers la publication : un clic sur le bouton. */
  async function publish(draft: Draft) {
    draft.publishing = true;
    draft.publishError = undefined;
    try {
      const res = await fetch("/api/agent/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, draftId: draft.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Erreur serveur (${res.status})`);
      draft.published = true;
      agendaVersion.value++;
    } catch (err) {
      draft.publishError = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      draft.publishing = false;
    }
  }

  function reset() {
    turns.value = [];
  }

  return { session, turns, loading, agendaVersion, run, publish, reset };
}
