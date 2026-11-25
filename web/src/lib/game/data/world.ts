/**
 * Les cinq étages et les personnages qui y vivent.
 * Les personnalités complètes des PNJ (ce que Claude reçoit) sont côté serveur,
 * dans src/game/npcs.ts : ici, seulement ce que l'interface affiche.
 */
export type NpcId = "claude" | "grizzle" | "osvald" | "brutus" | "sphinx" | "morgrath";

export interface FloorDef {
  level: number;
  name: string;
  intro: string;
  vision: number;        // rayon de vision de base
  enemies: number;       // nombre d'ennemis au départ
  traps: number;
  npcs: NpcId[];         // personnages de l'étage
  elites: number;        // ennemis d'élite (plus forts, butin garanti)
  thieves: number;       // gobelins chapardeurs au plus (au-delà, l'étage devient une loterie)
  palette: {
    floor: string;
    floorAlt: string;
    wall: string;
    wallTop: string;
    accent: string;      // petits détails (mousse, braises, livres…)
  };
}

export const FLOORS: FloorDef[] = [
  {
    level: 1, name: "Les Caves humides", vision: 7, enemies: 10, traps: 2, elites: 1, thieves: 1, npcs: ["claude", "grizzle"],
    intro: "Ça sent le moisi et la mauvaise affaire. Quelque part, un gobelin compte ses pièces.",
    palette: { floor: "#363441", floorAlt: "#3c3a48", wall: "#4f4760", wallTop: "#7a6f92", accent: "#3f6b4a" },
  },
  {
    level: 2, name: "Les Catacombes", vision: 6, enemies: 12, traps: 4, elites: 1, thieves: 1, npcs: ["osvald"],
    intro: "Des os partout. Certains bougent encore. L'un d'eux soupire.",
    palette: { floor: "#38332c", floorAlt: "#3e3830", wall: "#5e5443", wallTop: "#8c7f64", accent: "#e8e0c8" },
  },
  {
    level: 3, name: "La Forge engloutie", vision: 7, enemies: 13, traps: 5, elites: 2, thieves: 1, npcs: ["grizzle", "brutus"],
    intro: "La chaleur te gifle. Grizzle a rouvert boutique ici, et l'escalier est gardé par une armoire à glace en armure.",
    palette: { floor: "#3b2c28", floorAlt: "#43312c", wall: "#663a2d", wallTop: "#9c5436", accent: "#ff7a1a" },
  },
  {
    level: 4, name: "La Bibliothèque interdite", vision: 6, enemies: 14, traps: 6, elites: 2, thieves: 0, npcs: ["sphinx"],
    intro: "Des livres chuchotent dans le noir. Un sphinx t'attend avec une question.",
    palette: { floor: "#2d2943", floorAlt: "#332e4b", wall: "#453b6c", wallTop: "#6858a0", accent: "#b48cff" },
  },
  {
    level: 5, name: "Le Trône de la liche", vision: 6, enemies: 11, traps: 6, elites: 2, thieves: 0, npcs: ["morgrath"],
    intro: "Le froid te glace les os. Au fond, sur un trône, quelqu'un t'attend depuis le début.",
    palette: { floor: "#24302c", floorAlt: "#293631", wall: "#35544a", wallTop: "#4f7e6c", accent: "#7cff6b" },
  },
];

/** Une réponse toute prête du guide : gratuite, sans appel à l'IA. */
export interface QuickAnswer {
  label: string;
  text: string;
}

export interface NpcInfo {
  id: NpcId;
  name: string;
  title: string;
  greeting: string;      // première réplique, sans appel à l'IA
  placeholder: string;   // aide dans le champ de saisie
  maxTalks: number;      // répliques de l'IA par partie
  tired: string;         // ce qu'il dit quand il n'a plus envie de parler
  offline: string;       // ce qu'il dit si l'IA ne répond pas
  quick?: QuickAnswer[];
}

export const NPCS: Record<NpcId, NpcInfo> = {
  claude: {
    id: "claude", name: "Claude", title: "Guide du donjon",
    greeting: "Salut, traceur ! Je suis Claude, le guide de ce donjon. Je peux t'expliquer les règles, les commandes, ou te donner un conseil. Clique sur un sujet, ou pose-moi ta question.",
    placeholder: "Pose ta question : le saut, les élites, Brutus…",
    maxTalks: 10,
    tired: "Je t'ai tout dit ! Le reste, tu l'apprendras en bas. Bonne descente.",
    offline: "Claude te fait un signe de la main : les réponses rapides ci-dessous marchent toujours.",
    quick: [
      {
        label: "Les commandes",
        text: "Flèches, ZQSD ou WASD pour bouger, et fonce dans un ennemi pour l'attaquer. Diagonales : pavé numérique, ou clique sur le donjon. Espace puis une direction (ou Maj + direction) : saut de 2 cases. Entrée ou E : parler, descendre l'escalier. 1 à 9 : utiliser un objet du sac. R : attendre. M : minicarte. F : grand écran, pour voir plus loin. Et un clic sur une case déjà vue t'y emmène tout seul.",
      },
      {
        label: "Les règles",
        text: "Cinq étages, et Morgrath la liche tout en bas. C'est du tour par tour : rien ne bouge tant que tu ne bouges pas. Les ennemis marqués d'une couronne sont des élites, plus costauds mais avec un butin garanti. Les PV remontent doucement quand aucun ennemi n'est en vue. Les personnages avec une bulle blanche « ! » te répondent vraiment : écris-leur ce que tu veux. Ta partie est sauvegardée à chaque tour.",
      },
      {
        label: "L'attaque sournoise",
        text: "Tu peux passer en diagonale même au coin d'un mur, comme un vrai traceur. Les monstres, eux, ne savent pas frapper par-dessus un angle. Frappe-les depuis un coin, ou pendant qu'ils dorment : c'est une attaque sournoise, impossible à esquiver, avec 60 % de dégâts en plus.",
      },
      {
        label: "Un conseil",
        text: "Ne te jette pas sur tout ce qui bouge. Attire les monstres dans un couloir, frappe depuis les coins, saute par-dessus les gros lents. Garde tes potions pour les élites, et de l'or pour Grizzle : il rouvre boutique au troisième étage, avec de meilleures pièces. Et si un gobelin te vole, cours-lui après : ta bourse le ralentit.",
      },
    ],
  },
  grizzle: {
    id: "grizzle", name: "Grizzle", title: "Marchand gobelin",
    greeting: "Ah ! Un client ! Ou un voleur. Dans les deux cas, regarde, mais touche avec les yeux. Tout est à vendre, sauf mon respect.",
    placeholder: "Marchande, flatte-le, menace-le, raconte-lui ta vie…",
    maxTalks: 8,
    tired: "Bon. Tu achètes ou tu dégages ? J'ai d'autres clients. Enfin, j'en aurai.",
    offline: "Grizzle compte ses pièces et fait semblant de ne pas t'entendre. Ses prix restent ce qu'ils sont.",
  },
  osvald: {
    id: "osvald", name: "Osvald", title: "Squelette déprimé",
    greeting: "Oh… un vivant. Ne fais pas attention à moi. Ça fait trois cents ans que personne ne fait attention à moi, de toute façon…",
    placeholder: "Remonte-lui le moral : blague, compliment, conseil…",
    maxTalks: 7,
    tired: "Merci d'avoir parlé avec moi… Je crois que je vais méditer un peu. Enfin, comme peut méditer un tas d'os.",
    offline: "Osvald soupire longuement et fixe le mur. Il n'a pas l'air d'entendre.",
  },
  brutus: {
    id: "brutus", name: "Brutus", title: "Garde de l'escalier",
    greeting: "HALTE. Personne ne descend. Ordre de la liche. Sauf si tu as une très, TRÈS bonne raison. Ou de l'or.",
    placeholder: "Convaincs-le de te laisser passer…",
    maxTalks: 6,
    tired: "J'en ai assez entendu. Tu paies, tu te bats, ou tu fais demi-tour.",
    offline: "Brutus croise les bras et ne dit rien. Il reste deux options : payer ou se battre.",
  },
  sphinx: {
    id: "sphinx", name: "La Sphinge", title: "Gardienne du savoir",
    greeting: "Mortel. Réponds à mon énigme et tu seras récompensé. Trompe-toi trois fois, et tu le regretteras.",
    placeholder: "Ta réponse à l'énigme…",
    maxTalks: 6,
    tired: "Le temps des énigmes est passé. Va, mortel.",
    offline: "La Sphinge s'est assoupie. Tu passes ton chemin sur la pointe des pieds.",
  },
  morgrath: {
    id: "morgrath", name: "Morgrath", title: "La liche, maître du donjon",
    greeting: "Te voilà enfin. J'ai suivi chacun de tes pas depuis les caves. Avant que je t'écrase… as-tu quelque chose à dire ?",
    placeholder: "Tes derniers mots avant le combat…",
    maxTalks: 4,
    tired: "Assez parlé. Que le combat commence !",
    offline: "Morgrath lève son bâton. Les mots sont inutiles : le combat commence.",
  },
};
