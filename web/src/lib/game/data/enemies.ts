/**
 * Le bestiaire. Chaque ennemi a des stats, un comportement et parfois un pouvoir.
 * Les PV et l'attaque augmentent un peu avec l'étage (voir spawnEnemy dans engine.ts).
 */
export type Behavior =
  | "melee"     // fonce sur le héros
  | "erratic"   // fonce, mais se déplace au hasard une fois sur deux
  | "ranged"    // tire à distance quand il a une ligne de vue
  | "thief"     // vole de l'or puis s'enfuit
  | "boss";     // tire, invoque, cogne

export type Power =
  | "poison"    // ses coups peuvent empoisonner
  | "brulure"   // ses coups peuvent enflammer
  | "gel"       // ses coups peuvent geler le héros 1 tour
  | "drain"     // se soigne de la moitié des dégâts infligés
  | "explose"   // explose en mourant (3 dégâts autour)
  | "regen"     // régénère 1 PV par tour
  | "blink"     // se téléporte près du héros de temps en temps
  | "invoque";  // invoque des squelettes

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  agi: number;          // % d'esquive
  xp: number;
  gold: [number, number];
  floors: number[];     // étages où il apparaît
  behavior: Behavior;
  speed: 0.5 | 1 | 2;   // 0.5 : agit un tour sur deux ; 2 : deux actions par tour
  power?: Power;
  range?: number;       // portée des tirs
  projectile?: string;  // couleur du tir
  description: string;
}

export const ENEMIES: EnemyDef[] = [
  // --- Étage 1 : les Caves humides ------------------------------------------
  {
    id: "rat", name: "Rat géant", hp: 8, atk: 4, def: 0, agi: 10, xp: 4, gold: [0, 3], floors: [1, 2],
    behavior: "melee", speed: 1, description: "Gros comme un chien, poli comme un rat.",
  },
  {
    id: "gelee", name: "Gelée verte", hp: 16, atk: 4, def: 1, agi: 0, xp: 6, gold: [0, 5], floors: [1, 2],
    behavior: "melee", speed: 0.5, power: "poison", description: "Lente, collante, et franchement toxique.",
  },
  {
    id: "chauve_souris", name: "Chauve-souris", hp: 6, atk: 3, def: 0, agi: 30, xp: 4, gold: [0, 0], floors: [1, 2],
    behavior: "erratic", speed: 2, description: "Rapide et imprévisible. Agaçante surtout.",
  },
  {
    id: "gobelin_voleur", name: "Gobelin chapardeur", hp: 11, atk: 4, def: 1, agi: 20, xp: 7, gold: [3, 10], floors: [1, 2, 3],
    behavior: "thief", speed: 1, description: "Il ne veut pas te tuer. Il veut ta bourse.",
  },

  // --- Étage 2 : les Catacombes -----------------------------------------------
  {
    id: "squelette", name: "Squelette", hp: 16, atk: 5, def: 2, agi: 8, xp: 10, gold: [2, 8], floors: [2, 3, 5],
    behavior: "melee", speed: 1, description: "Pas de muscles, pas de cerveau, beaucoup de rancune.",
  },
  {
    id: "archer_squelette", name: "Archer squelette", hp: 12, atk: 4, def: 1, agi: 12, xp: 12, gold: [3, 9], floors: [2, 3],
    behavior: "ranged", speed: 1, range: 6, projectile: "#e8e0c8", description: "Il vise mal. Mais il vise souvent.",
  },
  {
    id: "zombie", name: "Zombie", hp: 30, atk: 6, def: 1, agi: 0, xp: 14, gold: [0, 6], floors: [2, 3],
    behavior: "melee", speed: 0.5, power: "poison", description: "Lent. Très lent. Mais il ne s'arrête jamais.",
  },
  {
    id: "vampire", name: "Chauve-souris vampire", hp: 12, atk: 4, def: 0, agi: 30, xp: 11, gold: [0, 4], floors: [2, 3, 4],
    behavior: "erratic", speed: 2, power: "drain", description: "Elle boit ton sang pour reprendre des forces.",
  },

  // --- Étage 3 : la Forge engloutie --------------------------------------------
  {
    id: "diablotin", name: "Diablotin", hp: 16, atk: 6, def: 2, agi: 25, xp: 15, gold: [4, 12], floors: [3, 4],
    behavior: "erratic", speed: 2, power: "brulure", description: "Ricane en te brûlant les mollets.",
  },
  {
    id: "golem", name: "Golem de fer", hp: 50, atk: 10, def: 6, agi: 0, xp: 30, gold: [10, 25], floors: [3, 4, 5],
    behavior: "melee", speed: 0.5, description: "Une montagne de métal. Contourne-le, ou saute par-dessus.",
  },
  {
    id: "salamandre", name: "Salamandre", hp: 22, atk: 6, def: 2, agi: 15, xp: 18, gold: [5, 12], floors: [3, 4],
    behavior: "ranged", speed: 1, range: 5, projectile: "#ff7a1a", power: "brulure", description: "Crache du feu, puis rit. Elle trouve ça drôle.",
  },
  {
    id: "bombardier", name: "Gobelin bombardier", hp: 14, atk: 5, def: 1, agi: 15, xp: 14, gold: [5, 15], floors: [3, 4],
    behavior: "melee", speed: 1, power: "explose", description: "Il porte un tonneau de poudre. Ne le tue pas au corps à corps… ou si, mais recule.",
  },

  // --- Étage 4 : la Bibliothèque interdite ---------------------------------------
  {
    id: "livre_mordeur", name: "Livre mordeur", hp: 20, atk: 8, def: 2, agi: 20, xp: 20, gold: [4, 10], floors: [4, 5],
    behavior: "erratic", speed: 2, description: "Une édition originale, très, très mordante.",
  },
  {
    id: "spectre", name: "Spectre", hp: 26, atk: 8, def: 3, agi: 40, xp: 26, gold: [6, 16], floors: [4, 5],
    behavior: "melee", speed: 1, power: "gel", description: "Ton épée passe à travers une fois sur deux. Son toucher glace.",
  },
  {
    id: "mage_noir", name: "Mage noir", hp: 24, atk: 9, def: 2, agi: 15, xp: 30, gold: [12, 25], floors: [4, 5],
    behavior: "ranged", speed: 1, range: 6, projectile: "#b48cff", power: "blink", description: "Il se téléporte et tire des éclairs violets. Insupportable.",
  },

  // --- Étage 5 : le Trône de la liche --------------------------------------------
  {
    id: "chevalier_maudit", name: "Chevalier maudit", hp: 45, atk: 12, def: 6, agi: 10, xp: 40, gold: [15, 30], floors: [5],
    behavior: "melee", speed: 1, power: "regen", description: "Il a juré fidélité à la liche. Il le regrette, mais un serment est un serment.",
  },

  // --- Hors bestiaire : PNJ qui deviennent hostiles, boss --------------------------------
  {
    id: "brutus", name: "Brutus", hp: 55, atk: 9, def: 5, agi: 5, xp: 60, gold: [40, 60], floors: [],
    behavior: "melee", speed: 1, description: "Le garde de l'escalier. Tu l'as vexé.",
  },
  {
    id: "liche", name: "Morgrath, la liche", hp: 120, atk: 12, def: 5, agi: 10, xp: 0, gold: [0, 0], floors: [],
    behavior: "boss", speed: 1, range: 7, projectile: "#7cff6b", power: "invoque",
    description: "Le maître du donjon. Il t'observe depuis le début.",
  },
];

export const ENEMY_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

export function enemyDef(id: string): EnemyDef {
  const def = ENEMY_BY_ID.get(id);
  if (!def) throw new Error(`Ennemi inconnu : ${id}`);
  return def;
}
