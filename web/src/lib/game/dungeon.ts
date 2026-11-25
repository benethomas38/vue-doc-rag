/**
 * Génération d'un étage : des salles rectangulaires posées au hasard sans se chevaucher,
 * reliées par des couloirs en L, plus quelques couloirs en trop pour créer des boucles
 * (sinon le donjon est un arbre, et on passe son temps à revenir sur ses pas).
 */
import { chance, int, type RngState } from "./rng";

export const W = 48;
export const H = 32;

export const WALL = 0;
export const FLOOR = 1;
export const STAIRS = 2;

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GeneratedMap {
  tiles: Uint8Array;
  rooms: Room[];
  start: Point;
  stairs: Point;
  startRoom: number;
  exitRoom: number;     // salle de l'escalier (ou du trône au dernier étage)
}

export const idx = (x: number, y: number) => y * W + x;
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
export const center = (r: Room): Point => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });

function overlaps(a: Room, b: Room): boolean {
  // Une case de marge : deux salles ne se touchent jamais directement
  return a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x && a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y;
}

function carveRoom(tiles: Uint8Array, r: Room) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[idx(x, y)] = FLOOR;
}

function carveCorridor(s: RngState, tiles: Uint8Array, a: Point, b: Point) {
  const horizontalFirst = chance(s, 0.5);
  const corner = horizontalFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
  for (const [from, to] of [[a, corner], [corner, b]] as const) {
    let { x, y } = from;
    tiles[idx(x, y)] = FLOOR;
    while (x !== to.x || y !== to.y) {
      x += Math.sign(to.x - x);
      y += Math.sign(to.y - y);
      tiles[idx(x, y)] = FLOOR;
    }
  }
}

/** Distance à pied depuis `from` vers chaque case (‑1 si inaccessible). */
export function distanceMap(tiles: Uint8Array, from: Point, blocked?: (x: number, y: number) => boolean): Int16Array {
  const dist = new Int16Array(W * H).fill(-1);
  const queue: number[] = [idx(from.x, from.y)];
  dist[queue[0]] = 0;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (dist[ni] !== -1 || tiles[ni] === WALL) continue;
      // On interdit de couper un coin de mur en diagonale
      if (dx && dy && (tiles[idx(x + dx, y)] === WALL || tiles[idx(x, y + dy)] === WALL)) continue;
      if (blocked?.(nx, ny)) continue;
      dist[ni] = dist[i] + 1;
      queue.push(ni);
    }
  }
  return dist;
}

export const NEIGHBORS: readonly (readonly [number, number])[] = [
  [0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1],
];

export function generateMap(s: RngState, floor: number, final = false): GeneratedMap {
  const tiles = new Uint8Array(W * H);
  const rooms: Room[] = [];

  // Au dernier étage, une grande salle du trône sur la droite
  if (final) rooms.push({ x: W - 16, y: int(s, 8, H - 18), w: 13, h: 9 });

  const target = 9 + Math.min(floor, 3);
  for (let attempt = 0; attempt < 400 && rooms.length < target; attempt++) {
    const w = int(s, 5, 10);
    const h = int(s, 4, 7);
    const room = { x: int(s, 1, W - w - 2), y: int(s, 1, H - h - 2), w, h };
    if (!rooms.some((r) => overlaps(r, room))) rooms.push(room);
  }

  rooms.forEach((r) => carveRoom(tiles, r));

  // Couloirs : de gauche à droite, chaque salle reliée à la suivante
  const order = [...rooms.keys()].sort((a, b) => center(rooms[a]).x - center(rooms[b]).x);
  for (let i = 0; i < order.length - 1; i++) {
    carveCorridor(s, tiles, center(rooms[order[i]]), center(rooms[order[i + 1]]));
  }
  // Quelques boucles
  for (let i = 0; i < 3; i++) {
    const a = int(s, 0, rooms.length - 1);
    const b = int(s, 0, rooms.length - 1);
    if (a !== b) carveCorridor(s, tiles, center(rooms[a]), center(rooms[b]));
  }

  const startRoom = order[0];
  const start = center(rooms[startRoom]);

  // L'escalier va dans la salle la plus éloignée à pied (le trône au dernier étage)
  let exitRoom = 0;
  if (!final) {
    const dist = distanceMap(tiles, start);
    let best = -1;
    rooms.forEach((r, i) => {
      const c = center(r);
      const d = dist[idx(c.x, c.y)];
      if (i !== startRoom && d > best) {
        best = d;
        exitRoom = i;
      }
    });
  }
  const exitCenter = center(rooms[exitRoom]);
  const stairs = final ? exitCenter : { x: exitCenter.x, y: exitCenter.y };
  if (!final) tiles[idx(stairs.x, stairs.y)] = STAIRS;

  return { tiles, rooms, start, stairs, startRoom, exitRoom };
}
