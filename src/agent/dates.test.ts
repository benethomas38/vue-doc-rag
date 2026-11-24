import { describe, it, expect } from "vitest";
import { addDays, formatLong, resolveDate, todayInParis } from "./dates.ts";

// Mardi 24 novembre 2026
const TODAY = "2026-11-24";
const date = (expr: string) => {
  const r = resolveDate(expr, TODAY);
  return r.ok ? r.date : `erreur: ${r.erreur}`;
};

describe("resolveDate", () => {
  it("comprend les jours relatifs", () => {
    expect(date("demain")).toBe("2026-11-25");
    expect(date("après-demain à 14h")).toBe("2026-11-26");
    expect(date("aujourd'hui")).toBe(TODAY);
    expect(date("dans 3 jours")).toBe("2026-11-27");
    expect(date("dans deux semaines")).toBe("2026-12-08");
  });

  it("prend le prochain jour de la semaine, jamais aujourd'hui", () => {
    expect(date("samedi")).toBe("2026-11-28");
    expect(date("ce Samedi à 14h")).toBe("2026-11-28");
    expect(date("mardi")).toBe("2026-12-01");
    expect(date("samedi en huit")).toBe("2026-12-05");
  });

  it("signale que « samedi prochain » est ambigu", () => {
    const r = resolveDate("samedi prochain", TODAY);
    expect(r.ok && r.date).toBe("2026-11-28");
    expect(r.ok && r.alternative).toBe("2026-12-05");
    expect(r.ok && r.ambigu).toBeTruthy();
  });

  it("lit les dates écrites", () => {
    expect(date("le 12 décembre")).toBe("2026-12-12");
    expect(date("1er decembre 2026")).toBe("2026-12-01");
    expect(date("12/12")).toBe("2026-12-12");
    expect(date("2026-12-31")).toBe("2026-12-31");
  });

  it("passe à l'année suivante pour une date déjà passée sans année", () => {
    expect(date("le 3 mars")).toBe("2027-03-03");
    expect(date("15/01")).toBe("2027-01-15");
  });

  it("refuse ce qui n'existe pas ou ne veut rien dire", () => {
    expect(date("30 février")).toMatch(/^erreur/);
    expect(date("un de ces quatre")).toMatch(/^erreur/);
  });

  it("le week-end = le samedi, avec le dimanche en alternative", () => {
    const r = resolveDate("ce week-end", TODAY);
    expect(r.ok && r.date).toBe("2026-11-28");
    expect(r.ok && r.alternative).toBe("2026-11-29");
  });
});

describe("outils de date", () => {
  it("formate en français", () => {
    expect(formatLong("2026-11-28")).toBe("samedi 28 novembre 2026");
    expect(formatLong("2026-12-01")).toBe("mardi 1er décembre 2026");
  });

  it("traverse le changement d'heure sans décalage", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("donne la date de Grenoble, pas celle du serveur", () => {
    // 23 h 30 UTC le 24 = 0 h 30 le 25 à Paris
    expect(todayInParis(new Date("2026-11-24T23:30:00Z"))).toBe("2026-11-25");
  });
});
