/**
 * Traduit les appels d'outils de l'agent en phrases lisibles pour l'interface.
 * Le JSON brut reste visible en dépliant chaque étape, pour les curieux.
 */

type Data = Record<string, unknown>;

const LABELS: Record<string, string> = {
  resoudre_date: "Comprendre la date",
  verifier_agenda: "Vérifier l'agenda",
  chercher_spot: "Trouver le lieu",
  meteo: "Consulter la météo",
  creer_brouillon: "Préparer la fiche",
};

export function stepLabel(name: string): string {
  return LABELS[name] ?? name;
}

const asData = (v: unknown): Data => (v && typeof v === "object" ? (v as Data) : {});

/** "2026-11-28" → "sam. 28 nov." */
export function shortDate(iso: unknown): string {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso ?? "");
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** Ce que l'agent a demandé, en une ligne. */
export function stepInput(name: string, input: unknown): string {
  const i = asData(input);
  switch (name) {
    case "resoudre_date":
      return `« ${i.expression ?? ""} »`;
    case "verifier_agenda":
    case "meteo":
      return shortDate(i.date);
    case "chercher_spot":
      return `« ${i.recherche ?? ""} »`;
    case "creer_brouillon":
      return `${i.titre ?? ""}, ${shortDate(i.date)} ${i.debut ?? ""}-${i.fin ?? ""}`;
    default:
      return "";
  }
}

/** Ce que l'outil a répondu, en une ligne. */
export function stepOutput(name: string, ok: boolean, output: unknown): string {
  const o = asData(output);
  if (!ok) return String(o.erreur ?? "Échec");
  switch (name) {
    case "resoudre_date":
      return `${o.jour}${o.ambigu ? " (ambigu)" : ""}`;
    case "verifier_agenda": {
      const slots = Array.isArray(o.creneaux) ? (o.creneaux as Data[]) : [];
      if (!slots.length) return "Rien de prévu ce jour-là";
      return slots.map((s) => `${s.titre} ${s.debut}-${s.fin}`).join(", ");
    }
    case "chercher_spot": {
      const spots = Array.isArray(o.spots) ? (o.spots as Data[]) : [];
      return spots.map((s) => `${s.nom} (${s.type === "interieur" ? "en salle" : "extérieur"})`).join(", ");
    }
    case "meteo":
      return `${o.ciel}, ${o.tempMin} à ${o.tempMax} °C, pluie ${o.risquePluie} % : ${o.conseil}`;
    case "creer_brouillon": {
      const conflicts = Array.isArray(o.conflits) ? o.conflits.length : 0;
      return conflicts ? `Fiche prête, ${conflicts} conflit${conflicts > 1 ? "s" : ""} signalé${conflicts > 1 ? "s" : ""}` : "Fiche prête, aucun conflit";
    }
    default:
      return "";
  }
}
