import { describe, it, expect } from "vitest";
import { act, applyNpcAction, buy, createGame, deserialize, enemyAt, heroStats, pathTo, payBrutus, serialize, summarize, type GameState } from "./engine";
import { distanceMap, FLOOR, H, idx, STAIRS, W, WALL } from "./dungeon";
import { enemyDef, of, the } from "./data/enemies";
import { FLOORS } from "./data/world";
import { int } from "./rng";

/** Joue une partie au hasard pendant `turns` tours : le moteur ne doit jamais planter. */
function randomPlay(state: GameState, turns: number) {
  for (let t = 0; t < turns && state.status === "playing"; t++) {
    const dx = int(state, -1, 1);
    const dy = int(state, -1, 1);
    const r = int(state, 0, 20);
    if (r === 0) act(state, { type: "jump", dx: dx || 1, dy });
    else if (r === 1 && state.hero.inventory.length) act(state, { type: "use", index: 0 });
    else act(state, { type: "move", dx, dy });
  }
}

describe("donjon", () => {
  it("relie toujours le départ à l'escalier", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const state = createGame(seed, "Test");
      const dist = distanceMap(state.tiles, state.hero);
      expect(state.tiles[idx(state.stairs.x, state.stairs.y)]).toBe(STAIRS);
      expect(dist[idx(state.stairs.x, state.stairs.y)]).toBeGreaterThan(0);
    }
  });

  it("est identique avec la même graine", () => {
    const a = createGame(42, "A");
    const b = createGame(42, "A");
    expect([...a.tiles]).toEqual([...b.tiles]);
    expect(a.enemies.map((e) => e.id)).toEqual(b.enemies.map((e) => e.id));
  });
});

describe("tours de jeu", () => {
  it("survit à des centaines de parties jouées au hasard", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = createGame(seed, "Bot");
      randomPlay(state, 400);
      expect(state.hero.hp).toBeGreaterThanOrEqual(0);
      expect(state.hero.hp).toBeLessThanOrEqual(heroStats(state).maxHp);
      for (const e of state.enemies) expect(state.tiles[idx(e.x, e.y)]).not.toBe(WALL);
    }
  });

  it("ne traverse pas les murs", () => {
    const state = createGame(7, "Test");
    for (let i = 0; i < 50; i++) act(state, { type: "move", dx: 0, dy: -1 });
    expect(state.tiles[state.hero.y * W + state.hero.x]).not.toBe(WALL);
  });

  it("descend jusqu'au dernier étage", () => {
    const state = createGame(3, "Test");
    for (let floor = 1; floor < 5; floor++) {
      state.hero.x = state.stairs.x;
      state.hero.y = state.stairs.y;
      if (state.stairsLocked) {
        state.hero.gold = 200;
        expect(payBrutus(state)).toBe(true);
      }
      expect(act(state, { type: "descend" }).newFloor).toBe(true);
    }
    expect(state.floor).toBe(5);
    expect(state.npcs.some((n) => n.id === "morgrath")).toBe(true);
  });
});

describe("les PNJ proposent, le moteur dispose", () => {
  it("borne la remise de Grizzle, quoi que demande l'IA", () => {
    const state = createGame(1, "Test");
    applyNpcAction(state, "grizzle", { type: "prix", remise: 99 });
    expect(state.memory.grizzle.remise).toBe(15); // 15 points max par réplique
    for (let i = 0; i < 5; i++) applyNpcAction(state, "grizzle", { type: "prix", remise: 99 });
    expect(state.memory.grizzle.remise).toBe(40); // plafond
  });

  it("refuse un cadeau hors liste ou en double", () => {
    const state = createGame(1, "Test");
    const before = state.hero.inventory.length;
    expect(applyNpcAction(state, "grizzle", { type: "cadeau", objet: "excalibouse" })).toBeNull();
    expect(applyNpcAction(state, "grizzle", { type: "cadeau", objet: "potion_soin" })).not.toBeNull();
    expect(applyNpcAction(state, "grizzle", { type: "cadeau", objet: "potion_soin" })).toBeNull();
    expect(state.hero.inventory.length).toBe(before + 1);
  });

  it("applique la remise au prix d'achat", () => {
    const state = createGame(1, "Test");
    state.hero.gold = 1000;
    applyNpcAction(state, "grizzle", { type: "prix", remise: 15 });
    const gold = state.hero.gold;
    expect(buy(state, 0)).toBe(true); // potion de soin, 25 or
    expect(gold - state.hero.gold).toBe(21);
  });

  it("offre l'amulette d'Osvald quand son moral atteint 5", () => {
    const state = createGame(1, "Test");
    for (let i = 0; i < 3; i++) applyNpcAction(state, "osvald", { type: "moral", delta: 50 });
    expect(state.memory.osvald.moral).toBe(5);
    expect(state.hero.inventory.some((i) => i.id === "amulette_osvald")).toBe(true);
    expect(summarize(state).chronicle.join(" ")).toContain("Osvald");
  });
});

/** Un petit décor sur mesure : tout en mur, sauf les cases données. */
function arena(state: GameState, open: [number, number][]) {
  state.tiles = new Uint8Array(W * H).fill(WALL);
  for (const [x, y] of open) state.tiles[idx(x, y)] = FLOOR;
  state.enemies = [];
  state.npcs = [];
  state.items = [];
  state.golds = [];
  state.chests = [];
  state.traps = [];
}

function addEnemy(state: GameState, id: string, x: number, y: number) {
  const d = enemyDef(id);
  state.enemies.push({
    uid: 999, id, name: d.name, x, y, hp: 200, maxHp: 200, atk: 30, def: 0, agi: 100,
    status: { poison: 0, brulure: 0, gel: 0 }, awake: true, stunned: 0, stolen: 0, fleeTurns: 0, cooldown: 3,
  });
  return state.enemies[state.enemies.length - 1];
}

describe("angles de mur et attaque sournoise", () => {
  // Un coude :  H .      le héros en (10,10), l'ennemi en (11,11),
  //             # E      (11,10) ouvert, (10,11) mur : la diagonale coupe un angle
  const corner: [number, number][] = [[10, 10], [11, 10], [11, 11], [12, 11]];

  it("le héros passe en diagonale au coin d'un mur", () => {
    const state = createGame(1, "Test");
    arena(state, corner);
    state.hero.x = 10;
    state.hero.y = 10;
    act(state, { type: "move", dx: 1, dy: 1 });
    expect([state.hero.x, state.hero.y]).toEqual([11, 11]);
  });

  it("frapper depuis un angle est une attaque sournoise impossible à esquiver", () => {
    const state = createGame(1, "Test");
    arena(state, corner);
    state.hero.x = 10;
    state.hero.y = 10;
    const enemy = addEnemy(state, "rat", 11, 11); // 100 % d'esquive en temps normal
    act(state, { type: "move", dx: 1, dy: 1 });
    expect(enemy.hp).toBeLessThan(200);
    expect(state.stats.sneaks).toBe(1);
  });

  it("un monstre ne frappe pas par-dessus un angle", () => {
    const state = createGame(1, "Test");
    arena(state, corner);
    state.hero.x = 10;
    state.hero.y = 10;
    state.hero.hp = 30;
    addEnemy(state, "rat", 11, 11);
    const enemy = state.enemies[0];
    enemy.agi = 0;
    act(state, { type: "wait" });
    // Il a dû se replacer au lieu de frapper
    expect(state.hero.hp).toBe(30);
    expect(enemyAt(state, 11, 10) ?? enemyAt(state, 11, 11)).toBeTruthy();
  });
});

describe("équilibre", () => {
  it("place le guide Claude à l'entrée du premier étage", () => {
    const state = createGame(5, "Test");
    const guide = state.npcs.find((n) => n.id === "claude");
    expect(!!guide).toBe(true);
    expect(Math.max(Math.abs(guide!.x - state.hero.x), Math.abs(guide!.y - state.hero.y))).toBeLessThanOrEqual(2);
  });

  it("laisse peu d'objets par terre et ajoute des élites", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = createGame(seed, "Test");
      expect(state.items.length).toBeLessThanOrEqual(2);
      expect(state.enemies.filter((e) => e.elite).length).toBe(1);
    }
  });

  it("rouvre la boutique de Grizzle au troisième étage, avec une pièce légendaire", () => {
    const state = createGame(3, "Test");
    for (let floor = 1; floor < 3; floor++) {
      state.hero.x = state.stairs.x;
      state.hero.y = state.stairs.y;
      act(state, { type: "descend" });
    }
    expect(state.npcs.some((n) => n.id === "grizzle")).toBe(true);
    expect(state.shop.some((s) => s.item.id === "excalibouse" || s.item.id === "armure_paladin")).toBe(true);
  });
});

describe("retours de test (v2)", () => {
  const descend = (state: GameState) => {
    state.hero.x = state.stairs.x;
    state.hero.y = state.stairs.y;
    state.stairsLocked = false;
    act(state, { type: "descend" });
  };

  it("plafonne les gobelins chapardeurs à chaque étage", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = createGame(seed, "Test");
      for (let floor = 1; floor <= FLOORS.length; floor++) {
        if (floor > 1) descend(state);
        const thieves = state.enemies.filter((e) => e.id === "gobelin_voleur").length;
        expect(thieves).toBeLessThanOrEqual(FLOORS[floor - 1].thieves);
      }
    }
  });

  it("accorde les noms d'ennemis dans le journal", () => {
    expect(the(enemyDef("gelee"))).toBe("la gelée verte");
    expect(the(enemyDef("archer_squelette"))).toBe("l'archer squelette");
    expect(of(enemyDef("chauve_souris"))).toBe("de la chauve-souris");
    expect(of(enemyDef("rat"))).toBe("du rat géant");
    expect(the(enemyDef("brutus"))).toBe("Brutus");
  });

  it("laisse marcher sur un coffre ouvert", () => {
    const state = createGame(11, "Test");
    state.enemies = [];
    state.npcs = [];
    state.tiles[idx(10, 10)] = FLOOR;
    state.tiles[idx(11, 10)] = FLOOR;
    state.hero.x = 10;
    state.hero.y = 10;
    state.chests = [{ x: 11, y: 10, opened: false }];
    act(state, { type: "move", dx: 1, dy: 0 }); // ouvre
    expect(state.hero.x).toBe(10);
    act(state, { type: "move", dx: 1, dy: 0 }); // passe
    expect(state.hero.x).toBe(11);
  });

  it("ne laisse jamais le guide boucher un passage", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = createGame(seed, "Test");
      const guide = state.npcs.find((n) => n.id === "claude")!;
      const count = (d: Int16Array) => d.reduce((n, v) => n + (v >= 0 ? 1 : 0), 0);
      const open = count(distanceMap(state.tiles, state.hero));
      const blocked = count(distanceMap(state.tiles, state.hero, (x, y) => x === guide.x && y === guide.y));
      expect(blocked).toBe(open - 1);
    }
  });

  it("trouve un chemin vers une case explorée", () => {
    const state = createGame(8, "Test");
    state.enemies = [];
    const target = { x: state.hero.x, y: state.hero.y };
    for (let i = 0; i < state.explored.length; i++) {
      if (state.explored[i] && state.tiles[i] !== WALL && !state.npcs.some((n) => idx(n.x, n.y) === i) && !state.chests.some((c) => idx(c.x, c.y) === i)) {
        target.x = i % W;
        target.y = Math.floor(i / W);
      }
    }
    const path = pathTo(state, target);
    expect(path.length).toBeGreaterThanOrEqual(1);
    for (const [dx, dy] of path) act(state, { type: "move", dx, dy });
    expect(`${state.hero.x},${state.hero.y}`).toBe(`${target.x},${target.y}`);
  });

  it("sauvegarde et recharge une partie à l'identique", () => {
    const state = createGame(77, "Sauvé");
    randomPlay(state, 120);
    if (state.status !== "playing") return;
    const copy = deserialize(serialize(state))!;
    expect(copy.hero.gold).toBe(state.hero.gold);
    expect(serialize(copy)).toBe(serialize(state));
    expect(deserialize("{abîmé")).toBe(null);
  });
});
