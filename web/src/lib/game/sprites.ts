/**
 * Tout le pixel art du jeu, écrit à la main en 8 × 8 : une lettre = une couleur.
 * Aucun fichier image : comme pour le visualiseur, le projet n'ajoute aucun asset.
 * Pour les objets, « x » et « X » sont des couleurs variables (une épée de givre
 * et une épée de feu partagent le même dessin).
 */
const PALETTE: Record<string, string> = {
  k: "#14101c", w: "#ffffff", s: "#f1c27d", S: "#c68e5a",
  b: "#0070c0", B: "#005a9c", t: "#49c0b2",
  r: "#e8434a", R: "#9e2430", g: "#7cd36b", G: "#3f8f3a",
  y: "#ffd23f", Y: "#c9971c", o: "#ff7a1a", p: "#d0b0ff", P: "#6a4bb0",
  n: "#9b6a3c", N: "#5e3d22", l: "#c9d1d9", d: "#6b7480", D: "#3b4150",
  c: "#9be7ff", e: "#e8e0c8", E: "#b8ae90", m: "#ff8fb8", C: "#d9774b",
};

export type SpriteRows = readonly string[];

export const SPRITES: Record<string, SpriteRows> = {
  // --- Le héros : un traceur en sweat bleu et écharpe turquoise ---------------------
  hero: [
    "..NNNN..",
    ".NNNNNN.",
    "..sksks.",
    "..ssss..",
    ".ttttBB.",
    "b.bbbb.b",
    "..bbbb..",
    "..D..D..",
  ],

  // --- Ennemis ---------------------------------------------------------------------
  rat: [
    "........",
    "........",
    "....dd..",
    "..ddddkd",
    ".ddddddm",
    "mdddddd.",
    "m.d..d..",
    "........",
  ],
  gelee: [
    "........",
    "........",
    "...gg...",
    "..gggg..",
    ".gkggkg.",
    ".gggggg.",
    "gGgggGgg",
    "GGGGGGGG",
  ],
  chauve_souris: [
    "........",
    "P......P",
    "PP.PP.PP",
    "PPPPPPPP",
    ".PPrPrP.",
    "..PPPP..",
    "...PP...",
    "........",
  ],
  gobelin_voleur: [
    "..NNNN..",
    ".NggggN.",
    "ggkggkgg",
    "..gggg..",
    ".NNNNN.l",
    "g.NNN.ld",
    "..NNN.d.",
    "..g..g..",
  ],
  squelette: [
    "..eeee..",
    ".eeeeee.",
    ".ekeeke.",
    "..eeee..",
    ".eeeeee.",
    "e.eEEe.e",
    "..e..e..",
    ".ee..ee.",
  ],
  archer_squelette: [
    ".eeee.n.",
    ".keek..n",
    ".eeee..n",
    "eeeeeeen",
    ".eEEe..n",
    ".eeee..n",
    ".e..e.n.",
    "ee..ee..",
  ],
  zombie: [
    "..GGGG..",
    ".GgggGG.",
    ".gkggkg.",
    "..gRgg..",
    ".nnnnggg",
    ".nnnn...",
    ".nNNn...",
    ".G..G...",
  ],
  vampire: [
    "........",
    "R......R",
    "RR.RR.RR",
    "RRRRRRRR",
    ".RRyRyR.",
    "..RRRR..",
    "...ww...",
    "........",
  ],
  diablotin: [
    ".y....y.",
    ".rrrrrr.",
    ".rkrrkr.",
    "..rwwr..",
    ".rrrrrr.",
    "r.rrrr.r",
    "..r..r.o",
    ".rr..rro",
  ],
  golem: [
    "..dddd..",
    ".dcddcd.",
    ".dddddd.",
    "dddddddd",
    "dDddddDd",
    "dD.dd.Dd",
    "..dddd..",
    ".DD..DD.",
  ],
  salamandre: [
    "........",
    "........",
    "....ooo.",
    "...okooy",
    "yoooooo.",
    ".oRoRo..",
    ".o.o.o..",
    "........",
  ],
  bombardier: [
    ".....y..",
    ".gg..k..",
    "gkgg.nn.",
    ".gg.nNnn",
    ".NNgnNnn",
    ".NN..nn.",
    ".g.g....",
    "........",
  ],
  livre_mordeur: [
    "........",
    "PPPrPPP.",
    "PeeeeeeP",
    "w.w.w.w.",
    ".w.w.w.w",
    "PeeeeeeP",
    "PPPPPPP.",
    "........",
  ],
  spectre: [
    "..llll..",
    ".llllll.",
    ".lkllkl.",
    ".llllll.",
    "lllkklll",
    "llllllll",
    "l.ll.ll.",
    "........",
  ],
  mage_noir: [
    "...PP...",
    "..PPPP..",
    ".PpkpkP.",
    ".PkkkkP.",
    "PPPPPP.p",
    ".PPPP..n",
    ".PPPP..n",
    "PPPPPP.n",
  ],
  chevalier_maudit: [
    "..DDDD..",
    ".DDDDDD.",
    ".DgDDgD.",
    "..DDDD.l",
    ".dDDDDdl",
    "d.DDDD.l",
    "..D..D..",
    ".DD..DD.",
  ],
  brutus: [
    ".dddd...",
    "dddddd.l",
    ".skssk.l",
    ".ssss.ll",
    "RRRRRRnl",
    "sRRRRRn.",
    ".RRRR...",
    ".NN.NN..",
  ],
  liche: [
    ".y.y.y..",
    ".yyyyy.g",
    ".egege.n",
    "..eee..n",
    "PPPPPPPn",
    ".PPPPP.n",
    ".PPPPP.n",
    "PPPPPPP.",
  ],

  // --- PNJ -----------------------------------------------------------------------------
  // Claude, le guide : capuche terracotta et lanterne
  claude: [
    "..CCCC..",
    ".CCCCCC.",
    ".CsksksC",
    "..ssss.N",
    ".CCCCCCN",
    "C.CCCC.y",
    "..CCCC.y",
    "..N..N..",
  ],
  grizzle: [
    "..YYYY..",
    "YYYYYYYY",
    ".gkggkg.",
    "gggmggg.",
    ".nnnnnn.",
    "gnnnnnny",
    ".nnnnnn.",
    "..g..g..",
  ],
  osvald: [
    "........",
    "..eeee..",
    ".eeeeee.",
    ".ekeeke.",
    ".ceeeee.",
    "..eeee..",
    ".eEEEEe.",
    ".eeeeee.",
  ],
  sphinx: [
    ".bybyb..",
    ".bsksb..",
    ".bsssb..",
    "..sss...",
    "..yyyyyy",
    ".yyyyyyy",
    ".yYyyyYy",
    ".Y.Y.Y.Y",
  ],

  // --- Décor -----------------------------------------------------------------------------
  stairs: [
    "llllllll",
    "kkkkkkkk",
    "..llllll",
    "..kkkkkk",
    "....llll",
    "....kkkk",
    "......ll",
    "......kk",
  ],
  chest: [
    "........",
    ".nnnnnn.",
    "nNNNNNNn",
    "nnnyynnn",
    "NNNyyNNN",
    "nnnnnnnn",
    "nNNNNNNn",
    "........",
  ],
  chest_open: [
    ".nnnnnn.",
    "nNNNNNNn",
    "nkkkkkkn",
    "nkykyykn",
    "nnnnnnnn",
    "nNNNNNNn",
    "nnnnnnnn",
    "........",
  ],
  gold: [
    "........",
    "........",
    "........",
    "...yy...",
    "..yYyy..",
    ".yyyYyy.",
    "yYyyyyYy",
    "........",
  ],
  trap: [
    "........",
    "..l...l.",
    ".lll.lll",
    "dddddddd",
    "...l...l",
    "..lll.ll",
    "dddddddd",
    "........",
  ],

  // --- Formes d'objets (x / X = couleurs variables) -------------------------------------
  shape_sword: [
    "......lx",
    ".....lxl",
    "....lxl.",
    ".X.lxl..",
    "..Xxl...",
    "..NX....",
    ".N..X...",
    "N.......",
  ],
  shape_axe: [
    "........",
    ".xx.....",
    "xxxx....",
    "xxxNN...",
    ".xx..N..",
    "......N.",
    ".......N",
    "........",
  ],
  shape_mace: [
    "........",
    ".x.x.x..",
    "..xxx...",
    ".xxxxx..",
    "..xxx...",
    ".x.N.x..",
    "...N....",
    "...N....",
  ],
  shape_armor: [
    "........",
    ".xX..Xx.",
    "xxxxxxxx",
    ".xxXXxx.",
    ".xxxxxx.",
    ".xxXXxx.",
    ".xxxxxx.",
    "........",
  ],
  shape_ring: [
    "........",
    "...xx...",
    "..XxxX..",
    ".X....X.",
    ".X....X.",
    ".X....X.",
    "..XXXX..",
    "........",
  ],
  shape_amulet: [
    ".X....X.",
    "..X..X..",
    "...XX...",
    "..xxxx..",
    ".xwxxxx.",
    ".xxxxxx.",
    "..xxxx..",
    "........",
  ],
  shape_lantern: [
    "...dd...",
    "..d..d..",
    ".dddddd.",
    ".dyyyyd.",
    ".dyoyyd.",
    ".dyyyyd.",
    ".dddddd.",
    "........",
  ],
  shape_shoes: [
    "........",
    "........",
    ".xx.....",
    ".xx..xx.",
    ".xxx.xx.",
    "XXXX.xxx",
    "....XXXX",
    "........",
  ],
  shape_potion: [
    "...NN...",
    "...ll...",
    "...ll...",
    "..lxxl..",
    ".lxxxxl.",
    ".lxwxxl.",
    ".lxxxxl.",
    "..llll..",
  ],
  shape_scroll: [
    "........",
    ".eeeeee.",
    "Eeeeeeee",
    ".edddee.",
    ".eeeeee.",
    ".eddxxe.",
    "eeeeeeeE",
    ".eeeeee.",
  ],
  shape_bread: [
    "........",
    "........",
    "..nnnn..",
    ".nYnYnn.",
    "nnnnnnnn",
    "NnnnnnnN",
    ".NNNNNN.",
    "........",
  ],
  shape_mushroom: [
    "........",
    "..cccc..",
    ".cwccwc.",
    "cccccccc",
    "...ee...",
    "...ee...",
    "..eeee..",
    "........",
  ],
};

/** Dessin et couleurs de chaque objet. */
const ITEM_LOOKS: Record<string, [shape: string, x: string, X?: string]> = {
  dague_rouillee: ["shape_sword", "#9b6a3c", "#6b7480"],
  epee_courte: ["shape_sword", "#c9d1d9", "#9b6a3c"],
  hache_bucheron: ["shape_axe", "#c9d1d9"],
  rapiere: ["shape_sword", "#ffffff", "#ffd23f"],
  masse_cloutee: ["shape_mace", "#6b7480"],
  lame_givre: ["shape_sword", "#9be7ff", "#49c0b2"],
  epee_flamboyante: ["shape_sword", "#ff7a1a", "#e8434a"],
  faux_vampirique: ["shape_sword", "#e8434a", "#6a4bb0"],
  excalibouse: ["shape_sword", "#ffd23f", "#0070c0"],
  tunique_cuir: ["shape_armor", "#9b6a3c", "#5e3d22"],
  cotte_mailles: ["shape_armor", "#c9d1d9", "#6b7480"],
  manteau_ombre: ["shape_armor", "#3b4150", "#6a4bb0"],
  cuirasse_forge: ["shape_armor", "#ff7a1a", "#9e2430"],
  armure_paladin: ["shape_armor", "#ffffff", "#ffd23f"],
  lanterne: ["shape_lantern", "#ffd23f"],
  anneau_vigueur: ["shape_ring", "#e8434a", "#ffd23f"],
  chaussures_traceur: ["shape_shoes", "#49c0b2", "#ffffff"],
  bague_epines: ["shape_ring", "#7cd36b", "#6b7480"],
  amulette_regen: ["shape_amulet", "#7cd36b", "#ffd23f"],
  amulette_osvald: ["shape_amulet", "#9be7ff", "#e8e0c8"],
  potion_soin: ["shape_potion", "#e8434a"],
  grande_potion: ["shape_potion", "#ff8fb8"],
  elixir_force: ["shape_potion", "#ff7a1a"],
  potion_pierre: ["shape_potion", "#6b7480"],
  potion_vivacite: ["shape_potion", "#49c0b2"],
  antidote: ["shape_potion", "#7cd36b"],
  potion_douteuse: ["shape_potion", "#b48cff"],
  parchemin_teleport: ["shape_scroll", "#b48cff"],
  parchemin_carte: ["shape_scroll", "#0070c0"],
  parchemin_feu: ["shape_scroll", "#ff7a1a"],
  parchemin_blizzard: ["shape_scroll", "#9be7ff"],
  pain_rassis: ["shape_bread", "#9b6a3c"],
  champignon_luisant: ["shape_mushroom", "#9be7ff"],
};

const cache = new Map<string, HTMLCanvasElement>();

/** Le sprite d'une entité ou d'un objet, pré-rendu dans un petit canvas 8 × 8. */
export function spriteCanvas(key: string): HTMLCanvasElement {
  const cached = cache.get(key);
  if (cached) return cached;

  let rows = SPRITES[key];
  let x = "#ff00ff";
  let X = "#ff00ff";
  const look = ITEM_LOOKS[key];
  if (look) {
    rows = SPRITES[look[0]];
    x = look[1];
    X = look[2] ?? look[1];
  }
  rows ??= SPRITES.shape_potion;

  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, py) => {
    [...row].forEach((ch, px) => {
      if (ch === ".") return;
      ctx.fillStyle = ch === "x" ? x : ch === "X" ? X : PALETTE[ch] ?? "#ff00ff";
      ctx.fillRect(px, py, 1, 1);
    });
  });
  cache.set(key, canvas);
  return canvas;
}

const urls = new Map<string, string>();

/** Le même sprite en image (data URL) pour l'inventaire et les dialogues en HTML. */
export function spriteUrl(key: string, size = 32): string {
  const id = `${key}@${size}`;
  const cached = urls.get(id);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteCanvas(key), 0, 0, size, size);
  const url = canvas.toDataURL();
  urls.set(id, url);
  return url;
}
