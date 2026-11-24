/**
 * Données de démonstration. Ce ne sont PAS les vraies données de l'AGP :
 * les spots et les créneaux sont des exemples, à remplacer par les vrais.
 */

export interface Spot {
  id: string;
  nom: string;
  type: "exterieur" | "interieur";
  adresse: string;
  rendezVous: string;
  niveau: string;
  description: string;
  motsCles: string[]; // ce qu'un bénévole pourrait taper pour le désigner
}

export const SPOTS: Spot[] = [
  {
    id: "bastille",
    nom: "Fort de la Bastille",
    type: "exterieur",
    adresse: "Fort de la Bastille, 38000 Grenoble",
    rendezVous: "En bas de la montée Chalemont, côté quai",
    niveau: "intermédiaire à confirmé",
    description: "Murets, escaliers et remparts en pierre sur les hauteurs. Beaucoup de dénivelé, prévoir de l'eau.",
    motsCles: ["bastille", "fort", "chalemont", "remparts"],
  },
  {
    id: "paul-mistral",
    nom: "Parc Paul Mistral",
    type: "exterieur",
    adresse: "Parc Paul Mistral, 38000 Grenoble",
    rendezVous: "Au pied de la tour Perret",
    niveau: "tous niveaux",
    description: "Grand parc plat avec bancs, barrières et murets bas. Idéal pour les initiations.",
    motsCles: ["paul mistral", "mistral", "tour perret", "parc", "anneau de vitesse"],
  },
  {
    id: "caserne-de-bonne",
    nom: "Caserne de Bonne",
    type: "exterieur",
    adresse: "Caserne de Bonne, 38000 Grenoble",
    rendezVous: "Sur l'esplanade centrale",
    niveau: "débutant à intermédiaire",
    description: "Architecture moderne, rambardes et marches. Quartier animé, attention aux passants.",
    motsCles: ["caserne", "de bonne", "bonne"],
  },
  {
    id: "campus",
    nom: "Campus universitaire",
    type: "exterieur",
    adresse: "Domaine universitaire, 38400 Saint-Martin-d'Hères",
    rendezVous: "Arrêt de tram Bibliothèques universitaires",
    niveau: "tous niveaux",
    description: "Grand espace varié, calme le week-end. Accessible en tram B ou C.",
    motsCles: ["campus", "fac", "universite", "saint martin d heres", "smh", "domaine universitaire"],
  },
  {
    id: "salle",
    nom: "Gymnase partenaire (repli en salle)",
    type: "interieur",
    adresse: "Adresse communiquée aux adhérents",
    rendezVous: "Devant l'entrée du gymnase",
    niveau: "tous niveaux",
    description: "Salle équipée de tapis et de modules. Solution de repli quand il pleut ou qu'il fait trop froid.",
    motsCles: ["salle", "gymnase", "gym", "interieur", "indoor", "couvert"],
  },
];

/** Créneaux récurrents de l'association (jour de la semaine : 0 = dimanche). */
export const RECURRING = [
  { weekday: 2, debut: "19:00", fin: "21:00", titre: "Entraînement adhérents", spotId: "salle" },
  { weekday: 4, debut: "19:00", fin: "21:00", titre: "Entraînement adhérents", spotId: "salle" },
  { weekday: 6, debut: "10:00", fin: "12:00", titre: "Session extérieure", spotId: "paul-mistral" },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cherche un spot par son nom ou un mot-clé ("la Bastille", "parc mistral", "en salle"…). */
export function findSpots(query: string): Spot[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const exact = SPOTS.find((s) => s.id === q.replace(/ /g, "-"));
  if (exact) return [exact];
  // Comparaison par mots entiers : « surface » ne doit pas trouver le mot-clé « fac »
  const padded = ` ${q} `;
  return SPOTS.filter(
    (s) => normalize(s.nom).includes(q) || s.motsCles.some((k) => padded.includes(` ${k} `)),
  );
}

export function spotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}
