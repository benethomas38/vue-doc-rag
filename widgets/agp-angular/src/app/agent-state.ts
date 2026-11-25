/**
 * L'état de la conversation avec l'agent, en fonctions pures (aucune dépendance à Angular).
 * Chaque événement reçu du serveur produit un nouveau tableau de tours : le composant
 * le range dans un signal, et Angular met à jour l'affichage.
 */

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
  superseded?: boolean; // remplacée par une version modifiée plus bas dans la conversation
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

export interface HistoryItem {
  role: "user" | "assistant";
  text: string;
}

/** L'historique envoyé au serveur : seulement du texte, résumé côté assistant. */
export function historyOf(turns: readonly Turn[]): HistoryItem[] {
  // Les tours vont par paires (demande, réponse) : on écarte les paires dont la réponse a échoué
  return turns
    .filter((t, i, all) => (t.role === "user" ? all[i + 1]?.status === "done" : t.status === "done"))
    .map((t): HistoryItem => {
      if (t.role === "user") return { role: "user", text: t.text };
      const texts = t.parts.flatMap((p) => (p.kind === "text" ? [p.text] : []));
      // Seulement la dernière version de chaque fiche, avec son id pour que l'agent puisse la modifier
      for (const p of t.parts) {
        if (p.kind !== "draft" || p.draft.superseded) continue;
        const d = p.draft;
        texts.push(
          `[Fiche id=${d.id} : « ${d.titre} », ${d.jour} ${d.debut}-${d.fin}, ${d.spot.nom}, ${d.places} places, ` +
            `${d.niveau}${d.planB ? `, plan B : ${d.planB}` : ""}, ${d.published ? "publiée" : "brouillon non publié"}]`,
        );
      }
      return { role: "assistant", text: texts.join("\n") };
    })
    .filter((h) => h.text.trim() !== "");
}

/** Applique une modification au tour `turnId`, sans toucher aux autres. */
function patchTurn(turns: readonly Turn[], turnId: number, fn: (t: Turn) => Turn): Turn[] {
  return turns.map((t) => (t.id === turnId ? fn(t) : t));
}

function mapParts(turns: readonly Turn[], fn: (p: Part) => Part): Turn[] {
  return turns.map((t) => ({ ...t, parts: t.parts.map(fn) }));
}

/** Un événement SSE de l'agent → le nouvel état. Un événement "error" lève une exception. */
export function applyEvent(turns: readonly Turn[], turnId: number, event: string, data: unknown): Turn[] {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const push = (part: Part) => patchTurn(turns, turnId, (t) => ({ ...t, parts: [...t.parts, part] }));

  switch (event) {
    case "text":
      return push({ kind: "text", text: String(d.text ?? "") });
    case "step_start":
      return push({ kind: "step", step: { id: String(d.id), name: String(d.name), input: d.input, status: "running" } });
    case "step_end":
      return patchTurn(turns, turnId, (t) => ({
        ...t,
        parts: t.parts.map((p) =>
          p.kind === "step" && p.step.id === String(d.id)
            ? { kind: "step", step: { ...p.step, status: d.ok ? "ok" : "error", output: d.output } }
            : p,
        ),
      }));
    case "draft": {
      const draft = d.draft as Draft;
      // Une fiche modifiée garde son id : les versions précédentes passent en « remplacée »
      const marked = mapParts(turns, (p) =>
        p.kind === "draft" && p.draft.id === draft.id ? { kind: "draft", draft: { ...p.draft, superseded: true } } : p,
      );
      return patchTurn(marked, turnId, (t) => ({ ...t, parts: [...t.parts, { kind: "draft", draft }] }));
    }
    case "error":
      throw new Error(String(d.message ?? "Erreur"));
    default:
      return [...turns];
  }
}

export function finishTurn(turns: readonly Turn[], turnId: number): Turn[] {
  return patchTurn(turns, turnId, (t) => ({ ...t, status: "done" }));
}

/** Le tour passe en erreur ; les étapes encore en cours aussi. */
export function failTurn(turns: readonly Turn[], turnId: number, message: string): Turn[] {
  return patchTurn(turns, turnId, (t) => ({
    ...t,
    status: "error",
    error: message,
    parts: t.parts.map((p) =>
      p.kind === "step" && p.step.status === "running" ? { kind: "step", step: { ...p.step, status: "error" } } : p,
    ),
  }));
}

/** Modifie la version courante (non remplacée) d'une fiche. */
export function updateDraft(turns: readonly Turn[], draftId: string, changes: Partial<Draft>): Turn[] {
  return mapParts(turns, (p) =>
    p.kind === "draft" && p.draft.id === draftId && !p.draft.superseded
      ? { kind: "draft", draft: { ...p.draft, ...changes } }
      : p,
  );
}
