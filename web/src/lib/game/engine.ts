/**
 * Le moteur du jeu, sans aucune dépendance au DOM ni à Vue : de l'état, des règles, des tours.
 *
 * Un tour = une action du héros (bouger, frapper, sauter, boire…), puis chaque ennemi agit.
 * Les PNJ parlent grâce à Claude, mais ils ne touchent jamais l'état directement :
 * ils proposent une action (applyNpcAction), et c'est ce moteur qui la borne et l'applique.
 */
import {
  center, distanceMap, FLOOR, generateMap, H, idx, inBounds, NEIGHBORS, W, WALL,
  type Point, type Room,
} from "./dungeon";
import { chance, int, pick, random, shuffle, weighted, type RngState } from "./rng";
import { ENEMIES, enemyDef, type EnemyDef } from "./data/enemies";
import { ITEMS, itemDef, isEquipment, slotOf, type ItemDef, type Rarity, type Slot, type Special } from "./data/items";
import { FLOORS, NPCS, type NpcId } from "./data/world";

export const LAST_FLOOR = FLOORS.length;
export const INVENTORY_SIZE = 12;
export const JUMP_COOLDOWN = 6;
export const BRUTUS_TOLL = 80;

// --- Types ---------------------------------------------------------------------

export interface ItemInstance {
  uid: number;
  id: string;
}

export interface Status {
  poison: number;   // tours restants
  brulure: number;
  gel: number;
}

export interface Buff {
  stat: "atk" | "def" | "agi" | "vision";
  amount: number;
  turns: number;
  label: string;
}

export interface Hero {
  name: string;
  x: number;
  y: number;
  level: number;
  xp: number;
  hp: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseAgi: number;
  gold: number;
  inventory: ItemInstance[];
  equipment: Record<Slot, ItemInstance | null>;
  buffs: Buff[];
  status: Status;
  jumpCd: number;
}

export interface Enemy {
  uid: number;
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
  status: Status;
  awake: boolean;
  stunned: number;
  stolen: number;      // or volé (gobelin)
  fleeTurns: number;
  cooldown: number;    // invocations, téléportations
  summoned?: boolean;
  elite?: boolean;
}

export interface Npc {
  id: NpcId;
  x: number;
  y: number;
}

export interface Chest {
  x: number;
  y: number;
  opened: boolean;
}

export interface Trap {
  x: number;
  y: number;
  found: boolean;
}

export type Tone = "info" | "good" | "bad" | "loot" | "npc" | "level" | "rare";

export interface LogEntry {
  id: number;
  text: string;
  tone: Tone;
}

/** Effets visuels à jouer par le rendu (chiffres de dégâts, tirs, éclairs). */
export type Fx =
  | { kind: "text"; x: number; y: number; text: string; color: string }
  | { kind: "bolt"; x: number; y: number; tx: number; ty: number; color: string }
  | { kind: "flash"; x: number; y: number; color: string; radius: number }
  | { kind: "shake" };

export interface NpcMemory {
  talks: number;
  remise: number;      // Grizzle : remise en %, négative = prix gonflés
  moral: number;       // Osvald : de 0 à 5
  giftGiven: boolean;
  tries: number;       // Sphinge : mauvaises réponses
  riddle: number;      // Sphinge : numéro de l'énigme
  done: boolean;       // plus rien à dire
}

export interface ShopSlot {
  item: ItemInstance;
  sold: boolean;
}

export type GameStatus = "playing" | "dead" | "won";

export interface GameState extends RngState {
  seed: number;
  floor: number;
  tiles: Uint8Array;
  explored: Uint8Array;
  visible: Uint8Array;
  rooms: Room[];
  exitRoom: number;
  stairs: Point;
  stairsLocked: boolean;
  hero: Hero;
  enemies: Enemy[];
  npcs: Npc[];
  items: { x: number; y: number; item: ItemInstance }[];
  golds: { x: number; y: number; amount: number }[];
  chests: Chest[];
  traps: Trap[];
  shop: ShopSlot[];
  memory: Record<NpcId, NpcMemory>;
  turn: number;
  status: GameStatus;
  log: LogEntry[];
  chronicle: string[];
  kills: Record<string, number>;
  stats: { damageDealt: number; damageTaken: number; jumps: number; potions: number; chests: number; goldEarned: number; sneaks: number; elites: number };
  fx: Fx[];
  bossMet: boolean;
  nextId: number;
}

export type Command =
  | { type: "move"; dx: number; dy: number }
  | { type: "jump"; dx: number; dy: number }
  | { type: "wait" }
  | { type: "descend" }
  | { type: "use"; index: number }
  | { type: "drop"; index: number }
  | { type: "unequip"; slot: Slot };

/** Ce que l'interface doit faire après une action (ouvrir un dialogue…). */
export interface ActResult {
  talk?: NpcId;
  newFloor?: boolean;
}

/** Actions qu'un PNJ (piloté par Claude) peut demander. Le moteur décide de leur effet réel. */
export type NpcAction =
  | { type: "prix"; remise: number }
  | { type: "cadeau"; objet: string }
  | { type: "chasser" }
  | { type: "moral"; delta: number }
  | { type: "passer" }
  | { type: "attaquer" }
  | { type: "juger"; correcte: boolean }
  | { type: "combat"; humeur: "respect" | "mepris" | "amusement" | "neutre" };

// --- Création ----------------------------------------------------------------------

const noStatus = (): Status => ({ poison: 0, brulure: 0, gel: 0 });

const freshMemory = (): NpcMemory => ({ talks: 0, remise: 0, moral: 0, giftGiven: false, tries: 0, riddle: 0, done: false });

export function createGame(seed: number, heroName: string): GameState {
  const state: GameState = {
    seed,
    rng: seed,
    floor: 0,
    tiles: new Uint8Array(W * H),
    explored: new Uint8Array(W * H),
    visible: new Uint8Array(W * H),
    rooms: [],
    exitRoom: 0,
    stairs: { x: 0, y: 0 },
    stairsLocked: false,
    hero: {
      name: heroName.trim().slice(0, 20) || "Traceur",
      x: 0, y: 0, level: 1, xp: 0,
      hp: 34, baseHp: 34, baseAtk: 4, baseDef: 1, baseAgi: 8,
      gold: 15,
      inventory: [],
      equipment: { arme: null, armure: null, bijou: null },
      buffs: [], status: noStatus(), jumpCd: 0,
    },
    enemies: [], npcs: [], items: [], golds: [], chests: [], traps: [], shop: [],
    memory: { claude: freshMemory(), grizzle: freshMemory(), osvald: freshMemory(), brutus: freshMemory(), sphinx: freshMemory(), morgrath: freshMemory() },
    turn: 0,
    status: "playing",
    log: [],
    chronicle: [],
    kills: {},
    stats: { damageDealt: 0, damageTaken: 0, jumps: 0, potions: 0, chests: 0, goldEarned: 0, sneaks: 0, elites: 0 },
    fx: [],
    bossMet: false,
    nextId: 1,
  };

  // Paquetage de départ
  state.hero.equipment.arme = newItem(state, "dague_rouillee");
  addToInventory(state, newItem(state, "potion_soin"));
  addToInventory(state, newItem(state, "pain_rassis"));

  state.memory.sphinx.riddle = int(state, 0, 7);
  enterFloor(state, 1);
  return state;
}

function newItem(state: GameState, id: string): ItemInstance {
  return { uid: state.nextId++, id };
}

function log(state: GameState, text: string, tone: Tone = "info") {
  state.log.push({ id: state.nextId++, text, tone });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

function remember(state: GameState, line: string) {
  if (!state.chronicle.includes(line)) state.chronicle.push(line);
}

function randomFloorIn(state: GameState, room: Room, margin = 0): Point {
  return {
    x: int(state, room.x + margin, room.x + room.w - 1 - margin),
    y: int(state, room.y + margin, room.y + room.h - 1 - margin),
  };
}

/** Case libre : sol, sans héros, ennemi, PNJ, coffre ni escalier. */
export function isFree(state: GameState, x: number, y: number): boolean {
  if (!inBounds(x, y) || state.tiles[idx(x, y)] !== FLOOR) return false;
  if (state.hero.x === x && state.hero.y === y) return false;
  if (enemyAt(state, x, y) || npcAt(state, x, y)) return false;
  if (state.chests.some((c) => c.x === x && c.y === y)) return false;
  return true;
}

/** Case où un ennemi peut marcher (l'escalier compris). */
function canEnter(state: GameState, x: number, y: number): boolean {
  if (!inBounds(x, y) || state.tiles[idx(x, y)] === WALL) return false;
  if (state.hero.x === x && state.hero.y === y) return false;
  return !enemyAt(state, x, y) && !npcAt(state, x, y) && !state.chests.some((c) => c.x === x && c.y === y);
}

function freeSpot(state: GameState, room: Room, margin = 0): Point | null {
  for (let i = 0; i < 40; i++) {
    const p = randomFloorIn(state, room, margin);
    if (isFree(state, p.x, p.y) && !state.items.some((it) => it.x === p.x && it.y === p.y)) return p;
  }
  return null;
}

/** Objet aléatoire adapté à l'étage. `boost` décale la rareté vers le haut (coffres). */
export function rollItem(state: GameState, floor: number, boost = 0): ItemInstance {
  const rarity = weighted<Rarity>(state, [
    ["commun", Math.max(10, 60 - floor * 8 - boost * 20)],
    ["rare", 30 + floor * 2],
    ["epique", Math.max(0, floor * 4 - 4 + boost * 10)],
    ["legendaire", Math.max(0, floor * 2 - 5 + boost * 4)],
  ]);
  let pool = ITEMS.filter((i) => !i.noDrop && i.rarity === rarity && i.minFloor <= floor);
  if (!pool.length) pool = ITEMS.filter((i) => !i.noDrop && i.minFloor <= floor && i.rarity !== "legendaire");
  return newItem(state, pick(state, pool).id);
}

function spawnEnemy(state: GameState, def: EnemyDef, x: number, y: number, summoned = false): Enemy {
  // Un peu plus coriace à chaque étage, pour suivre la progression du héros
  const scale = 1 + (state.floor - Math.min(...(def.floors.length ? def.floors : [state.floor]))) * 0.12;
  const enemy: Enemy = {
    uid: state.nextId++, id: def.id, name: def.name, x, y,
    hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale),
    atk: Math.round(def.atk * scale), def: def.def, agi: def.agi,
    status: noStatus(), awake: false, stunned: 0, stolen: 0, fleeTurns: 0, cooldown: 3,
    summoned,
  };
  state.enemies.push(enemy);
  return enemy;
}

function enterFloor(state: GameState, level: number) {
  const floorDef = FLOORS[level - 1];
  const final = level === LAST_FLOOR;
  const map = generateMap(state, level, final);

  state.floor = level;
  state.tiles = map.tiles;
  state.rooms = map.rooms;
  state.exitRoom = map.exitRoom;
  state.stairs = map.stairs;
  state.stairsLocked = false;
  state.explored = new Uint8Array(W * H);
  state.visible = new Uint8Array(W * H);
  state.enemies = [];
  state.npcs = [];
  state.items = [];
  state.golds = [];
  state.chests = [];
  state.traps = [];
  state.hero.x = map.start.x;
  state.hero.y = map.start.y;
  state.bossMet = false;

  const others = map.rooms.map((_, i) => i).filter((i) => i !== map.startRoom && i !== map.exitRoom);
  const exit = map.rooms[map.exitRoom];

  // Les personnages de l'étage
  for (const id of floorDef.npcs) {
    let spot: Point | null = null;
    if (id === "claude") {
      // Le guide attend juste à côté de l'entrée
      for (const [dx, dy] of NEIGHBORS) {
        if (isFree(state, map.start.x + dx * 2, map.start.y + dy) ) {
          spot = { x: map.start.x + dx * 2, y: map.start.y + dy };
          break;
        }
      }
    } else if (id === "brutus") {
      // Brutus se poste juste à côté de l'escalier
      for (const [dx, dy] of NEIGHBORS) {
        if (isFree(state, map.stairs.x + dx, map.stairs.y + dy)) {
          spot = { x: map.stairs.x + dx, y: map.stairs.y + dy };
          break;
        }
      }
      state.stairsLocked = true;
    } else if (id === "morgrath") {
      spot = { x: exit.x + exit.w - 3, y: center(exit).y };
    } else {
      const used = new Set(state.npcs.map((n) => state.rooms.findIndex((r) => n.x >= r.x && n.x < r.x + r.w && n.y >= r.y && n.y < r.y + r.h)));
      const free = others.filter((i) => !used.has(i));
      const room = map.rooms[free[Math.floor(free.length / 2)] ?? map.exitRoom];
      spot = isFree(state, center(room).x, center(room).y) ? center(room) : freeSpot(state, room, 1);
    }
    if (spot) state.npcs.push({ id, x: spot.x, y: spot.y });
    if (id === "grizzle") {
      buildShop(state, level);
      // Nouvel étage, nouvelle conversation (mais il se souvient de ses prix… et de toi)
      state.memory.grizzle.talks = 0;
    }
  }

  // Ennemis : jamais dans la salle de départ, ni dans la salle du trône
  const pool = ENEMIES.filter((e) => e.floors.includes(level));
  for (let n = 0; n < floorDef.enemies; n++) {
    const room = map.rooms[pick(state, others.length ? others : [map.exitRoom])];
    const p = freeSpot(state, room);
    if (p) spawnEnemy(state, pick(state, pool), p.x, p.y);
  }
  if (final) {
    // Deux chevaliers montent la garde devant le trône
    for (let n = 0; n < 2; n++) {
      const p = freeSpot(state, exit, 1);
      if (p && p.x < exit.x + exit.w - 4) spawnEnemy(state, enemyDef("chevalier_maudit"), p.x, p.y);
    }
  }
  // Les élites : plus coriaces, plus dangereux, butin garanti
  for (const enemy of shuffle(state, state.enemies.filter((e) => e.id !== "chauve_souris")).slice(0, floorDef.elites)) {
    enemy.elite = true;
    enemy.name = `${enemy.name} d'élite`;
    enemy.maxHp = enemy.hp = Math.round(enemy.maxHp * 1.7);
    enemy.atk += 2 + Math.floor(level / 2);
    enemy.def += 1;
  }

  // Coffres, objets, or, pièges : peu d'objets, mais qui comptent
  const lootRooms = shuffle(state, [...others]);
  for (let n = 0; n < 2 && n < lootRooms.length; n++) {
    const p = freeSpot(state, map.rooms[lootRooms[n]], 1) ?? freeSpot(state, map.rooms[lootRooms[n]]);
    if (p) state.chests.push({ x: p.x, y: p.y, opened: false });
  }
  for (let n = 0; n < int(state, 1, 2); n++) {
    const p = freeSpot(state, map.rooms[pick(state, others.length ? others : [map.startRoom])]);
    if (p) state.items.push({ x: p.x, y: p.y, item: rollItem(state, level) });
  }
  for (let n = 0; n < 4; n++) {
    const p = freeSpot(state, map.rooms[pick(state, map.rooms.map((_, i) => i))]);
    if (p) state.golds.push({ x: p.x, y: p.y, amount: int(state, 4, 9) + level * 4 });
  }
  for (let n = 0; n < floorDef.traps; n++) {
    const p = freeSpot(state, map.rooms[pick(state, others.length ? others : [map.exitRoom])]);
    if (p) state.traps.push({ x: p.x, y: p.y, found: false });
  }

  computeFov(state);
  log(state, `Étage ${level} : ${floorDef.name}. ${floorDef.intro}`, "rare");
}

function buildShop(state: GameState, floor: number) {
  // Étage 1 : du commun et du rare. Étage 3 : du rare, de l'épique, et une pièce de légende hors de prix
  const top = floor >= 3;
  const ids = new Set<string>(["potion_soin"]);
  if (top) ids.add("grande_potion");
  const candidates = shuffle(
    state,
    ITEMS.filter((i) => !i.noDrop && i.kind !== "nourriture" && (top
      ? (i.rarity === "rare" || i.rarity === "epique") && i.minFloor <= 4
      : (i.rarity === "commun" || i.rarity === "rare") && i.minFloor <= 2)),
  );
  for (const c of candidates) {
    if (ids.size >= 6) break;
    ids.add(c.id);
  }
  if (top) ids.add(pick(state, ITEMS.filter((i) => i.rarity === "legendaire")).id);
  else if (![...ids].some((id) => itemDef(id).rarity === "rare")) ids.add("anneau_vigueur");
  state.shop = [...ids].map((id) => ({ item: newItem(state, id), sold: false }));
}

// --- Calculs -------------------------------------------------------------------------

export interface HeroStats {
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
  vision: number;
  specials: Set<Special>;
}

export function heroStats(state: GameState): HeroStats {
  const h = state.hero;
  const s: HeroStats = {
    maxHp: h.baseHp, atk: h.baseAtk, def: h.baseDef, agi: h.baseAgi,
    vision: FLOORS[state.floor - 1]?.vision ?? 7,
    specials: new Set(),
  };
  for (const item of Object.values(h.equipment)) {
    if (!item) continue;
    const def = itemDef(item.id);
    for (const [k, v] of Object.entries(def.bonus ?? {})) s[k as keyof Omit<HeroStats, "specials">] += v ?? 0;
    if (def.special) s.specials.add(def.special);
  }
  for (const b of h.buffs) s[b.stat] += b.amount;
  s.agi = Math.max(0, s.agi);
  return s;
}

export function xpToNext(level: number): number {
  return 10 + level * level * 5;
}

export function shopPrice(state: GameState, def: ItemDef): number {
  return Math.max(1, Math.round(def.price * (1 - state.memory.grizzle.remise / 100)));
}

export function sellPrice(def: ItemDef): number {
  return Math.max(1, Math.floor(def.price * 0.4));
}

export const enemyAt = (s: GameState, x: number, y: number) => s.enemies.find((e) => e.x === x && e.y === y);
export const npcAt = (s: GameState, x: number, y: number) => s.npcs.find((n) => n.x === x && n.y === y);
const dist = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Ligne de vue : aucune case de mur entre les deux points (algorithme de Bresenham). */
export function lineOfSight(tiles: Uint8Array, a: Point, b: Point): boolean {
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x === b.x && y === b.y) return true;
    if ((x !== a.x || y !== a.y) && tiles[idx(x, y)] === WALL) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

export function computeFov(state: GameState) {
  const { hero } = state;
  const radius = heroStats(state).vision;
  state.visible.fill(0);
  for (let y = hero.y - radius; y <= hero.y + radius; y++) {
    for (let x = hero.x - radius; x <= hero.x + radius; x++) {
      if (!inBounds(x, y)) continue;
      const dx = x - hero.x;
      const dy = y - hero.y;
      if (dx * dx + dy * dy > radius * radius + radius) continue;
      if (lineOfSight(state.tiles, hero, { x, y })) {
        state.visible[idx(x, y)] = 1;
        state.explored[idx(x, y)] = 1;
      }
    }
  }
}

// --- Inventaire ----------------------------------------------------------------------

function addToInventory(state: GameState, item: ItemInstance): boolean {
  if (state.hero.inventory.length >= INVENTORY_SIZE) return false;
  state.hero.inventory.push(item);
  return true;
}

/** Donne un objet au héros, ou le pose à ses pieds si le sac est plein. */
function giveItem(state: GameState, item: ItemInstance) {
  const def = itemDef(item.id);
  if (addToInventory(state, item)) {
    log(state, `Tu obtiens : ${def.name}.`, def.rarity === "commun" ? "loot" : "rare");
  } else {
    state.items.push({ x: state.hero.x, y: state.hero.y, item });
    log(state, `Ton sac est plein : ${def.name} est posé à tes pieds.`, "bad");
  }
}

function clampHp(state: GameState) {
  const max = heroStats(state).maxHp;
  state.hero.hp = Math.min(state.hero.hp, max);
}

function heal(state: GameState, amount: number) {
  const before = state.hero.hp;
  state.hero.hp = Math.min(heroStats(state).maxHp, state.hero.hp + amount);
  const gained = state.hero.hp - before;
  if (gained > 0) state.fx.push({ kind: "text", x: state.hero.x, y: state.hero.y, text: `+${gained}`, color: "#7cff6b" });
  return gained;
}

function addBuff(state: GameState, buff: Buff) {
  const existing = state.hero.buffs.find((b) => b.label === buff.label);
  if (existing) existing.turns = Math.max(existing.turns, buff.turns);
  else state.hero.buffs.push(buff);
}

function equip(state: GameState, index: number) {
  const { hero } = state;
  const item = hero.inventory[index];
  const def = itemDef(item.id);
  const slot = slotOf(def);
  if (!slot) return;
  hero.inventory.splice(index, 1);
  const previous = hero.equipment[slot];
  hero.equipment[slot] = item;
  if (previous) hero.inventory.push(previous);
  clampHp(state);
  log(state, `Tu équipes : ${def.name}.`, "good");
  computeFov(state);
}

function useConsumable(state: GameState, index: number): boolean {
  const { hero } = state;
  const item = hero.inventory[index];
  const def = itemDef(item.id);
  const effect = def.use;
  if (!effect) return false;
  hero.inventory.splice(index, 1);
  state.stats.potions++;
  const visibleEnemies = state.enemies.filter((e) => state.visible[idx(e.x, e.y)]);

  switch (effect.type) {
    case "soin":
      log(state, `${def.name} : tu récupères ${heal(state, effect.amount)} PV.`, "good");
      break;
    case "buff":
      addBuff(state, { stat: effect.stat, amount: effect.amount, turns: effect.turns, label: def.name });
      log(state, `${def.name} : ${def.description}`, "good");
      break;
    case "antidote":
      hero.status.poison = 0;
      hero.status.brulure = 0;
      heal(state, 5);
      log(state, "L'antidote fait effet. Tu te sens propre comme un sou neuf.", "good");
      break;
    case "champignon":
      heal(state, 6);
      addBuff(state, { stat: "vision", amount: 3, turns: 40, label: "Champignon luisant" });
      computeFov(state);
      log(state, "Le champignon a un goût de terre… et soudain, tu vois dans le noir.", "good");
      break;
    case "teleport":
      teleportHero(state);
      log(state, "POUF. Tu es ailleurs.", "info");
      break;
    case "carte":
      for (let i = 0; i < state.tiles.length; i++) if (state.tiles[i] !== WALL) state.explored[i] = 1;
      state.traps.forEach((t) => (t.found = true));
      log(state, "La carte se dessine d'elle-même. Les pièges aussi apparaissent.", "good");
      break;
    case "boule_de_feu":
      if (!visibleEnemies.length) log(state, "La boule de feu illumine… une pièce vide. Quel gâchis.", "bad");
      for (const e of visibleEnemies) {
        state.fx.push({ kind: "flash", x: e.x, y: e.y, color: "#ff7a1a", radius: 1 });
        damageEnemy(state, e, effect.damage, "#ff7a1a");
      }
      if (visibleEnemies.length) log(state, `La boule de feu touche ${visibleEnemies.length} ennemi(s) !`, "good");
      break;
    case "blizzard":
      for (const e of visibleEnemies) {
        e.status.gel = effect.turns;
        state.fx.push({ kind: "flash", x: e.x, y: e.y, color: "#9be7ff", radius: 1 });
      }
      log(state, visibleEnemies.length ? `${visibleEnemies.length} ennemi(s) gelé(s) sur place.` : "Il neige. Sur personne.", "good");
      break;
    case "douteuse":
      drinkDubious(state);
      break;
  }
  return true;
}

function drinkDubious(state: GameState) {
  const outcome = weighted(state, [
    ["soin", 3], ["poison", 2], ["force", 2], ["vigueur", 1], ["teleport", 1], ["rien", 1], ["xp", 1],
  ] as const);
  const h = state.hero;
  switch (outcome) {
    case "soin": log(state, `Potion douteuse : délicieuse ! +${heal(state, 20)} PV.`, "good"); break;
    case "poison": h.status.poison = 6; log(state, "Potion douteuse : c'était bien du poison. L'étiquette avait raison.", "bad"); break;
    case "force": addBuff(state, { stat: "atk", amount: 4, turns: 25, label: "Potion douteuse" }); log(state, "Potion douteuse : tes muscles gonflent. +4 attaque !", "good"); break;
    case "vigueur": h.baseHp += 3; heal(state, 3); log(state, "Potion douteuse : +3 PV max, pour toujours. Chanceux.", "rare"); break;
    case "teleport": teleportHero(state); log(state, "Potion douteuse : le monde tourne… et tu es ailleurs.", "info"); break;
    case "xp": gainXp(state, 15); log(state, "Potion douteuse : une vision mystique. +15 XP.", "good"); break;
    default: log(state, "Potion douteuse : tu te sens… exactement pareil.", "info");
  }
}

function teleportHero(state: GameState) {
  for (let i = 0; i < 200; i++) {
    const room = pick(state, state.rooms);
    const p = randomFloorIn(state, room);
    if (isFree(state, p.x, p.y)) {
      state.hero.x = p.x;
      state.hero.y = p.y;
      break;
    }
  }
  computeFov(state);
}

// --- Combat -----------------------------------------------------------------------

function gainXp(state: GameState, amount: number) {
  const h = state.hero;
  h.xp += amount;
  while (h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++;
    h.baseHp += 7;
    h.baseAtk += 1;
    h.baseAgi += 1;
    if (h.level % 2 === 0) h.baseDef += 1;
    heal(state, Math.round(heroStats(state).maxHp * 0.35));
    state.fx.push({ kind: "flash", x: h.x, y: h.y, color: "#ffb627", radius: 2 });
    log(state, `NIVEAU ${h.level} ! +7 PV max, +1 attaque, +1 agilité${h.level % 2 === 0 ? ", +1 défense" : ""}.`, "level");
  }
}

function damageEnemy(state: GameState, enemy: Enemy, amount: number, color = "#ffffff") {
  enemy.hp -= amount;
  enemy.awake = true;
  state.stats.damageDealt += amount;
  state.fx.push({ kind: "text", x: enemy.x, y: enemy.y, text: `${amount}`, color });
  if (enemy.hp <= 0) killEnemy(state, enemy);
}

function killEnemy(state: GameState, enemy: Enemy) {
  const def = enemyDef(enemy.id);
  state.enemies = state.enemies.filter((e) => e !== enemy);
  state.kills[def.id] = (state.kills[def.id] ?? 0) + 1;
  const xp = enemy.elite ? def.xp * 2 : def.xp;
  log(state, `${enemy.name} est vaincu. +${xp} XP.`, enemy.elite ? "rare" : "good");
  gainXp(state, xp);

  const gold = int(state, def.gold[0], def.gold[1]) + enemy.stolen;
  if (gold > 0) state.golds.push({ x: enemy.x, y: enemy.y, amount: gold });
  if (enemy.elite) {
    state.stats.elites++;
    state.items.push({ x: enemy.x, y: enemy.y, item: rollItem(state, state.floor, 1) });
    remember(state, `A terrassé ${enemy.name} à l'étage ${state.floor}`);
  } else if (!enemy.summoned && chance(state, 0.07)) {
    state.items.push({ x: enemy.x, y: enemy.y, item: rollItem(state, state.floor) });
  }

  if (def.power === "explose") {
    state.fx.push({ kind: "flash", x: enemy.x, y: enemy.y, color: "#ff7a1a", radius: 2 });
    state.fx.push({ kind: "shake" });
    log(state, "Le tonneau explose !", "bad");
    if (dist(enemy, state.hero) <= 1) hurtHero(state, 3 + state.floor, "l'explosion");
    for (const other of [...state.enemies]) if (dist(enemy, other) <= 1) damageEnemy(state, other, 6, "#ff7a1a");
  }

  if (def.id === "brutus") {
    state.stairsLocked = false;
    remember(state, "A vaincu Brutus, le garde de l'escalier, en combat singulier");
    log(state, "Brutus s'effondre. L'escalier est libre.", "rare");
  }
  if (def.id === "liche") {
    state.status = "won";
    remember(state, "A vaincu Morgrath, la liche, et libéré le donjon");
    log(state, "Morgrath tombe en poussière. Le donjon se tait. Tu as gagné !", "level");
  }
  if (state.kills[def.id] === 1 && !enemy.summoned && def.floors.length) {
    remember(state, `A vaincu son premier ennemi de type « ${def.name} »`);
  }
}

/** Vrai si un mur occupe un des deux côtés d'un pas en diagonale (un « angle »). */
export function cutsCorner(tiles: Uint8Array, x: number, y: number, dx: number, dy: number): boolean {
  return !!dx && !!dy && (tiles[idx(x + dx, y)] === WALL || tiles[idx(x, y + dy)] === WALL);
}

function heroAttack(state: GameState, enemy: Enemy, fromCorner = false) {
  const s = heroStats(state);
  // Attaque sournoise : depuis un angle de mur, ou sur un ennemi qui ne t'a pas encore repéré
  const sneak = fromCorner || !enemy.awake;
  if (sneak) {
    const dmg = Math.ceil((Math.max(1, s.atk + int(state, 0, 2) - enemy.def)) * 1.6);
    state.stats.sneaks++;
    log(state, `Attaque sournoise sur ${enemy.name} : ${dmg} dégâts !`, "good");
    if (state.stats.sneaks === 5) remember(state, "Maîtrise l'attaque sournoise depuis les angles de mur");
    applyWeaponSpecials(state, enemy, dmg);
    damageEnemy(state, enemy, dmg, "#d0b0ff");
    return;
  }
  if (random(state) * 100 < Math.min(45, enemy.agi)) {
    state.fx.push({ kind: "text", x: enemy.x, y: enemy.y, text: "esquive", color: "#9aa5b1" });
    log(state, `${enemy.name} esquive ton coup.`);
    enemy.awake = true;
    return;
  }
  let dmg = Math.max(1, s.atk + int(state, -1, 2) - enemy.def);
  const crit = random(state) * 100 < Math.min(35, s.agi * 1.2);
  if (crit) dmg *= 2;
  if (enemy.stunned > 0) dmg += 2;
  log(state, `Tu frappes ${enemy.name} : ${dmg} dégâts${crit ? " (CRITIQUE !)" : ""}.`);
  applyWeaponSpecials(state, enemy, dmg);
  damageEnemy(state, enemy, dmg, crit ? "#ffb627" : "#ffffff");
}

function applyWeaponSpecials(state: GameState, enemy: Enemy, dmg: number) {
  const s = heroStats(state);
  if (s.specials.has("vampire")) heal(state, Math.max(1, Math.round(dmg * 0.25)));
  if (s.specials.has("gel") && chance(state, 0.2)) {
    enemy.status.gel = 2;
    log(state, `${enemy.name} est gelé !`, "good");
  }
  if (s.specials.has("brulure") && chance(state, 0.25)) {
    enemy.status.brulure = 3;
    log(state, `${enemy.name} prend feu !`, "good");
  }
}

function hurtHero(state: GameState, amount: number, source: string) {
  const h = state.hero;
  h.hp -= amount;
  state.stats.damageTaken += amount;
  state.fx.push({ kind: "text", x: h.x, y: h.y, text: `-${amount}`, color: "#ff5a5a" });
  if (h.hp <= 0 && state.status === "playing") {
    h.hp = 0;
    state.status = "dead";
    state.fx.push({ kind: "shake" });
    remember(state, `Est mort à l'étage ${state.floor}, tué par ${source}`);
    log(state, `Tu es tué par ${source}…`, "bad");
  }
}

function enemyAttack(state: GameState, enemy: Enemy, ranged = false) {
  const def = enemyDef(enemy.id);
  const s = heroStats(state);
  if (ranged) state.fx.push({ kind: "bolt", x: enemy.x, y: enemy.y, tx: state.hero.x, ty: state.hero.y, color: def.projectile ?? "#ffffff" });

  if (random(state) * 100 < Math.min(45, s.agi)) {
    state.fx.push({ kind: "text", x: state.hero.x, y: state.hero.y, text: "esquive", color: "#9aa5b1" });
    log(state, `Tu esquives ${ranged ? "le tir" : "l'attaque"} de ${enemy.name}.`);
    return;
  }
  const dmg = Math.max(1, enemy.atk + int(state, -1, 1) - s.def);
  log(state, `${enemy.name} ${ranged ? "te tire dessus" : "te frappe"} : ${dmg} dégâts.`, "bad");
  hurtHero(state, dmg, enemy.name);

  if (def.power === "poison" && chance(state, 0.35)) {
    state.hero.status.poison = Math.max(state.hero.status.poison, 5);
    log(state, "Tu es empoisonné !", "bad");
  }
  if (def.power === "brulure" && chance(state, 0.3)) {
    state.hero.status.brulure = Math.max(state.hero.status.brulure, 3);
    log(state, "Tu prends feu !", "bad");
  }
  if (def.power === "gel" && chance(state, 0.25)) {
    state.hero.status.gel = 1;
    log(state, "Un froid glacial te paralyse !", "bad");
  }
  if (def.power === "drain") {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.ceil(dmg / 2));
  }
  if (!ranged && s.specials.has("epines") && enemy.hp > 0) {
    damageEnemy(state, enemy, 2, "#49c0b2");
  }
}

// --- Tour des ennemis --------------------------------------------------------------

function stepToward(state: GameState, enemy: Enemy, toHero: Int16Array, away = false, force = false) {
  let best: Point | null = null;
  let bestScore = away ? -1 : Infinity;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = enemy.x + dx;
    const ny = enemy.y + dy;
    if (!canEnter(state, nx, ny)) continue;
    if (dx && dy && (state.tiles[idx(enemy.x + dx, enemy.y)] === WALL || state.tiles[idx(enemy.x, enemy.y + dy)] === WALL)) continue;
    const d = toHero[idx(nx, ny)];
    if (d < 0) continue;
    if (away ? d > bestScore : d < bestScore) {
      bestScore = d;
      best = { x: nx, y: ny };
    }
  }
  const here = toHero[idx(enemy.x, enemy.y)];
  // force : collé au héros mais coincé par un angle, il accepte de faire un pas de côté
  if (best && (away ? bestScore > here : bestScore < here || here < 0 || (force && bestScore <= here))) {
    enemy.x = best.x;
    enemy.y = best.y;
  }
}

function randomStep(state: GameState, enemy: Enemy) {
  const [dx, dy] = pick(state, NEIGHBORS);
  if (canEnter(state, enemy.x + dx, enemy.y + dy)) {
    enemy.x += dx;
    enemy.y += dy;
  }
}

function enemyAct(state: GameState, enemy: Enemy, toHero: Int16Array) {
  const def = enemyDef(enemy.id);
  const hero = state.hero;
  const d = dist(enemy, hero);
  const seen = state.visible[idx(enemy.x, enemy.y)] === 1;

  if (!enemy.awake) {
    if (seen && (d <= 5 || chance(state, 0.5))) enemy.awake = true;
    else {
      if (chance(state, 0.2)) randomStep(state, enemy);
      return;
    }
  }

  // Le gobelin voleur : il prend l'or puis file
  if (def.behavior === "thief") {
    if (enemy.stolen > 0) {
      stepToward(state, enemy, toHero, true);
      if (--enemy.fleeTurns <= 0 && !seen) {
        state.enemies = state.enemies.filter((e) => e !== enemy);
        log(state, `Le gobelin chapardeur a disparu avec ${enemy.stolen} pièces d'or.`, "bad");
        remember(state, `S'est fait voler ${enemy.stolen} pièces par un gobelin chapardeur`);
      }
      return;
    }
    if (d <= 1 && hero.gold > 0) {
      const amount = Math.min(hero.gold, int(state, 6, 14) + state.floor * 3);
      hero.gold -= amount;
      enemy.stolen = amount;
      enemy.fleeTurns = 10;
      state.fx.push({ kind: "text", x: hero.x, y: hero.y, text: `-${amount} or`, color: "#ffb627" });
      log(state, `Le gobelin te vole ${amount} pièces d'or et s'enfuit en ricanant !`, "bad");
      return;
    }
  }

  // Boss : invocations, tirs
  if (def.behavior === "boss") {
    enemy.cooldown--;
    const minions = state.enemies.filter((e) => e.summoned).length;
    if (enemy.cooldown <= 0 && minions < 4) {
      enemy.cooldown = 7;
      let summoned = 0;
      for (const [dx, dy] of shuffle(state, [...NEIGHBORS])) {
        if (summoned >= 2) break;
        if (isFree(state, enemy.x + dx, enemy.y + dy)) {
          const s = spawnEnemy(state, enemyDef("squelette"), enemy.x + dx, enemy.y + dy, true);
          s.awake = true;
          summoned++;
        }
      }
      state.fx.push({ kind: "flash", x: enemy.x, y: enemy.y, color: "#7cff6b", radius: 2 });
      log(state, "Morgrath lève son bâton : des squelettes sortent du sol !", "bad");
      return;
    }
  }

  // Mage noir : se téléporte près du héros
  if (def.power === "blink" && d > 3 && --enemy.cooldown <= 0 && chance(state, 0.4)) {
    for (let i = 0; i < 20; i++) {
      const p = { x: hero.x + int(state, -3, 3), y: hero.y + int(state, -3, 3) };
      if (isFree(state, p.x, p.y) && dist(p, hero) >= 2 && lineOfSight(state.tiles, p, hero)) {
        state.fx.push({ kind: "flash", x: enemy.x, y: enemy.y, color: "#b48cff", radius: 1 });
        enemy.x = p.x;
        enemy.y = p.y;
        enemy.cooldown = 5;
        log(state, `${enemy.name} se téléporte !`, "bad");
        return;
      }
    }
  }

  // Les monstres ne savent pas frapper par-dessus un angle de mur : ils doivent se replacer
  const blocked = d === 1 && cutsCorner(state.tiles, enemy.x, enemy.y, hero.x - enemy.x, hero.y - enemy.y);
  if (d <= 1 && !blocked) {
    enemyAttack(state, enemy);
    return;
  }
  if (blocked && def.range) {
    enemyAttack(state, enemy, true);
    return;
  }
  if ((def.behavior === "ranged" || def.behavior === "boss") && d <= (def.range ?? 5) && lineOfSight(state.tiles, enemy, hero) && chance(state, def.behavior === "boss" ? 0.6 : 0.7)) {
    enemyAttack(state, enemy, true);
    return;
  }
  if (def.behavior === "erratic" && chance(state, 0.45)) {
    randomStep(state, enemy);
    return;
  }
  if (def.behavior !== "boss") stepToward(state, enemy, toHero, false, blocked);
}

function tickStatus(state: GameState, status: Status, onDamage: (n: number, source: string) => void) {
  if (status.poison > 0) {
    status.poison--;
    onDamage(1, "le poison");
  }
  if (status.brulure > 0) {
    status.brulure--;
    onDamage(2, "les flammes");
  }
}

function endTurn(state: GameState) {
  state.turn++;
  const h = state.hero;
  const s = heroStats(state);

  // Le héros : statuts, bonus temporaires, régénération, saut
  tickStatus(state, h.status, (n, source) => hurtHero(state, n, source));
  if (s.specials.has("regen") && state.turn % 4 === 0) heal(state, 1);
  // Souffler un peu quand aucun ennemi n'est en vue : 1 PV tous les 8 tours
  const threatened = state.enemies.some((e) => e.awake && state.visible[idx(e.x, e.y)]);
  if (!threatened && state.turn % 8 === 0 && h.status.poison === 0 && h.status.brulure === 0) heal(state, 1);
  if (h.jumpCd > 0) h.jumpCd = Math.max(0, h.jumpCd - (s.specials.has("traceur") ? 2 : 1));
  for (const b of h.buffs) b.turns--;
  const expired = h.buffs.filter((b) => b.turns <= 0);
  h.buffs = h.buffs.filter((b) => b.turns > 0);
  for (const b of expired) log(state, `L'effet de « ${b.label} » se dissipe.`);
  if (expired.length) {
    clampHp(state);
    computeFov(state);
  }

  // Les ennemis
  const toHero = distanceMap(state.tiles, h);
  for (const enemy of [...state.enemies]) {
    if (state.status !== "playing") break;
    if (!state.enemies.includes(enemy)) continue;
    const def = enemyDef(enemy.id);
    tickStatus(state, enemy.status, (n) => damageEnemy(state, enemy, n, "#ff7a1a"));
    if (!state.enemies.includes(enemy)) continue;
    if (def.power === "regen" && enemy.hp < enemy.maxHp) enemy.hp++;
    if (enemy.status.gel > 0) { enemy.status.gel--; continue; }
    if (enemy.stunned > 0) { enemy.stunned--; continue; }
    if (def.speed === 0.5 && (state.turn + enemy.uid) % 2 === 0) continue;
    const actions = def.speed === 2 ? 2 : 1;
    for (let a = 0; a < actions && state.enemies.includes(enemy) && state.status === "playing"; a++) {
      enemyAct(state, enemy, toHero);
    }
  }

  // Pièges repérés en passant à côté
  for (const t of state.traps) {
    if (!t.found && dist(t, h) <= 1 && chance(state, 0.12 + s.agi * 0.005)) {
      t.found = true;
      log(state, "Tu repères un piège à côté de toi.", "info");
    }
  }

  computeFov(state);
}

// --- Actions du héros ------------------------------------------------------------------

function pickUp(state: GameState) {
  const h = state.hero;
  for (const g of state.golds.filter((g) => g.x === h.x && g.y === h.y)) {
    h.gold += g.amount;
    state.stats.goldEarned += g.amount;
    state.fx.push({ kind: "text", x: h.x, y: h.y, text: `+${g.amount} or`, color: "#ffb627" });
    log(state, `Tu ramasses ${g.amount} pièces d'or.`, "loot");
  }
  state.golds = state.golds.filter((g) => g.x !== h.x || g.y !== h.y);

  for (const it of state.items.filter((i) => i.x === h.x && i.y === h.y)) {
    const def = itemDef(it.item.id);
    if (addToInventory(state, it.item)) {
      state.items = state.items.filter((i) => i !== it);
      log(state, `Tu ramasses : ${def.name}.`, def.rarity === "commun" ? "loot" : "rare");
    } else {
      log(state, `Ton sac est plein, tu laisses ${def.name} par terre.`, "bad");
    }
  }

  const trap = state.traps.find((t) => t.x === h.x && t.y === h.y);
  if (trap) {
    const wasKnown = trap.found;
    trap.found = true;
    if (!wasKnown || chance(state, 0.5)) {
      const dmg = int(state, 2, 5) + state.floor;
      log(state, `CLAC ! Un piège à pointes : ${dmg} dégâts.`, "bad");
      hurtHero(state, dmg, "un piège à pointes");
    } else {
      log(state, "Tu enjambes le piège avec précaution.");
    }
  }

  if (h.x === state.stairs.x && h.y === state.stairs.y && state.floor < LAST_FLOOR) {
    log(state, state.stairsLocked ? "L'escalier ! Mais Brutus ne te laissera pas descendre comme ça." : "L'escalier ! Appuie sur Entrée pour descendre.", "info");
  }
}

function openChest(state: GameState, chest: Chest) {
  chest.opened = true;
  state.stats.chests++;
  state.fx.push({ kind: "flash", x: chest.x, y: chest.y, color: "#ffb627", radius: 1 });
  // Un coffre sur six est un mimique… non, on reste gentil : un sur six est piégé
  if (chance(state, 0.15)) {
    const dmg = 2 + state.floor;
    log(state, `Le coffre était piégé ! Une fléchette : ${dmg} dégâts.`, "bad");
    hurtHero(state, dmg, "un coffre piégé");
  }
  // Deux fois sur trois un objet de qualité, sinon une belle poignée d'or
  if (chance(state, 0.66)) {
    giveItem(state, rollItem(state, state.floor, 1));
  } else {
    const gold = int(state, 12, 25) * state.floor;
    state.hero.gold += gold;
    state.stats.goldEarned += gold;
    log(state, `Le coffre contient ${gold} pièces d'or.`, "loot");
  }
}

/** Point d'entrée : le héros fait une action, puis le monde réagit. */
export function act(state: GameState, cmd: Command): ActResult {
  if (state.status !== "playing") return {};
  const h = state.hero;

  // Gelé : le tour passe sans rien faire
  if (h.status.gel > 0 && (cmd.type === "move" || cmd.type === "jump" || cmd.type === "wait")) {
    h.status.gel--;
    log(state, "Tu es gelé et ne peux pas bouger !", "bad");
    endTurn(state);
    return {};
  }

  switch (cmd.type) {
    case "move": {
      const nx = h.x + cmd.dx;
      const ny = h.y + cmd.dy;
      if (!inBounds(nx, ny) || state.tiles[idx(nx, ny)] === WALL) return {};
      // Un traceur passe les angles de mur en diagonale (les monstres, eux, ne savent pas)
      const corner = cutsCorner(state.tiles, h.x, h.y, cmd.dx, cmd.dy);

      const npc = npcAt(state, nx, ny);
      if (npc) return { talk: npc.id };

      const enemy = enemyAt(state, nx, ny);
      if (enemy) {
        heroAttack(state, enemy, corner);
        endTurn(state);
        return {};
      }
      const chest = state.chests.find((c) => c.x === nx && c.y === ny);
      if (chest) {
        if (!chest.opened) {
          openChest(state, chest);
          endTurn(state);
        }
        return {};
      }
      h.x = nx;
      h.y = ny;
      computeFov(state);
      pickUp(state);
      const talk = checkBossRoom(state);
      endTurn(state);
      return talk ? { talk } : {};
    }

    case "jump": {
      if (h.jumpCd > 0) {
        log(state, `Saut pas encore prêt (encore ${h.jumpCd} tour${h.jumpCd > 1 ? "s" : ""}).`);
        return {};
      }
      const mx = h.x + cmd.dx;
      const my = h.y + cmd.dy;
      const lx = h.x + cmd.dx * 2;
      const ly = h.y + cmd.dy * 2;
      if (!inBounds(lx, ly) || state.tiles[idx(mx, my)] === WALL || state.tiles[idx(lx, ly)] === WALL) {
        log(state, "Pas d'appui pour sauter par là.");
        return {};
      }
      if (enemyAt(state, lx, ly) || npcAt(state, lx, ly) || state.chests.some((c) => c.x === lx && c.y === ly)) {
        log(state, "La réception est occupée.");
        return {};
      }
      const over = enemyAt(state, mx, my);
      h.x = lx;
      h.y = ly;
      h.jumpCd = JUMP_COOLDOWN;
      state.stats.jumps++;
      state.fx.push({ kind: "flash", x: lx, y: ly, color: "#49c0b2", radius: 1 });
      if (over) {
        over.stunned = 2;
        over.awake = true;
        log(state, `Saut de chat par-dessus ${over.name} ! Il ne t'a pas vu passer (étourdi 2 tours).`, "good");
        remember(state, "A sauté par-dessus un ennemi, comme un vrai traceur");
      } else {
        log(state, "Tu prends ton élan et tu sautes.", "info");
      }
      computeFov(state);
      pickUp(state);
      const talk = checkBossRoom(state);
      endTurn(state);
      return talk ? { talk } : {};
    }

    case "wait":
      endTurn(state);
      return {};

    case "descend": {
      if (h.x !== state.stairs.x || h.y !== state.stairs.y || state.floor >= LAST_FLOOR) {
        log(state, "Il n'y a pas d'escalier ici.");
        return {};
      }
      if (state.stairsLocked) {
        log(state, "Brutus te barre la route : « On ne passe pas ! »", "bad");
        return {};
      }
      remember(state, `A atteint l'étage ${state.floor + 1}`);
      enterFloor(state, state.floor + 1);
      return { newFloor: true };
    }

    case "use": {
      const item = h.inventory[cmd.index];
      if (!item) return {};
      const def = itemDef(item.id);
      if (isEquipment(def)) equip(state, cmd.index);
      else if (!useConsumable(state, cmd.index)) return {};
      endTurn(state);
      return {};
    }

    case "drop": {
      const item = h.inventory[cmd.index];
      if (!item) return {};
      h.inventory.splice(cmd.index, 1);
      state.items.push({ x: h.x, y: h.y, item });
      log(state, `Tu poses ${itemDef(item.id).name}.`);
      return {};
    }

    case "unequip": {
      const item = h.equipment[cmd.slot];
      if (!item) return {};
      if (!addToInventory(state, item)) {
        log(state, "Ton sac est plein.", "bad");
        return {};
      }
      h.equipment[cmd.slot] = null;
      clampHp(state);
      computeFov(state);
      log(state, `Tu retires ${itemDef(item.id).name}.`);
      return {};
    }
  }
}

function checkBossRoom(state: GameState): NpcId | undefined {
  if (state.floor !== LAST_FLOOR || state.bossMet) return;
  const room = state.rooms[state.exitRoom];
  const h = state.hero;
  const inside = h.x >= room.x && h.x < room.x + room.w && h.y >= room.y && h.y < room.y + room.h;
  if (inside && state.npcs.some((n) => n.id === "morgrath")) {
    state.bossMet = true;
    return "morgrath";
  }
}

// --- Marchand et autres PNJ ------------------------------------------------------------

export function buy(state: GameState, shopIndex: number): boolean {
  const slot = state.shop[shopIndex];
  if (!slot || slot.sold) return false;
  const def = itemDef(slot.item.id);
  const price = shopPrice(state, def);
  if (state.hero.gold < price) {
    log(state, `Pas assez d'or pour ${def.name} (${price} or).`, "bad");
    return false;
  }
  if (state.hero.inventory.length >= INVENTORY_SIZE) {
    log(state, "Ton sac est plein.", "bad");
    return false;
  }
  state.hero.gold -= price;
  slot.sold = true;
  addToInventory(state, slot.item);
  log(state, `Tu achètes ${def.name} pour ${price} or.`, "loot");
  return true;
}

export function sell(state: GameState, inventoryIndex: number): boolean {
  const item = state.hero.inventory[inventoryIndex];
  if (!item) return false;
  const def = itemDef(item.id);
  if (def.kind === "quete") {
    log(state, "Grizzle : « Ça ? C'est un souvenir, garde-le. »", "npc");
    return false;
  }
  const price = sellPrice(def);
  state.hero.inventory.splice(inventoryIndex, 1);
  state.hero.gold += price;
  log(state, `Tu vends ${def.name} pour ${price} or.`, "loot");
  return true;
}

export function payBrutus(state: GameState): boolean {
  if (state.hero.gold < BRUTUS_TOLL) {
    log(state, `Brutus : « ${BRUTUS_TOLL} pièces. Pas une de moins. »`, "npc");
    return false;
  }
  state.hero.gold -= BRUTUS_TOLL;
  remember(state, `A soudoyé Brutus avec ${BRUTUS_TOLL} pièces d'or`);
  stepAside(state, "brutus");
  log(state, "Brutus empoche l'or et s'écarte. « J'ai rien vu. »", "npc");
  return true;
}

function stepAside(state: GameState, id: NpcId) {
  state.npcs = state.npcs.filter((n) => n.id !== id);
  if (id === "brutus") state.stairsLocked = false;
  state.memory[id].done = true;
}

function npcToEnemy(state: GameState, id: NpcId, enemyId: string): Enemy | null {
  const npc = state.npcs.find((n) => n.id === id);
  if (!npc) return null;
  state.npcs = state.npcs.filter((n) => n !== npc);
  state.memory[id].done = true;
  const enemy = spawnEnemy(state, enemyDef(enemyId), npc.x, npc.y);
  enemy.awake = true;
  return enemy;
}

const GIFTS = ["potion_soin", "pain_rassis", "champignon_luisant", "potion_douteuse", "antidote"];

/** Les PNJ proposent, le moteur dispose : chaque action est bornée ici, quoi qu'ait dit l'IA. */
export function applyNpcAction(state: GameState, npc: NpcId, action: NpcAction): string | null {
  const mem = state.memory[npc];
  const h = state.hero;

  switch (`${npc}:${action.type}`) {
    case "grizzle:prix": {
      const wanted = (action as { remise: number }).remise;
      // Pas plus de 15 points d'écart par réplique, et jamais au-delà de −30 % / +40 %
      const step = Math.max(-15, Math.min(15, Math.round(wanted) - mem.remise));
      mem.remise = Math.max(-30, Math.min(40, mem.remise + step));
      if (mem.remise >= 20) remember(state, `A obtenu ${mem.remise} % de remise auprès de Grizzle le marchand`);
      if (mem.remise <= -20) remember(state, "A tellement agacé Grizzle qu'il a gonflé ses prix");
      if (step === 0) return null;
      return mem.remise >= 0
        ? `Grizzle ajuste ses prix : ${mem.remise > 0 ? `−${mem.remise} %` : "prix normal"}.`
        : `Grizzle gonfle ses prix : +${-mem.remise} %.`;
    }
    case "grizzle:cadeau": {
      const objet = (action as { objet: string }).objet;
      if (mem.giftGiven || !GIFTS.includes(objet)) return null;
      mem.giftGiven = true;
      giveItem(state, newItem(state, objet));
      remember(state, "A reçu un cadeau de Grizzle, ce qui n'arrive jamais");
      return `Grizzle te donne : ${itemDef(objet).name}.`;
    }
    case "grizzle:chasser": {
      mem.done = true;
      mem.remise = Math.min(mem.remise, -15);
      remember(state, "S'est fait chasser de la boutique par Grizzle");
      return "Grizzle ne veut plus te parler. Ses prix ont grimpé.";
    }
    case "osvald:moral": {
      if (mem.done) return null;
      const delta = Math.max(-1, Math.min(2, Math.round((action as { delta: number }).delta)));
      mem.moral = Math.max(0, Math.min(5, mem.moral + delta));
      if (mem.moral >= 5 && !mem.giftGiven) {
        mem.giftGiven = true;
        mem.done = true;
        giveItem(state, newItem(state, "amulette_osvald"));
        remember(state, "A redonné le sourire à Osvald, le squelette déprimé des catacombes");
        return "Osvald rit pour la première fois depuis trois siècles. Il t'offre son amulette !";
      }
      return delta > 0 ? `Le moral d'Osvald remonte (${mem.moral}/5).` : delta < 0 ? `Le moral d'Osvald baisse (${mem.moral}/5).` : null;
    }
    case "brutus:passer": {
      if (!state.npcs.some((n) => n.id === "brutus")) return null;
      stepAside(state, "brutus");
      remember(state, "A convaincu Brutus de le laisser passer, avec des mots");
      return "Brutus s'écarte en grommelant. L'escalier est libre !";
    }
    case "brutus:attaquer": {
      if (!npcToEnemy(state, "brutus", "brutus")) return null;
      remember(state, "A tellement énervé Brutus qu'il a sorti sa hache");
      return "Brutus sort sa hache. C'est le combat !";
    }
    case "sphinx:juger": {
      if (mem.done) return null;
      if ((action as { correcte: boolean }).correcte) {
        mem.done = true;
        gainXp(state, 40);
        const reward = rollItem(state, LAST_FLOOR, 2);
        giveItem(state, reward);
        state.fx.push({ kind: "flash", x: h.x, y: h.y, color: "#ffb627", radius: 2 });
        remember(state, "A résolu l'énigme de la Sphinge");
        return `Bonne réponse ! +40 XP et une récompense : ${itemDef(reward.id).name}.`;
      }
      mem.tries++;
      if (mem.tries >= 3) {
        mem.done = true;
        const loss = Math.round(heroStats(state).maxHp * 0.3);
        h.hp = Math.max(1, h.hp - loss);
        state.fx.push({ kind: "flash", x: h.x, y: h.y, color: "#b48cff", radius: 2 });
        remember(state, "A échoué trois fois face à l'énigme de la Sphinge");
        return `Trois erreurs. La malédiction de la Sphinge te coûte ${loss} PV.`;
      }
      return `Mauvaise réponse (${mem.tries}/3).`;
    }
    case "morgrath:combat": {
      const humeur = (action as { humeur: string }).humeur;
      const boss = npcToEnemy(state, "morgrath", "liche");
      if (!boss) return null;
      boss.cooldown = 4;
      if (humeur === "respect") {
        boss.hp = boss.maxHp = Math.round(boss.maxHp * 0.8);
        remember(state, "A gagné le respect de Morgrath avant le combat final");
        return "Morgrath te respecte : il se bat sans toute sa puissance (−20 % PV).";
      }
      if (humeur === "mepris") {
        boss.atk += 3;
        remember(state, "A mis Morgrath dans une colère noire");
        return "Morgrath est furieux : ses coups sont plus forts (+3 attaque) !";
      }
      if (humeur === "amusement") {
        boss.def = Math.max(0, boss.def - 2);
        remember(state, "A fait rire Morgrath, la liche");
        return "Morgrath rit encore en levant son bâton : sa garde est plus basse (−2 défense).";
      }
      return "Le combat final commence !";
    }
  }
  return null;
}

/** Résumé de la partie envoyé aux PNJ : c'est leur « mémoire ». */
export function summarize(state: GameState) {
  const s = heroStats(state);
  const killed = Object.entries(state.kills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => `${n} × ${enemyDef(id).name}`);
  const gear = Object.values(state.hero.equipment).filter((i): i is ItemInstance => !!i).map((i) => itemDef(i.id).name);
  return {
    hero: state.hero.name,
    level: state.hero.level,
    floor: state.floor,
    hp: state.hero.hp,
    maxHp: s.maxHp,
    gold: state.hero.gold,
    gear,
    kills: killed,
    chronicle: state.chronicle.slice(-12),
  };
}

export type GameSummary = ReturnType<typeof summarize>;

export function npcMood(state: GameState, npc: NpcId) {
  const m = state.memory[npc];
  switch (npc) {
    case "grizzle": return { remise: m.remise, cadeauDejaFait: m.giftGiven };
    case "osvald": return { moral: m.moral };
    case "sphinx": return { enigme: m.riddle, erreurs: m.tries };
    case "claude": return { etage: state.floor };
    default: return {};
  }
}

export function canTalk(state: GameState, npc: NpcId): boolean {
  return !state.memory[npc].done && state.memory[npc].talks < NPCS[npc].maxTalks;
}

/** Score de fin de partie : la profondeur compte le plus, puis les exploits. */
export function score(state: GameState): number {
  const kills = Object.values(state.kills).reduce((a, b) => a + b, 0);
  return (
    state.floor * 500 + state.hero.level * 100 + kills * 15 + state.stats.elites * 100 +
    state.stats.sneaks * 10 + state.hero.gold + (state.status === "won" ? 3000 : 0)
  );
}
