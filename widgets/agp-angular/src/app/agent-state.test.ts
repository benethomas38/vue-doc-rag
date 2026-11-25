import { describe, it, expect } from "vitest";
import { applyEvent, failTurn, finishTurn, historyOf, updateDraft, type Draft, type Turn } from "./agent-state";

const draft = (over: Partial<Draft> = {}): Draft => ({
  id: "d1",
  titre: "Jam Bastille",
  date: "2026-11-28",
  jour: "samedi 28 novembre",
  debut: "14:00",
  fin: "17:00",
  places: 30,
  niveau: "tous niveaux",
  description: "Un jam ouvert à tous.",
  spot: { id: "bastille", nom: "La Bastille", type: "exterieur", adresse: "Grenoble", rendezVous: "Au téléphérique" },
  ...over,
});

const start = (): Turn[] => [
  { id: 1, role: "user", text: "Organise un jam", parts: [], status: "done" },
  { id: 2, role: "assistant", text: "", parts: [], status: "running" },
];

describe("applyEvent", () => {
  it("ajoute le texte et les étapes dans l'ordre", () => {
    let turns = applyEvent(start(), 2, "text", { text: "Je regarde." });
    turns = applyEvent(turns, 2, "step_start", { id: "s1", name: "meteo", input: { date: "2026-11-28" } });
    expect(turns[1].parts.map((p) => p.kind)).toEqual(["text", "step"]);
  });

  it("termine une étape sans modifier l'état précédent", () => {
    const before = applyEvent(start(), 2, "step_start", { id: "s1", name: "meteo", input: {} });
    const after = applyEvent(before, 2, "step_end", { id: "s1", ok: true, output: { ciel: "soleil" } });
    const step = after[1].parts[0];
    expect(step.kind === "step" && step.step.status).toBe("ok");
    const old = before[1].parts[0];
    expect(old.kind === "step" && old.step.status).toBe("running");
  });

  it("marque les anciennes versions d'une fiche comme remplacées", () => {
    let turns = applyEvent(start(), 2, "draft", { draft: draft() });
    turns = finishTurn(turns, 2);
    turns = [...turns, { id: 3, role: "user", text: "À 15 h", parts: [], status: "done" }];
    turns = [...turns, { id: 4, role: "assistant", text: "", parts: [], status: "running" }];
    turns = applyEvent(turns, 4, "draft", { draft: draft({ debut: "15:00" }) });
    const first = turns[1].parts[0];
    const second = turns[3].parts[0];
    expect(first.kind === "draft" && first.draft.superseded).toBe(true);
    expect(second.kind === "draft" && second.draft.superseded).toBeFalsy();
  });

  it("lève une erreur sur l'événement error", () => {
    expect(() => applyEvent(start(), 2, "error", { message: "Quota" })).toThrow("Quota");
  });
});

describe("failTurn", () => {
  it("passe les étapes en cours en erreur", () => {
    const turns = failTurn(applyEvent(start(), 2, "step_start", { id: "s1", name: "meteo", input: {} }), 2, "Réseau");
    const step = turns[1].parts[0];
    expect(turns[1].status).toBe("error");
    expect(step.kind === "step" && step.step.status).toBe("error");
  });
});

describe("updateDraft", () => {
  it("ne modifie que la version courante", () => {
    let turns = applyEvent(start(), 2, "draft", { draft: draft() });
    turns = applyEvent(turns, 2, "draft", { draft: draft({ debut: "15:00" }) });
    turns = updateDraft(turns, "d1", { published: true });
    const [oldPart, newPart] = turns[1].parts;
    expect(oldPart.kind === "draft" && oldPart.draft.published).toBeFalsy();
    expect(newPart.kind === "draft" && newPart.draft.published).toBe(true);
  });
});

describe("historyOf", () => {
  it("résume les fiches et écarte les échanges en erreur", () => {
    let turns = applyEvent(start(), 2, "text", { text: "Voici la fiche." });
    turns = finishTurn(applyEvent(turns, 2, "draft", { draft: draft() }), 2);
    turns = [
      ...turns,
      { id: 3, role: "user", text: "Et dimanche ?", parts: [], status: "done" },
      { id: 4, role: "assistant", text: "", parts: [], status: "error", error: "x" },
    ];
    const history = historyOf(turns);
    expect(history).toHaveLength(2);
    expect(history[1].text).toContain("[Fiche id=d1");
    expect(history[1].text).toContain("brouillon non publié");
  });
});
