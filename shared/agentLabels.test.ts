import { describe, it, expect } from "vitest";
import { shortDate, stepInput, stepLabel, stepOutput } from "./agentLabels";

describe("agentLabels", () => {
  it("nomme les outils en français", () => {
    expect(stepLabel("meteo")).toBe("Consulter la météo");
    expect(stepLabel("outil_inconnu")).toBe("outil_inconnu");
  });

  it("résume les entrées", () => {
    expect(stepInput("resoudre_date", { expression: "samedi" })).toBe("« samedi »");
    expect(shortDate("2026-11-28")).toBe("sam. 28 nov.");
    expect(stepInput("modifier_brouillon", { brouillon_id: "x", debut: "17:00", places: 25 })).toBe("début → 17:00, places → 25");
  });

  it("résume les sorties, erreurs comprises", () => {
    expect(stepOutput("verifier_agenda", true, { creneaux: [] })).toBe("Rien de prévu ce jour-là");
    expect(stepOutput("verifier_agenda", true, { creneaux: [{ titre: "Session", debut: "10:00", fin: "12:00" }] })).toBe("Session 10:00-12:00");
    expect(stepOutput("creer_brouillon", true, { conflits: ["a", "b"] })).toBe("Fiche prête, 2 conflits signalés");
    expect(stepOutput("modifier_brouillon", true, { conflits: [] })).toBe("Fiche modifiée, aucun conflit");
    expect(stepOutput("chercher_spot", false, { erreur: "Aucun spot" })).toBe("Aucun spot");
  });
});
