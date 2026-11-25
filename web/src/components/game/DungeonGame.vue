<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from "vue";
import {
  act, applyNpcAction, BRUTUS_TOLL, buy, canTalk, createGame, heroStats, INVENTORY_SIZE, npcAt, npcMood,
  payBrutus, score, sell, sellPrice, shopPrice, summarize, xpToNext,
  type Command, type GameState, type NpcAction,
} from "../../lib/game/engine";
import { Renderer, VIEW_H, VIEW_W } from "../../lib/game/renderer";
import { spriteUrl } from "../../lib/game/sprites";
import { isEquipment, itemDef, RARITY_COLOR, RARITY_LABEL, SPECIAL_LABEL, type ItemDef, type Slot } from "../../lib/game/data/items";
import { FLOORS, NPCS, type NpcId } from "../../lib/game/data/world";
import { fetchRiddle, streamTalk, type DialogLine, type TalkHistoryItem } from "../../lib/game/talk";
import NpcDialog from "./NpcDialog.vue";

// --- État -------------------------------------------------------------------------
// Le moteur modifie son état sur place : shallowRef + un compteur suffisent à rafraîchir l'interface
const game = shallowRef<GameState | null>(null);
const tick = ref(0);
const canvas = ref<HTMLCanvasElement | null>(null);
const root = ref<HTMLElement | null>(null);
const heroName = ref(readStorage("donjon:name") ?? "");
const bestFloor = ref(Number(readStorage("donjon:best") ?? 0));
const bestScore = ref(Number(readStorage("donjon:score") ?? 0));
const fullscreen = ref(false);
const jumpMode = ref(false);
const selected = ref<number | null>(null);
const banner = ref<{ title: string; text: string; key: number } | null>(null);
const talking = ref<NpcId | null>(null);
const conversations = reactive<Partial<Record<NpcId, DialogLine[]>>>({});
const busy = ref(false);
let renderer: Renderer | null = null;
let controller: AbortController | null = null;
let lineId = 1;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Navigation privée : tant pis, on ne retient rien
  }
}

function refresh() {
  const s = game.value;
  if (!s) return;
  renderer?.takeFx(s);
  tick.value++;
  if (s.floor > bestFloor.value) {
    bestFloor.value = s.floor;
    writeStorage("donjon:best", String(s.floor));
  }
  if (s.status !== "playing" && score(s) > bestScore.value) {
    bestScore.value = score(s);
    writeStorage("donjon:score", String(bestScore.value));
  }
}

function showBanner() {
  const s = game.value!;
  const floor = FLOORS[s.floor - 1];
  banner.value = { title: `Étage ${s.floor} · ${floor.name}`, text: floor.intro, key: Date.now() };
  setTimeout(() => {
    if (banner.value && Date.now() - banner.value.key >= 3000) banner.value = null;
  }, 3100);
}

function start() {
  const name = heroName.value.trim() || "Traceur";
  heroName.value = name;
  writeStorage("donjon:name", name);
  const s = createGame(Math.floor(Math.random() * 2 ** 31), name);
  game.value = s;
  renderer?.setState(s);
  for (const k of Object.keys(conversations) as NpcId[]) delete conversations[k];
  talking.value = null;
  selected.value = null;
  jumpMode.value = false;
  refresh();
  showBanner();
  nextTick(() => root.value?.focus());
}

// --- Ce que l'interface affiche ---------------------------------------------------------

const view = computed(() => {
  void tick.value;
  const s = game.value;
  if (!s) return null;
  const stats = heroStats(s);
  return {
    status: s.status,
    floor: s.floor,
    floorName: FLOORS[s.floor - 1].name,
    hero: { ...s.hero },
    stats,
    xpNext: xpToNext(s.hero.level),
    statuses: [
      s.hero.status.poison && `Empoisonné (${s.hero.status.poison})`,
      s.hero.status.brulure && `En feu (${s.hero.status.brulure})`,
      s.hero.status.gel && "Gelé",
      ...s.hero.buffs.map((b) => `${b.label} (${b.turns})`),
    ].filter(Boolean) as string[],
    inventory: s.hero.inventory.map((i) => itemDef(i.id)),
    equipment: (["arme", "armure", "bijou"] as Slot[]).map((slot) => ({
      slot,
      def: s.hero.equipment[slot] ? itemDef(s.hero.equipment[slot]!.id) : null,
    })),
    log: s.log.slice(-12).reverse(), // le plus récent en haut
    onStairs: s.hero.x === s.stairs.x && s.hero.y === s.stairs.y && s.floor < FLOORS.length,
    turn: s.turn,
    kills: Object.values(s.kills).reduce((a, b) => a + b, 0),
    chronicle: [...s.chronicle],
    gameStats: { ...s.stats },
    score: score(s),
    boss: s.enemies.find((e) => e.id === "liche"),
  };
});

const selectedDef = computed<ItemDef | null>(() => {
  void tick.value;
  const s = game.value;
  if (!s || selected.value === null) return null;
  const item = s.hero.inventory[selected.value];
  return item ? itemDef(item.id) : null;
});

const SLOT_LABEL: Record<Slot, string> = { arme: "Arme", armure: "Armure", bijou: "Bijou" };
const KIND_LABEL: Record<string, string> = {
  arme: "Arme", armure: "Armure", bijou: "Bijou", potion: "Potion", parchemin: "Parchemin", nourriture: "Nourriture", quete: "Objet unique",
};

function bonusLine(def: ItemDef): string {
  return def.special ? SPECIAL_LABEL[def.special] : "";
}

// --- Actions du joueur -----------------------------------------------------------------

function run(cmd: Command) {
  const s = game.value;
  if (!s || s.status !== "playing" || talking.value) return;
  const before = s.floor;
  const result = act(s, cmd);
  if (cmd.type === "use" || cmd.type === "drop") selected.value = null;
  refresh();
  if (result.newFloor || s.floor !== before) showBanner();
  if (result.talk) openTalk(result.talk);
}

function move(dx: number, dy: number) {
  if (jumpMode.value) {
    jumpMode.value = false;
    run({ type: "jump", dx, dy });
  } else {
    run({ type: "move", dx, dy });
  }
}

/** Entrée / E : descendre, ou parler au PNJ d'à côté. */
function interact() {
  const s = game.value;
  if (!s) return;
  if (view.value?.onStairs) return run({ type: "descend" });
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const npc = npcAt(s, s.hero.x + dx, s.hero.y + dy);
      if (npc) return openTalk(npc.id);
    }
  }
}

function toggleJump() {
  const s = game.value;
  if (!s || s.status !== "playing") return;
  jumpMode.value = !jumpMode.value;
}

const KEY_DIRS: Record<string, [number, number]> = {
  arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0],
  z: [0, -1], w: [0, -1], s: [0, 1], q: [-1, 0], a: [-1, 0], d: [1, 0],
};
const NUMPAD_DIRS: Record<string, [number, number]> = {
  Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
};

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.closest("input, textarea")) return;
  // Entrée ou Espace sur un bouton du panneau : on laisse le bouton faire son travail
  if (target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
  if (talking.value) {
    if (e.key === "Escape") closeTalk();
    return;
  }
  const s = game.value;
  if (!s || s.status !== "playing") {
    if (e.key === "Enter" && !(target instanceof HTMLButtonElement)) start();
    return;
  }
  const dir = NUMPAD_DIRS[e.code] ?? KEY_DIRS[e.key.toLowerCase()];
  if (dir) {
    e.preventDefault();
    if (e.shiftKey) jumpMode.value = true;
    move(dir[0], dir[1]);
    return;
  }
  if (e.key === " ") {
    e.preventDefault();
    toggleJump();
  } else if (e.key === "." || e.code === "Numpad5" || e.key.toLowerCase() === "r") {
    e.preventDefault();
    run({ type: "wait" });
  } else if (e.key === "Enter" || e.key.toLowerCase() === "e") {
    e.preventDefault();
    interact();
  } else if (/^Digit[1-9]$/.test(e.code)) {
    const index = Number(e.code.slice(5)) - 1;
    if (s.hero.inventory[index]) run({ type: "use", index });
  } else if (e.key.toLowerCase() === "f") {
    e.preventDefault();
    toggleFullscreen();
  } else if (e.key === "Escape") {
    jumpMode.value = false;
    selected.value = null;
    if (fullscreen.value && !document.fullscreenElement) fullscreen.value = false;
  }
}

// --- Grand écran ----------------------------------------------------------------------
// L'API Fullscreen quand elle existe ; sinon (iPhone…) le jeu couvre simplement la fenêtre en CSS

async function toggleFullscreen() {
  const el = root.value;
  if (!el) return;
  if (!fullscreen.value) {
    fullscreen.value = true;
    try {
      await el.requestFullscreen?.();
    } catch {
      // Refusé ou indisponible : le mode CSS suffit
    }
  } else {
    fullscreen.value = false;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  }
  el.focus();
}

function onFullscreenChange() {
  // Échap ou geste du système : on sort aussi du mode CSS
  if (!document.fullscreenElement) fullscreen.value = false;
}

/** Clic ou tap sur le donjon : un pas (ou un saut) dans cette direction. */
function onCanvasClick(e: MouseEvent) {
  root.value?.focus();
  const s = game.value;
  const tile = renderer?.tileAt(e.clientX, e.clientY);
  if (!s || !tile || s.status !== "playing") return;
  const dx = Math.sign(tile.x - s.hero.x);
  const dy = Math.sign(tile.y - s.hero.y);
  if (!dx && !dy) interact();
  else move(dx, dy);
}

const PAD: [number, number, string][] = [
  [-1, -1, "↖"], [0, -1, "↑"], [1, -1, "↗"],
  [-1, 0, "←"], [0, 0, "·"], [1, 0, "→"],
  [-1, 1, "↙"], [0, 1, "↓"], [1, 1, "↘"],
];

function padPress(dx: number, dy: number) {
  if (dx || dy) move(dx, dy);
  else run({ type: "wait" });
}

function useSelected() {
  if (selected.value !== null) run({ type: "use", index: selected.value });
}

function dropSelected() {
  if (selected.value !== null) run({ type: "drop", index: selected.value });
}

function unequip(slot: Slot) {
  run({ type: "unequip", slot });
}

// --- Dialogues avec les PNJ ----------------------------------------------------------------

const line = (who: DialogLine["who"], text: string, streaming = false): DialogLine => ({ id: lineId++, who, text, streaming });

function conversation(id: NpcId): DialogLine[] {
  if (!conversations[id]) conversations[id] = [];
  return conversations[id]!; // le proxy réactif : y ajouter une ligne met l'écran à jour
}

async function openTalk(id: NpcId) {
  const s = game.value!;
  talking.value = id;
  jumpMode.value = false;
  const conv = conversation(id);
  if (!conv.length) {
    conv.push(line("npc", NPCS[id].greeting));
    if (id === "sphinx") {
      try {
        conv.push(line("npc", await fetchRiddle(s.memory.sphinx.riddle)));
      } catch {
        conv.push(line("system", NPCS.sphinx.offline));
        s.memory.sphinx.done = true;
        refresh();
      }
    }
  }
}

function closeTalk() {
  const s = game.value;
  const id = talking.value;
  controller?.abort();
  // On ne tourne pas le dos à une liche : partir, c'est commencer le combat
  if (s && id === "morgrath" && s.npcs.some((n) => n.id === "morgrath")) startBossFight("neutre");
  talking.value = null;
  nextTick(() => root.value?.focus());
}

function npcSays(id: NpcId, action: NpcAction) {
  const s = game.value!;
  const message = applyNpcAction(s, id, action);
  if (message) conversation(id).push(line("system", message));
  refresh();
}

function startBossFight(humeur: "respect" | "mepris" | "amusement" | "neutre") {
  if (!game.value?.npcs.some((n) => n.id === "morgrath")) return;
  npcSays("morgrath", { type: "combat", humeur });
}

async function say(text: string) {
  const s = game.value;
  const id = talking.value;
  if (!s || !id || busy.value || !canTalk(s, id)) return;
  const conv = conversation(id);

  // Historique : seulement les répliques (pas les messages système), les plus récentes
  const history: TalkHistoryItem[] = conv
    .filter((l) => l.who !== "system" && l.text.trim())
    .slice(-8)
    .map((l) => ({ role: l.who === "hero" ? "user" : "assistant", text: l.text }));

  conv.push(line("hero", text));
  conv.push(line("npc", "", true));
  const reply = conv[conv.length - 1];
  s.memory[id].talks++;
  busy.value = true;
  controller = new AbortController();

  try {
    await streamTalk(
      { npc: id, message: text, history, game: summarize(s), mood: npcMood(s, id) },
      {
        onDelta: (t) => (reply.text += t),
        onAction: (action) => npcSays(id, action),
        signal: controller.signal,
      },
    );
    if (!reply.text.trim()) reply.text = "…";
  } catch (err) {
    if (controller.signal.aborted) return;
    s.memory[id].talks--; // une erreur ne coûte pas de réplique
    conv.splice(conv.indexOf(reply), 1);
    // Message du serveur (limite atteinte…) si on en a un ; sinon le PNJ fait la sourde oreille
    const reason = err instanceof Error && !(err instanceof TypeError) ? err.message : "";
    conv.push(line("system", reason ? `${NPCS[id].offline} (${reason})` : NPCS[id].offline));
    if (id === "morgrath") startBossFight("neutre");
  } finally {
    reply.streaming = false;
    busy.value = false;
    refresh();
    if (talking.value === id && !canTalk(s, id) && s.npcs.some((n) => n.id === id) && conv.at(-1)?.text !== NPCS[id].tired) {
      conv.push(line("npc", NPCS[id].tired));
      if (id === "morgrath") startBossFight("neutre");
    }
  }
}

const dialog = computed(() => {
  void tick.value;
  const s = game.value;
  const id = talking.value;
  if (!s || !id) return null;
  const present = s.npcs.some((n) => n.id === id);
  return {
    npc: NPCS[id],
    lines: conversations[id] ?? [],
    canTalk: canTalk(s, id),
    remaining: Math.max(0, NPCS[id].maxTalks - s.memory[id].talks),
    gold: s.hero.gold,
    present,
    shop: id === "grizzle"
      ? s.shop.map((slot, index) => ({ index, def: itemDef(slot.item.id), price: shopPrice(s, itemDef(slot.item.id)), sold: slot.sold }))
      : undefined,
    sellable: id === "grizzle"
      ? s.hero.inventory.map((i, index) => ({ index, def: itemDef(i.id), price: sellPrice(itemDef(i.id)) })).filter((r) => r.def.kind !== "quete")
      : undefined,
    toll: id === "brutus" ? BRUTUS_TOLL : undefined,
    quick: NPCS[id].quick,
  };
});

function onQuick(index: number) {
  const id = talking.value;
  const q = id ? NPCS[id].quick?.[index] : undefined;
  if (!id || !q) return;
  conversation(id).push(line("hero", q.label + " ?"));
  conversation(id).push(line("npc", q.text));
}

function onBuy(index: number) {
  if (game.value && buy(game.value, index)) conversation("grizzle").push(line("system", `Achat : ${itemDef(game.value.shop[index].item.id).name}.`));
  refresh();
}
function onSell(index: number) {
  const s = game.value;
  if (!s) return;
  const name = itemDef(s.hero.inventory[index].id).name;
  if (sell(s, index)) conversation("grizzle").push(line("system", `Vendu : ${name}.`));
  refresh();
}
function onPay() {
  if (game.value && payBrutus(game.value)) conversation("brutus").push(line("system", "Brutus s'écarte. L'escalier est libre !"));
  refresh();
}
function onAttack() {
  npcSays("brutus", { type: "attaquer" });
  closeTalk();
}
function onFight() {
  startBossFight("neutre");
  closeTalk();
}

// --- Cycle de vie ------------------------------------------------------------------------

onMounted(() => {
  renderer = new Renderer(canvas.value!);
  renderer.start();
  document.addEventListener("fullscreenchange", onFullscreenChange);
});

onBeforeUnmount(() => {
  renderer?.stop();
  controller?.abort();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
});

const hpPercent = computed(() => (view.value ? (view.value.hero.hp / view.value.stats.maxHp) * 100 : 0));
const xpPercent = computed(() => (view.value ? (view.value.hero.xp / view.value.xpNext) * 100 : 0));
const toneClass = (tone: string) => `tone-${tone}`;
</script>

<template>
  <div ref="root" class="game" :class="{ full: fullscreen }" tabindex="0" aria-label="Le Donjon qui parle : jeu" @keydown="onKey">
    <div class="stage">
      <!-- Barre du haut : vie, expérience, or -->
      <div class="hud" v-if="view">
        <div class="bar hp" :title="`${view.hero.hp} / ${view.stats.maxHp} PV`">
          <span class="fill" :style="{ width: `${hpPercent}%` }"></span>
          <span class="label">PV {{ view.hero.hp }}/{{ view.stats.maxHp }}</span>
        </div>
        <div class="bar xp" :title="`${view.hero.xp} / ${view.xpNext} XP`">
          <span class="fill" :style="{ width: `${xpPercent}%` }"></span>
          <span class="label">Niv. {{ view.hero.level }}</span>
        </div>
        <span class="chip gold">{{ view.hero.gold }} or</span>
        <span class="chip">Étage {{ view.floor }}/5</span>
        <span class="chip" :class="{ ready: view.hero.jumpCd === 0, armed: jumpMode }">
          {{ jumpMode ? "Saut : direction ?" : view.hero.jumpCd === 0 ? "Saut prêt" : `Saut ${view.hero.jumpCd}` }}
        </span>
        <button type="button" class="chip full-btn" :aria-pressed="fullscreen" @click="toggleFullscreen">
          {{ fullscreen ? "Réduire" : "Grand écran" }}
        </button>
      </div>
      <div class="hud" v-else>
        <span class="chip">Le Donjon qui parle</span>
        <button type="button" class="chip full-btn" :aria-pressed="fullscreen" @click="toggleFullscreen">
          {{ fullscreen ? "Réduire" : "Grand écran" }}
        </button>
      </div>

      <div class="screen">
        <canvas
          ref="canvas"
          :style="{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }"
          aria-label="Le donjon vu de dessus"
          role="img"
          @click="onCanvasClick"
        ></canvas>

        <div v-if="banner" :key="banner.key" class="banner" aria-live="polite">
          <strong>{{ banner.title }}</strong>
          <span>{{ banner.text }}</span>
        </div>

        <div v-if="view?.boss" class="bossbar">
          <span>Morgrath</span>
          <span class="track"><span class="fill" :style="{ width: `${(view.boss.hp / view.boss.maxHp) * 100}%` }"></span></span>
        </div>

        <!-- Écran titre -->
        <div v-if="!view" class="overlay title">
          <img :src="spriteUrl('hero', 96)" alt="" width="96" height="96" />
          <h2>Le Donjon qui parle</h2>
          <p>Cinq étages, des monstres, des trésors… et des personnages à qui tu peux vraiment parler.</p>
          <form class="start" @submit.prevent="start">
            <label for="hero-name">Ton nom de traceur</label>
            <div>
              <input id="hero-name" v-model="heroName" maxlength="20" placeholder="Traceur" autocomplete="off" />
              <button type="submit" class="go">Entrer dans le donjon</button>
            </div>
          </form>
          <p v-if="bestFloor" class="best">Ton record : étage {{ bestFloor }}<template v-if="bestScore"> · {{ bestScore }} points</template></p>
        </div>

        <!-- Fin de partie -->
        <div v-else-if="view.status !== 'playing'" class="overlay end" :class="view.status">
          <h2>{{ view.status === "won" ? "Victoire !" : "Tu es mort" }}</h2>
          <p class="sub">
            {{ view.status === "won" ? `${view.hero.name} a vaincu Morgrath et libéré le donjon.` : `${view.hero.name} est tombé à l'étage ${view.floor}, ${view.floorName}.` }}
          </p>
          <p class="score">Score : {{ view.score }}<span v-if="view.score >= bestScore"> · nouveau record !</span></p>
          <dl class="summary">
            <div><dt>Niveau</dt><dd>{{ view.hero.level }}</dd></div>
            <div><dt>Ennemis</dt><dd>{{ view.kills }}</dd></div>
            <div><dt>Tours</dt><dd>{{ view.turn }}</dd></div>
            <div><dt>Sauts</dt><dd>{{ view.gameStats.jumps }}</dd></div>
            <div><dt>Or gagné</dt><dd>{{ view.gameStats.goldEarned }}</dd></div>
            <div><dt>Élites</dt><dd>{{ view.gameStats.elites }}</dd></div>
            <div><dt>Sournoises</dt><dd>{{ view.gameStats.sneaks }}</dd></div>
            <div><dt>Coffres</dt><dd>{{ view.gameStats.chests }}</dd></div>
          </dl>
          <div v-if="view.chronicle.length" class="chronicle">
            <h3>Ta légende</h3>
            <ul>
              <li v-for="(c, i) in view.chronicle.slice(-6)" :key="i">{{ c }}</li>
            </ul>
          </div>
          <button type="button" class="go" @click="start">Rejouer</button>
        </div>
      </div>

      <!-- Contrôles tactiles -->
      <div v-if="view && view.status === 'playing'" class="pad" aria-label="Contrôles tactiles">
        <div class="dirs">
          <button
            v-for="[dx, dy, label] in PAD"
            :key="label"
            type="button"
            :aria-label="dx || dy ? `Aller ${label}` : 'Attendre'"
            @click="padPress(dx, dy)"
          >{{ label }}</button>
        </div>
        <div class="acts">
          <button type="button" :class="{ armed: jumpMode }" @click="toggleJump">Saut</button>
          <button type="button" @click="interact">Action</button>
        </div>
      </div>
    </div>

    <aside class="side">
      <NpcDialog
        v-if="dialog"
        :npc="dialog.npc"
        :lines="dialog.lines"
        :busy="busy"
        :can-talk="dialog.canTalk"
        :remaining="dialog.remaining"
        :gold="dialog.gold"
        :present="dialog.present"
        :shop="dialog.shop"
        :sellable="dialog.sellable"
        :toll="dialog.toll"
        :quick="dialog.quick"
        @send="say"
        @close="closeTalk"
        @buy="onBuy"
        @sell="onSell"
        @pay="onPay"
        @attack="onAttack"
        @fight="onFight"
        @quick="onQuick"
      />

      <template v-else-if="view">
        <section class="block">
          <h3>{{ view.hero.name }}</h3>
          <dl class="stats">
            <div><dt>Attaque</dt><dd>{{ view.stats.atk }}</dd></div>
            <div><dt>Défense</dt><dd>{{ view.stats.def }}</dd></div>
            <div><dt>Agilité</dt><dd>{{ view.stats.agi }}</dd></div>
            <div><dt>Vision</dt><dd>{{ view.stats.vision }}</dd></div>
          </dl>
          <p v-if="view.statuses.length" class="statuses">
            <span v-for="st in view.statuses" :key="st">{{ st }}</span>
          </p>
        </section>

        <section class="block">
          <h4>Équipement</h4>
          <ul class="gear">
            <li v-for="g in view.equipment" :key="g.slot">
              <button type="button" class="slot" :disabled="!g.def" :title="g.def ? `${g.def.name} : ${g.def.description} (clic pour retirer)` : ''" @click="unequip(g.slot)">
                <img v-if="g.def" :src="spriteUrl(g.def.id, 32)" alt="" width="32" height="32" />
              </button>
              <span>
                <small>{{ SLOT_LABEL[g.slot] }}</small>
                <strong v-if="g.def" :style="{ color: RARITY_COLOR[g.def.rarity] }">{{ g.def.name }}</strong>
                <em v-else>vide</em>
              </span>
            </li>
          </ul>
        </section>

        <section class="block">
          <h4>Sac <small>{{ view.inventory.length }}/{{ INVENTORY_SIZE }}</small></h4>
          <ul class="bag">
            <li v-for="(def, i) in view.inventory" :key="i">
              <button
                type="button"
                class="slot"
                :class="{ on: selected === i }"
                :style="{ borderColor: RARITY_COLOR[def.rarity] }"
                :title="`${i < 9 ? `[${i + 1}] ` : ''}${def.name}`"
                @click="selected = selected === i ? null : i"
              >
                <img :src="spriteUrl(def.id, 32)" :alt="def.name" width="32" height="32" />
                <span v-if="i < 9" class="key">{{ i + 1 }}</span>
              </button>
            </li>
            <li v-for="n in INVENTORY_SIZE - view.inventory.length" :key="`e${n}`"><span class="slot empty"></span></li>
          </ul>

          <div v-if="selectedDef" class="detail">
            <p class="name" :style="{ color: RARITY_COLOR[selectedDef.rarity] }">{{ selectedDef.name }}</p>
            <p class="kind">{{ KIND_LABEL[selectedDef.kind] }} · {{ RARITY_LABEL[selectedDef.rarity] }}</p>
            <p>{{ selectedDef.description }}</p>
            <p v-if="bonusLine(selectedDef)" class="special">{{ bonusLine(selectedDef) }}</p>
            <p class="flavor">{{ selectedDef.flavor }}</p>
            <div class="row">
              <button type="button" class="use" @click="useSelected">{{ isEquipment(selectedDef) ? "Équiper" : "Utiliser" }}</button>
              <button type="button" @click="dropSelected">Poser</button>
            </div>
          </div>
        </section>

        <section class="block log">
          <h4>Journal</h4>
          <div class="log-lines" aria-live="polite">
            <p v-for="entry in view.log" :key="entry.id" :class="toneClass(entry.tone)">{{ entry.text }}</p>
          </div>
        </section>

        <details class="block keys">
          <summary>Commandes</summary>
          <ul>
            <li><kbd>↑↓←→</kbd> <kbd>ZQSD</kbd> <kbd>WASD</kbd> : bouger, attaquer</li>
            <li><kbd>Espace</kbd> + direction : sauter 2 cases</li>
            <li><kbd>Entrée</kbd> <kbd>E</kbd> : descendre, parler</li>
            <li><kbd>1</kbd>–<kbd>9</kbd> : objet du sac · <kbd>R</kbd> : attendre</li>
            <li>Diagonale depuis un angle de mur : attaque sournoise</li>
            <li><kbd>F</kbd> : grand écran</li>
          </ul>
        </details>
      </template>

      <section v-else class="block help">
        <h3>Comment jouer</h3>
        <ul>
          <li><kbd>↑ ↓ ← →</kbd>, <kbd>ZQSD</kbd> ou <kbd>WASD</kbd> : se déplacer, foncer dans un ennemi pour l'attaquer.</li>
          <li>Pavé numérique : les diagonales, même au coin d'un mur. Ou clique / tape sur le donjon.</li>
          <li>Frapper depuis un angle de mur, ou un ennemi qui ne t'a pas vu : <strong>attaque sournoise</strong>, +60 % de dégâts.</li>
          <li><kbd>Espace</kbd> puis une direction (ou <kbd>Maj</kbd> + direction) : sauter 2 cases, même par-dessus un ennemi, qui reste étourdi.</li>
          <li><kbd>Entrée</kbd> ou <kbd>E</kbd> : descendre l'escalier, parler à un personnage.</li>
          <li><kbd>1</kbd>–<kbd>9</kbd> : utiliser un objet du sac. <kbd>R</kbd> ou <kbd>.</kbd> : attendre.</li>
          <li><kbd>F</kbd> : grand écran.</li>
          <li>Les personnages marqués d'un <strong class="bang">!</strong> te répondent vraiment. Claude, le guide, t'attend à l'entrée.</li>
        </ul>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.game {
  display: grid;
  grid-template-columns: minmax(0, 672px) minmax(280px, 1fr);
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: #12101a;
  color: #e6e7e8;
}
.game:focus {
  outline: none;
}
.game:focus-visible {
  outline: 3px solid var(--teal);
  outline-offset: 2px;
}
.stage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

/* --- Barre du haut --- */
.hud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 13px;
}
.bar {
  position: relative;
  flex: 1 1 120px;
  height: 22px;
  border-radius: 4px;
  background: #2a2638;
  overflow: hidden;
}
.bar .fill {
  position: absolute;
  inset: 0 auto 0 0;
  transition: width 0.2s;
}
.hp .fill { background: linear-gradient(#e8434a, #9e2430); }
.xp .fill { background: linear-gradient(#49c0b2, #2b8a7e); }
.bar .label {
  position: relative;
  display: block;
  padding: 0 8px;
  line-height: 22px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 0 #000;
}
.chip {
  padding: 2px 8px;
  border-radius: 4px;
  background: #1d1a29;
  line-height: 18px;
}
.chip.gold { color: #ffd23f; }
.full-btn {
  margin-left: auto;
  border: 0;
  color: #e6e7e8;
  font: inherit;
  cursor: pointer;
}
.full-btn:hover {
  background: #2f2a44;
}
.score {
  font-family: "JetBrains Mono", monospace;
  font-size: 18px;
  color: #ffd23f !important;
}

/* --- Grand écran : le jeu occupe tout l'écran, le donjon prend toute la hauteur --- */
.game.full {
  position: fixed;
  inset: 0;
  z-index: 1000;
  grid-template-columns: minmax(0, 1fr) 340px;
  height: 100dvh;
  border: 0;
  border-radius: 0;
  overflow-y: auto;
}
.game.full .screen {
  display: flex;
  justify-content: center;
}
.game.full canvas {
  width: auto;
  max-width: 100%;
  height: calc(100dvh - 90px);
}
.chip.ready { color: #49c0b2; }
.chip.armed { background: #49c0b2; color: #0a2540; }

/* --- Écran de jeu --- */
.screen {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background: #07060b;
}
canvas {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  cursor: pointer;
  touch-action: manipulation;
}
.banner {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  width: min(90%, 520px);
  padding: 12px 16px;
  border: 2px solid #49c0b2;
  border-radius: 6px;
  background: rgba(10, 9, 16, 0.92);
  text-align: center;
  animation: banner 3s ease forwards;
  pointer-events: none;
}
.banner strong {
  display: block;
  font-size: 22px;
  font-stretch: 75%;
  color: #ffffff;
}
.banner span {
  font-size: 14px;
  color: #c9d1d9;
}
@keyframes banner {
  0% { opacity: 0; transform: translate(-50%, -8px); }
  10%, 80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; }
}
.bossbar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-stretch: 75%;
  color: #7cff6b;
  text-shadow: 0 1px 0 #000;
}
.bossbar .track {
  flex: 1;
  height: 10px;
  border: 2px solid #14101c;
  background: #2a2638;
}
.bossbar .fill {
  display: block;
  height: 100%;
  background: #7cff6b;
  transition: width 0.2s;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 24px;
  background: rgba(7, 6, 11, 0.9);
  text-align: center;
  overflow-y: auto;
}
/* Centré verticalement, mais jamais coupé en haut quand le contenu déborde */
.overlay > :first-child {
  margin-top: auto;
}
.overlay > :last-child {
  margin-bottom: auto;
}
.overlay h2 {
  margin: 0;
  font-size: clamp(36px, 6vw, 60px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  color: #ffffff;
}
.overlay p {
  margin: 0;
  max-width: 46ch;
  color: #c9d1d9;
}
.title img {
  image-rendering: pixelated;
}
.start {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.start label {
  font-size: 14px;
  color: #9aa5b1;
}
.start div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.start input {
  min-height: 44px;
  padding: 0 12px;
  border: 2px solid #3a3550;
  border-radius: 4px;
  background: #0b0a11;
  color: #ffffff;
  font: inherit;
}
.go {
  min-height: 44px;
  padding: 8px 18px;
  border: 2px solid #0070c0;
  border-radius: 4px;
  background: #0070c0;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.go:hover {
  background: #005a9c;
}
.best {
  font-size: 14px;
  color: #ffd23f !important;
}
.end.won h2 { color: #ffd23f; }
.end.dead h2 { color: #ff6b6b; }
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 18px;
  margin: 6px 0;
}
.summary div { text-align: center; }
.summary dt { font-size: 12px; color: #9aa5b1; }
.summary dd { margin: 0; font-family: "JetBrains Mono", monospace; font-size: 20px; color: #ffffff; }
.chronicle h3 {
  margin: 4px 0;
  font-size: 18px;
  color: #49c0b2;
}
.chronicle ul {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  font-size: 14px;
  color: #c9d1d9;
}

/* --- Contrôles tactiles : seulement sans clavier ni souris précise --- */
.pad {
  display: none;
  justify-content: center;
  align-items: center;
  gap: 18px;
}
.dirs {
  display: grid;
  grid-template-columns: repeat(3, 48px);
  gap: 4px;
}
.pad button {
  min-height: 48px;
  border: 2px solid #3a3550;
  border-radius: 6px;
  background: #1d1a29;
  color: #ffffff;
  font: inherit;
  font-size: 18px;
  font-weight: 700;
}
.acts {
  display: grid;
  gap: 6px;
}
.acts button {
  padding: 0 18px;
  font-size: 16px;
}
.pad button.armed {
  background: #49c0b2;
  color: #0a2540;
}
@media (hover: none), (pointer: coarse) {
  .pad { display: flex; }
}

/* --- Panneau de droite --- */
.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.block h3 {
  margin: 0 0 6px;
  font-size: 26px;
  color: #ffffff;
}
.block h4 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9aa5b1;
}
.block h4 small {
  font-weight: 600;
  letter-spacing: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
}
.stats div {
  padding: 4px 6px;
  border-radius: 4px;
  background: #1d1a29;
}
.stats dt { font-size: 11px; color: #9aa5b1; }
.stats dd { margin: 0; font-family: "JetBrains Mono", monospace; font-weight: 600; color: #ffffff; }
.statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0 0;
}
.statuses span {
  padding: 1px 6px;
  border-radius: 3px;
  background: #2a2638;
  font-size: 12px;
}
.gear {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gear li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.gear small {
  display: block;
  font-size: 11px;
  color: #9aa5b1;
}
.gear em {
  color: #6b7480;
}
.slot {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 2px solid #3a3550;
  border-radius: 6px;
  background: #1d1a29;
  cursor: pointer;
}
.slot img {
  image-rendering: pixelated;
}
.slot.on {
  background: #2f2a44;
  box-shadow: 0 0 0 2px #ffffff;
}
.slot.empty {
  border-style: dashed;
  cursor: default;
}
.slot:disabled {
  cursor: default;
}
.slot .key {
  position: absolute;
  right: 2px;
  bottom: 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  color: #9aa5b1;
}
.bag {
  display: grid;
  grid-template-columns: repeat(6, 42px);
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.detail {
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  background: #1d1a29;
  font-size: 14px;
}
.detail p {
  margin: 0 0 4px;
}
.detail .name {
  font-size: 18px;
  font-weight: 800;
}
.detail .kind {
  font-size: 12px;
  color: #9aa5b1;
}
.detail .special {
  color: #49c0b2;
}
.detail .flavor {
  font-style: italic;
  color: #9aa5b1;
}
.detail .row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.detail button {
  min-height: 34px;
  padding: 4px 12px;
  border: 2px solid #3a3550;
  border-radius: 4px;
  background: #12101a;
  color: #e6e7e8;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.detail button.use {
  border-color: #0070c0;
  background: #0070c0;
  color: #ffffff;
}
.log-lines {
  max-height: 170px;
  overflow-y: auto;
}
.log p {
  margin: 0 0 3px;
  font-size: 13px;
  line-height: 1.4;
  color: #9aa5b1;
}
.log p:first-child {
  color: #ffffff;
}
.log p:not(:first-child) { opacity: 0.8; }
.tone-good { color: #7cd36b !important; }
.tone-bad { color: #ff8a8a !important; }
.tone-loot { color: #ffd23f !important; }
.tone-rare { color: #b48cff !important; }
.tone-level { color: #ffb627 !important; font-weight: 700; }
.tone-npc { color: #49c0b2 !important; }
.keys summary {
  font-size: 13px;
  font-weight: 700;
  color: #9aa5b1;
  cursor: pointer;
}
.keys ul {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 13px;
}
.help ul {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
}
.help li + li {
  margin-top: 6px;
}
kbd {
  padding: 0 4px;
  border: 1px solid #3a3550;
  border-radius: 3px;
  background: #1d1a29;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
}
.bang {
  color: #ffd23f;
}

@media (max-width: 960px) {
  .game,
  .game.full {
    grid-template-columns: minmax(0, 1fr);
    padding: 10px;
  }
  .game.full canvas {
    width: 100%;
    height: auto;
  }
}
</style>
