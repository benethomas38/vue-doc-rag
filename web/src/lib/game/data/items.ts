/**
 * Tous les objets du jeu. Pour en ajouter un : une entrée ici, et un sprite du même nom
 * dans sprites.ts (sinon il prend l'icône générique de sa catégorie).
 */
export type Rarity = "commun" | "rare" | "epique" | "legendaire";
export type ItemKind = "arme" | "armure" | "bijou" | "potion" | "parchemin" | "nourriture" | "quete";
export type Slot = "arme" | "armure" | "bijou";
export type StatName = "atk" | "def" | "agi" | "maxHp" | "vision";

/** Pouvoirs passifs d'un équipement. */
export type Special =
  | "gel"        // 20 % de chances de geler l'ennemi 2 tours
  | "brulure"    // 25 % de chances d'enflammer l'ennemi
  | "vampire"    // rend 25 % des dégâts infligés
  | "epines"     // renvoie 2 dégâts à chaque coup reçu
  | "regen"      // 1 PV tous les 4 tours
  | "traceur";   // le saut recharge 2 tours plus vite

export type UseEffect =
  | { type: "soin"; amount: number }
  | { type: "buff"; stat: "atk" | "def" | "agi"; amount: number; turns: number }
  | { type: "antidote" }
  | { type: "douteuse" }
  | { type: "teleport" }
  | { type: "carte" }
  | { type: "boule_de_feu"; damage: number }
  | { type: "blizzard"; turns: number }
  | { type: "champignon" };

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  price: number;        // prix de base chez le marchand
  minFloor: number;     // n'apparaît pas avant cet étage
  description: string;  // ce que fait l'objet
  flavor: string;       // une ligne d'ambiance
  bonus?: Partial<Record<StatName, number>>;
  special?: Special;
  use?: UseEffect;
  noDrop?: boolean;     // objet unique, jamais tiré au hasard
}

export const RARITY_LABEL: Record<Rarity, string> = {
  commun: "Commun",
  rare: "Rare",
  epique: "Épique",
  legendaire: "Légendaire",
};

export const RARITY_COLOR: Record<Rarity, string> = {
  commun: "#c9d1d9",
  rare: "#49c0b2",
  epique: "#b48cff",
  legendaire: "#ffb627",
};

export const SPECIAL_LABEL: Record<Special, string> = {
  gel: "Gel : 20 % de chances de geler l'ennemi 2 tours",
  brulure: "Brûlure : 25 % de chances d'enflammer l'ennemi",
  vampire: "Vampire : rend 25 % des dégâts infligés",
  epines: "Épines : renvoie 2 dégâts à chaque coup reçu",
  regen: "Régénération : 1 PV tous les 4 tours",
  traceur: "Traceur : le saut recharge 2 tours plus vite",
};

export const ITEMS: ItemDef[] = [
  // --- Armes ---------------------------------------------------------------
  {
    id: "dague_rouillee", name: "Dague rouillée", kind: "arme", rarity: "commun", price: 20, minFloor: 1,
    bonus: { atk: 2 }, description: "+2 attaque.",
    flavor: "Elle a connu des jours meilleurs. Et du tétanos.",
  },
  {
    id: "epee_courte", name: "Épée courte", kind: "arme", rarity: "commun", price: 35, minFloor: 1,
    bonus: { atk: 3 }, description: "+3 attaque.",
    flavor: "Fiable, honnête, un peu ennuyeuse.",
  },
  {
    id: "hache_bucheron", name: "Hache de bûcheron", kind: "arme", rarity: "rare", price: 70, minFloor: 1,
    bonus: { atk: 5, agi: -1 }, description: "+5 attaque, −1 agilité.",
    flavor: "Conçue pour les chênes. Fonctionne aussi sur les gobelins.",
  },
  {
    id: "rapiere", name: "Rapière du duelliste", kind: "arme", rarity: "rare", price: 85, minFloor: 2,
    bonus: { atk: 4, agi: 3 }, description: "+4 attaque, +3 agilité.",
    flavor: "Touché. Encore touché. Toujours touché.",
  },
  {
    id: "masse_cloutee", name: "Masse cloutée", kind: "arme", rarity: "rare", price: 90, minFloor: 2,
    bonus: { atk: 6 }, description: "+6 attaque.",
    flavor: "La subtilité, c'est surfait.",
  },
  {
    id: "lame_givre", name: "Lame de givre", kind: "arme", rarity: "epique", price: 160, minFloor: 3,
    bonus: { atk: 6 }, special: "gel", description: "+6 attaque. Peut geler l'ennemi.",
    flavor: "Toujours froide au toucher, même près de la forge.",
  },
  {
    id: "epee_flamboyante", name: "Épée flamboyante", kind: "arme", rarity: "epique", price: 170, minFloor: 3,
    bonus: { atk: 7 }, special: "brulure", description: "+7 attaque. Peut enflammer l'ennemi.",
    flavor: "Pratique aussi pour les grillades.",
  },
  {
    id: "faux_vampirique", name: "Faux vampirique", kind: "arme", rarity: "epique", price: 180, minFloor: 3,
    bonus: { atk: 6 }, special: "vampire", description: "+6 attaque. Vole la vie des ennemis.",
    flavor: "Elle a soif. Tout le temps.",
  },
  {
    id: "excalibouse", name: "Excalibouse", kind: "arme", rarity: "legendaire", price: 400, minFloor: 4,
    bonus: { atk: 10, def: 2 }, description: "+10 attaque, +2 défense.",
    flavor: "Retirée d'un tas de fumier par un héros qui n'a jamais voulu en parler.",
  },

  // --- Armures -------------------------------------------------------------
  {
    id: "tunique_cuir", name: "Tunique en cuir", kind: "armure", rarity: "commun", price: 30, minFloor: 1,
    bonus: { def: 1 }, description: "+1 défense.",
    flavor: "Sent le vieux sac à dos.",
  },
  {
    id: "cotte_mailles", name: "Cotte de mailles", kind: "armure", rarity: "rare", price: 80, minFloor: 2,
    bonus: { def: 3, agi: -1 }, description: "+3 défense, −1 agilité.",
    flavor: "Dix mille anneaux, dont trois rouillés.",
  },
  {
    id: "manteau_ombre", name: "Manteau d'ombre", kind: "armure", rarity: "epique", price: 150, minFloor: 3,
    bonus: { def: 2, agi: 4 }, description: "+2 défense, +4 agilité.",
    flavor: "Les flèches ont du mal à savoir où tu es. Toi aussi, parfois.",
  },
  {
    id: "cuirasse_forge", name: "Cuirasse de la forge", kind: "armure", rarity: "epique", price: 170, minFloor: 3,
    bonus: { def: 5 }, description: "+5 défense.",
    flavor: "Forgée dans la lave par des nains qui ne rigolaient pas.",
  },
  {
    id: "armure_paladin", name: "Armure du paladin", kind: "armure", rarity: "legendaire", price: 380, minFloor: 4,
    bonus: { def: 7, maxHp: 10 }, description: "+7 défense, +10 PV max.",
    flavor: "Elle brille un peu trop. Les squelettes détestent ça.",
  },

  // --- Bijoux --------------------------------------------------------------
  {
    id: "lanterne", name: "Lanterne de poche", kind: "bijou", rarity: "commun", price: 40, minFloor: 1,
    bonus: { vision: 2 }, description: "+2 cases de vision.",
    flavor: "Pour voir venir les ennuis de plus loin.",
  },
  {
    id: "anneau_vigueur", name: "Anneau de vigueur", kind: "bijou", rarity: "rare", price: 90, minFloor: 1,
    bonus: { maxHp: 12 }, description: "+12 PV max.",
    flavor: "Donne la forme. Pas le moral.",
  },
  {
    id: "chaussures_traceur", name: "Chaussures de traceur", kind: "bijou", rarity: "rare", price: 95, minFloor: 1,
    bonus: { agi: 3 }, special: "traceur", description: "+3 agilité. Le saut recharge plus vite.",
    flavor: "Semelles usées sur tous les murets de Grenoble.",
  },
  {
    id: "bague_epines", name: "Bague d'épines", kind: "bijou", rarity: "rare", price: 100, minFloor: 2,
    bonus: { def: 1 }, special: "epines", description: "+1 défense. Renvoie 2 dégâts à chaque coup reçu.",
    flavor: "Ne serre la main de personne avec.",
  },
  {
    id: "amulette_regen", name: "Amulette de régénération", kind: "bijou", rarity: "epique", price: 190, minFloor: 3,
    bonus: { maxHp: 5 }, special: "regen", description: "+5 PV max. Régénère 1 PV tous les 4 tours.",
    flavor: "Elle bat doucement, comme un deuxième cœur.",
  },
  {
    id: "amulette_osvald", name: "Amulette d'Osvald", kind: "quete", rarity: "epique", price: 0, minFloor: 99, noDrop: true,
    bonus: { def: 2, maxHp: 8 }, special: "regen", description: "+2 défense, +8 PV max, régénération. Se porte comme un bijou.",
    flavor: "« Pour celui qui m'a fait rire, après trois cents ans. » — Osvald",
  },

  // --- Potions -------------------------------------------------------------
  {
    id: "potion_soin", name: "Potion de soin", kind: "potion", rarity: "commun", price: 25, minFloor: 1,
    use: { type: "soin", amount: 15 }, description: "Rend 15 PV.",
    flavor: "Goût cerise. Officiellement.",
  },
  {
    id: "grande_potion", name: "Grande potion de soin", kind: "potion", rarity: "rare", price: 60, minFloor: 2,
    use: { type: "soin", amount: 40 }, description: "Rend 40 PV.",
    flavor: "La même, en format familial.",
  },
  {
    id: "elixir_force", name: "Élixir de force", kind: "potion", rarity: "rare", price: 55, minFloor: 1,
    use: { type: "buff", stat: "atk", amount: 3, turns: 30 }, description: "+3 attaque pendant 30 tours.",
    flavor: "Tes biceps te remercient. Ton foie, moins.",
  },
  {
    id: "potion_pierre", name: "Potion de peau de pierre", kind: "potion", rarity: "rare", price: 55, minFloor: 2,
    use: { type: "buff", stat: "def", amount: 3, turns: 30 }, description: "+3 défense pendant 30 tours.",
    flavor: "Effet secondaire : on a du mal à sourire.",
  },
  {
    id: "potion_vivacite", name: "Potion de vivacité", kind: "potion", rarity: "rare", price: 50, minFloor: 1,
    use: { type: "buff", stat: "agi", amount: 6, turns: 30 }, description: "+6 agilité pendant 30 tours.",
    flavor: "Triple espresso alchimique.",
  },
  {
    id: "antidote", name: "Antidote", kind: "potion", rarity: "commun", price: 20, minFloor: 1,
    use: { type: "antidote" }, description: "Soigne le poison et la brûlure, rend 5 PV.",
    flavor: "Amer, mais efficace.",
  },
  {
    id: "potion_douteuse", name: "Potion douteuse", kind: "potion", rarity: "commun", price: 10, minFloor: 1,
    use: { type: "douteuse" }, description: "Effet inconnu. Peut-être génial. Peut-être pas.",
    flavor: "Une étiquette dit « NE PAS BOIRE ». Une autre dit « BOIRE ».",
  },

  // --- Parchemins ------------------------------------------------------------
  {
    id: "parchemin_teleport", name: "Parchemin de téléportation", kind: "parchemin", rarity: "commun", price: 35, minFloor: 1,
    use: { type: "teleport" }, description: "Te téléporte au hasard dans l'étage.",
    flavor: "Destination : surprise.",
  },
  {
    id: "parchemin_carte", name: "Carte magique", kind: "parchemin", rarity: "rare", price: 45, minFloor: 1,
    use: { type: "carte" }, description: "Révèle tout le plan de l'étage, escalier compris.",
    flavor: "Dessinée par un cartographe très, très patient.",
  },
  {
    id: "parchemin_feu", name: "Boule de feu", kind: "parchemin", rarity: "rare", price: 70, minFloor: 2,
    use: { type: "boule_de_feu", damage: 14 }, description: "14 dégâts à tous les ennemis visibles.",
    flavor: "Le grand classique.",
  },
  {
    id: "parchemin_blizzard", name: "Blizzard", kind: "parchemin", rarity: "rare", price: 65, minFloor: 2,
    use: { type: "blizzard", turns: 4 }, description: "Gèle tous les ennemis visibles pendant 4 tours.",
    flavor: "Il fait soudain très, très frais.",
  },

  // --- Nourriture ------------------------------------------------------------
  {
    id: "pain_rassis", name: "Pain rassis", kind: "nourriture", rarity: "commun", price: 8, minFloor: 1,
    use: { type: "soin", amount: 8 }, description: "Rend 8 PV.",
    flavor: "Peut aussi servir d'arme contondante.",
  },
  {
    id: "champignon_luisant", name: "Champignon luisant", kind: "nourriture", rarity: "commun", price: 12, minFloor: 1,
    use: { type: "champignon" }, description: "Rend 6 PV, et +3 vision pendant 40 tours.",
    flavor: "Il brille. C'est soit très bon signe, soit très mauvais.",
  },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemDef(id: string): ItemDef {
  const def = ITEM_BY_ID.get(id);
  if (!def) throw new Error(`Objet inconnu : ${id}`);
  return def;
}

export function isEquipment(def: ItemDef): boolean {
  return def.kind === "arme" || def.kind === "armure" || def.kind === "bijou" || def.kind === "quete";
}

export function slotOf(def: ItemDef): Slot | null {
  if (def.kind === "arme" || def.kind === "armure" || def.kind === "bijou") return def.kind;
  if (def.kind === "quete") return "bijou";
  return null;
}
