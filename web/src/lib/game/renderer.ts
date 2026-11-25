/**
 * Rendu Canvas 2D : une caméra centrée sur le héros, des tuiles dessinées en code,
 * les sprites 8 × 8 agrandis ×4 sans lissage, et les effets (dégâts, tirs, éclairs).
 * Le moteur ne sait rien de ce fichier : il se contente de remplir state.fx.
 */
import { H, idx, STAIRS, W, WALL } from "./dungeon";
import type { Enemy, Fx, GameState } from "./engine";
import { FLOORS } from "./data/world";
import { spriteCanvas } from "./sprites";

export const TILE = 32;
export const VIEW_W = 21;
export const VIEW_H = 15;
const FX_DURATION = { text: 900, bolt: 220, flash: 380, shake: 260 } as const;

interface LiveFx {
  fx: Fx;
  start: number;
}

/** Petit hachage stable par case : les détails du sol ne clignotent pas d'une image à l'autre. */
function hash(x: number, y: number, floor: number): number {
  let h = (x * 374761393 + y * 668265263 + floor * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Minicarte : petite dans un coin, grande au centre, ou masquée (touche M). */
export type MinimapMode = "petite" | "grande" | "off";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private state: GameState | null = null;
  private live: LiveFx[] = [];
  private frame = 0;
  private reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  /** Nombre de cases affichées : 21 × 15 par défaut, davantage en grand écran. */
  viewW = VIEW_W;
  viewH = VIEW_H;
  minimap: MinimapMode = "petite";

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.setView(VIEW_W, VIEW_H);
  }

  /** Change le nombre de cases visibles (grand écran : on voit plus loin, au lieu de voir plus gros). */
  setView(w: number, h: number) {
    this.viewW = Math.max(VIEW_W, Math.min(W, w));
    this.viewH = Math.max(VIEW_H, Math.min(H, h));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.viewW * TILE * dpr;
    this.canvas.height = this.viewH * TILE * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  setState(state: GameState) {
    this.state = state;
  }

  /** Récupère les effets produits par le dernier tour. */
  takeFx(state: GameState) {
    const now = performance.now();
    // Plusieurs chiffres sur la même case : on les décale dans le temps pour qu'ils ne se chevauchent pas
    const perTile = new Map<string, number>();
    for (const fx of state.fx) {
      let start = now;
      if (fx.kind === "text") {
        const key = `${fx.x},${fx.y}`;
        const n = perTile.get(key) ?? 0;
        perTile.set(key, n + 1);
        start += n * 200;
      }
      this.live.push({ fx, start });
    }
    state.fx.length = 0;
  }

  start() {
    const loop = (t: number) => {
      this.draw(t);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.frame);
  }

  /** La case du donjon sous un clic ou un tap. */
  tileAt(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.state) return null;
    const rect = this.canvas.getBoundingClientRect();
    const vx = Math.floor(((clientX - rect.left) / rect.width) * this.viewW);
    const vy = Math.floor(((clientY - rect.top) / rect.height) * this.viewH);
    const { cx, cy } = this.camera();
    return { x: cx + vx, y: cy + vy };
  }

  private camera(): { cx: number; cy: number } {
    const { hero } = this.state!;
    const cx = Math.max(0, Math.min(W - this.viewW, hero.x - Math.floor(this.viewW / 2)));
    const cy = Math.max(0, Math.min(H - this.viewH, hero.y - Math.floor(this.viewH / 2)));
    return { cx, cy };
  }

  private draw(now: number) {
    const state = this.state;
    const ctx = this.ctx;
    if (!state) return;
    this.live = this.live.filter((l) => now - l.start < FX_DURATION[l.fx.kind]);

    const shake = this.live.find((l) => l.fx.kind === "shake" && now >= l.start);
    const sx = shake && !this.reducedMotion ? Math.round((Math.random() - 0.5) * 8) : 0;
    const sy = shake && !this.reducedMotion ? Math.round((Math.random() - 0.5) * 8) : 0;

    ctx.save();
    ctx.fillStyle = "#07060b";
    ctx.fillRect(0, 0, this.viewW * TILE, this.viewH * TILE);
    ctx.translate(sx, sy);

    const { cx, cy } = this.camera();
    const pal = FLOORS[state.floor - 1].palette;

    // 1. Le décor
    for (let vy = 0; vy < this.viewH; vy++) {
      for (let vx = 0; vx < this.viewW; vx++) {
        const x = cx + vx;
        const y = cy + vy;
        const i = idx(x, y);
        if (!state.explored[i]) continue;
        const px = vx * TILE;
        const py = vy * TILE;
        const tile = state.tiles[i];

        if (tile === WALL) {
          const open = (ox: number, oy: number) => ox >= 0 && oy >= 0 && ox < W && oy < H && state.tiles[idx(ox, oy)] !== WALL;
          ctx.fillStyle = pal.wall;
          ctx.fillRect(px, py, TILE, TILE);
          if (open(x, y + 1)) {
            // Face du mur, vue de devant : arête éclairée et rangées de briques
            ctx.fillStyle = pal.wallTop;
            ctx.fillRect(px, py, TILE, 6);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(px, py + 16, TILE, 2);
            ctx.fillRect(px + ((x % 2) ? 8 : 20), py + 6, 2, 10);
            ctx.fillRect(px + ((x % 2) ? 20 : 8), py + 18, 2, 14);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(px, py + TILE - 4, TILE, 4);
          } else {
            // Dessus du mur : plus sombre, avec un liseré côté sol
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = pal.wallTop;
            if (open(x - 1, y)) ctx.fillRect(px, py, 3, TILE);
            if (open(x + 1, y)) ctx.fillRect(px + TILE - 3, py, 3, TILE);
            if (open(x, y - 1)) ctx.fillRect(px, py, TILE, 3);
          }
        } else {
          ctx.fillStyle = hash(x, y, state.floor) > 0.5 ? pal.floor : pal.floorAlt;
          ctx.fillRect(px, py, TILE, TILE);
          const h = hash(y, x, state.floor);
          if (h > 0.82) {
            ctx.fillStyle = pal.accent;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(px + Math.floor(h * 100) % 24, py + Math.floor(h * 1000) % 24, 4, 4);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(px, py + TILE - 2, TILE, 2);
          ctx.fillRect(px + TILE - 2, py, 2, TILE);
          if (tile === STAIRS) this.sprite("stairs", px, py);
        }
      }
    }

    const onScreen = (x: number, y: number) => x >= cx && y >= cy && x < cx + this.viewW && y < cy + this.viewH;
    const visible = (x: number, y: number) => state.visible[idx(x, y)] === 1;
    const pos = (x: number, y: number) => [(x - cx) * TILE, (y - cy) * TILE] as const;

    // 2. Ce qui traîne par terre (mémorisé une fois vu)
    for (const t of state.traps) if (t.found && state.explored[idx(t.x, t.y)] && onScreen(t.x, t.y)) this.sprite("trap", ...pos(t.x, t.y));
    for (const c of state.chests) if (state.explored[idx(c.x, c.y)] && onScreen(c.x, c.y)) this.sprite(c.opened ? "chest_open" : "chest", ...pos(c.x, c.y));
    for (const g of state.golds) if (visible(g.x, g.y) && onScreen(g.x, g.y)) this.sprite("gold", ...pos(g.x, g.y));
    for (const it of state.items) if (visible(it.x, it.y) && onScreen(it.x, it.y)) this.sprite(it.item.id, ...pos(it.x, it.y), 0.75);

    // 3. Les personnages
    const bob = this.reducedMotion ? 0 : Math.floor(now / 450) % 2;
    for (const n of state.npcs) {
      if (!visible(n.x, n.y) || !onScreen(n.x, n.y)) continue;
      const [px, py] = pos(n.x, n.y);
      this.sprite(n.id === "morgrath" ? "liche" : n.id, px, py - bob * 2);
      // Bulle de dialogue blanche au-dessus des PNJ qui ont encore des choses à dire.
      // Volontairement différente de tout sprite d'ennemi : aucun monstre n'a de bulle.
      if (!state.memory[n.id].done) this.speechBubble(px + TILE / 2, py - 14 - bob * 2);
    }
    for (const e of state.enemies) {
      if (!visible(e.x, e.y) || !onScreen(e.x, e.y)) continue;
      this.enemy(e, ...pos(e.x, e.y), now);
    }
    const [hx, hy] = pos(state.hero.x, state.hero.y);
    this.sprite("hero", hx, hy - (state.status === "playing" ? bob : 0));
    if (state.hero.status.gel) this.tint(hx, hy, "rgba(155,231,255,0.45)");

    // 4. Pénombre sur ce qui est mémorisé mais plus visible
    ctx.fillStyle = "rgba(7,6,11,0.55)";
    for (let vy = 0; vy < this.viewH; vy++) {
      for (let vx = 0; vx < this.viewW; vx++) {
        const i = idx(cx + vx, cy + vy);
        if (state.explored[i] && !state.visible[i]) ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
      }
    }

    // Halo : la lumière baisse vers le bord du champ de vision
    const radius = (state.visible.reduce((n, v) => n + v, 0) > 0 ? Math.sqrt(state.visible.reduce((n, v) => n + v, 0) / Math.PI) : 6) * TILE;
    const glow = ctx.createRadialGradient(hx + TILE / 2, hy + TILE / 2, radius * 0.35, hx + TILE / 2, hy + TILE / 2, radius * 1.1);
    glow.addColorStop(0, "rgba(255,210,140,0.06)");
    glow.addColorStop(0.6, "rgba(0,0,0,0)");
    glow.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.viewW * TILE, this.viewH * TILE);

    // 5. Effets
    for (const { fx, start } of this.live) {
      const t = (now - start) / FX_DURATION[fx.kind];
      if (t < 0) continue;
      if (fx.kind === "text" && onScreen(fx.x, fx.y)) {
        const [px, py] = pos(fx.x, fx.y);
        ctx.globalAlpha = 1 - t * t;
        ctx.font = "700 14px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText(fx.text, px + TILE / 2 + 1, py - t * 22 + 5);
        ctx.fillStyle = fx.color;
        ctx.fillText(fx.text, px + TILE / 2, py - t * 22 + 4);
        ctx.globalAlpha = 1;
      } else if (fx.kind === "bolt") {
        const [ax, ay] = pos(fx.x, fx.y);
        const [bx, by] = pos(fx.tx, fx.ty);
        const x = ax + (bx - ax) * t + TILE / 2;
        const y = ay + (by - ay) * t + TILE / 2;
        ctx.fillStyle = fx.color;
        ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x - 8 - (bx - ax) * 0.05, y - 8 - (by - ay) * 0.05, 16, 16);
        ctx.globalAlpha = 1;
      } else if (fx.kind === "flash" && onScreen(fx.x, fx.y)) {
        const [px, py] = pos(fx.x, fx.y);
        ctx.globalAlpha = 0.6 * (1 - t);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, (0.3 + t) * TILE * fx.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    this.drawMinimap();
  }

  private sprite(key: string, px: number, py: number, scale = 1) {
    const size = TILE * scale;
    const offset = (TILE - size) / 2;
    this.ctx.drawImage(spriteCanvas(key), px + offset, py + offset, size, size);
  }

  /** Petite bulle blanche cerclée de noir, avec un « ! », pointe vers le bas. */
  private speechBubble(cx: number, top: number) {
    const ctx = this.ctx;
    const x = Math.round(cx - 8);
    ctx.fillStyle = "#14101c";
    ctx.fillRect(x - 2, top - 2, 20, 16);
    ctx.fillRect(x + 4, top + 14, 8, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, top, 16, 12);
    ctx.fillRect(x + 6, top + 12, 4, 2);
    ctx.fillStyle = "#14101c";
    ctx.fillRect(x + 7, top + 2, 2, 5);
    ctx.fillRect(x + 7, top + 8, 2, 2);
  }

  /** Minicarte de l'étage : ce qui a été exploré, le héros, l'escalier, les PNJ. */
  private drawMinimap() {
    const state = this.state!;
    const ctx = this.ctx;
    if (this.minimap === "off") return;
    const big = this.minimap === "grande";
    const viewPxW = this.viewW * TILE;
    const viewPxH = this.viewH * TILE;
    const cell = big ? Math.floor(Math.min((viewPxW - 40) / W, (viewPxH - 40) / H)) : 3;
    const mw = W * cell;
    const mh = H * cell;
    const ox = big ? Math.round((viewPxW - mw) / 2) : viewPxW - mw - 8;
    const oy = big ? Math.round((viewPxH - mh) / 2) : 8;
    ctx.fillStyle = big ? "rgba(7,6,11,0.92)" : "rgba(7,6,11,0.7)";
    ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
    const pal = FLOORS[state.floor - 1].palette;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (!state.explored[i] || state.tiles[i] === WALL) continue;
        ctx.fillStyle = state.visible[i] ? pal.wallTop : pal.wall;
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
    }
    const dot = (x: number, y: number, color: string, grow = 0) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * cell - grow, oy + y * cell - grow, cell + grow * 2, cell + grow * 2);
    };
    if (state.explored[idx(state.stairs.x, state.stairs.y)]) dot(state.stairs.x, state.stairs.y, "#ffffff", 1);
    for (const c of state.chests) if (!c.opened && state.explored[idx(c.x, c.y)]) dot(c.x, c.y, "#ffb627");
    for (const n of state.npcs) if (state.explored[idx(n.x, n.y)]) dot(n.x, n.y, "#ffd23f", 1);
    for (const e of state.enemies) if (state.visible[idx(e.x, e.y)]) dot(e.x, e.y, "#e8434a");
    dot(state.hero.x, state.hero.y, "#49c0b2", 1);
    if (big) {
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#c9d1d9";
      ctx.fillText("Carte · blanc : escalier, jaune : personnage · M pour fermer", viewPxW / 2, oy + mh + 18 > viewPxH ? oy - 10 : oy + mh + 18);
    }
  }

  private tint(px: number, py: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
  }

  private enemy(e: Enemy, px: number, py: number, now: number) {
    const ctx = this.ctx;
    const big = e.id === "liche" || e.id === "golem" || e.id === "brutus";
    if (big) {
      // Les gros ennemis débordent un peu de leur case
      ctx.drawImage(spriteCanvas(e.id), px - 4, py - 8, TILE + 8, TILE + 8);
    } else {
      this.sprite(e.id, px, py);
    }
    if (e.elite) {
      // Petite couronne dorée : un ennemi d'élite
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(px + 2, py - 2, 12, 4);
      ctx.fillRect(px + 2, py - 6, 4, 4);
      ctx.fillRect(px + 10, py - 6, 4, 4);
    }
    if (e.stolen > 0) {
      // Le chapardeur en fuite traîne ta bourse : un sac doré bien visible
      ctx.fillStyle = "#14101c";
      ctx.fillRect(px + 18, py + 14, 12, 12);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(px + 20, py + 16, 8, 8);
      ctx.fillStyle = "#c9971c";
      ctx.fillRect(px + 22, py + 14, 4, 3);
    }
    if (e.status.gel) this.tint(px, py, "rgba(155,231,255,0.45)");
    if (e.status.brulure && Math.floor(now / 150) % 2) {
      ctx.fillStyle = "#ff7a1a";
      ctx.fillRect(px + 4, py + 20, 4, 4);
      ctx.fillRect(px + 22, py + 14, 4, 4);
    }
    if (e.stunned) {
      ctx.fillStyle = "#ffd23f";
      const a = now / 200;
      ctx.fillRect(px + 14 + Math.cos(a) * 10, py - 2 + Math.sin(a) * 3, 4, 4);
      ctx.fillRect(px + 14 - Math.cos(a) * 10, py - 2 - Math.sin(a) * 3, 4, 4);
    }
    // Barre de vie dès la première blessure (toujours pour le boss)
    if (e.hp < e.maxHp || e.id === "liche") {
      ctx.fillStyle = "#14101c";
      ctx.fillRect(px + 2, py - 6, TILE - 4, 5);
      ctx.fillStyle = e.id === "liche" ? "#7cff6b" : "#e8434a";
      ctx.fillRect(px + 3, py - 5, Math.max(1, (TILE - 6) * (e.hp / e.maxHp)), 3);
    }
  }
}
