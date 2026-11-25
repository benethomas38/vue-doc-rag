<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { DialogLine, SellRow, ShopRow } from "../../lib/game/talk";
import type { NpcInfo, QuickAnswer } from "../../lib/game/data/world";
import { RARITY_COLOR } from "../../lib/game/data/items";
import { spriteUrl } from "../../lib/game/sprites";

const props = defineProps<{
  npc: NpcInfo;
  lines: DialogLine[];
  busy: boolean;
  canTalk: boolean;
  remaining: number;        // répliques restantes
  gold: number;
  present: boolean;         // le PNJ est encore là (Brutus peut partir, la liche se battre)
  shop?: ShopRow[];
  sellable?: SellRow[];
  toll?: number;            // Brutus : prix du passage
  quick?: QuickAnswer[];    // réponses toutes prêtes (le guide)
}>();

const emit = defineEmits<{
  send: [text: string];
  close: [];
  buy: [index: number];
  sell: [index: number];
  pay: [];
  attack: [];
  fight: [];
  quick: [index: number];
}>();

const MAX_LENGTH = 280;
const draft = ref("");
const scroller = ref<HTMLElement | null>(null);
const input = ref<HTMLTextAreaElement | null>(null);
const tab = ref<"acheter" | "vendre">("acheter");

function submit() {
  const text = draft.value.trim();
  if (!text || props.busy || !props.canTalk) return;
  emit("send", text);
  draft.value = "";
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

// Toujours afficher la dernière réplique
watch(
  () => props.lines.map((l) => l.text.length).join(),
  async () => {
    await nextTick();
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight });
  },
  { immediate: true },
);

watch(
  () => props.npc.id,
  async () => {
    await nextTick();
    input.value?.focus();
  },
  { immediate: true },
);

const portrait = (id: string) => spriteUrl(id === "morgrath" ? "liche" : id, 64);
</script>

<template>
  <section class="dialog" :aria-label="`Discussion avec ${npc.name}`" @keydown.esc="emit('close')">
    <header class="who">
      <img :src="portrait(npc.id)" alt="" width="64" height="64" />
      <div>
        <h3>{{ npc.name }}</h3>
        <p>{{ npc.title }}</p>
      </div>
      <button type="button" class="close" aria-label="Fermer la discussion" @click="emit('close')">✕</button>
    </header>

    <div ref="scroller" class="lines" aria-live="polite">
      <p v-for="line in lines" :key="line.id" class="line" :class="line.who">
        <template v-if="line.who === 'system'">{{ line.text }}</template>
        <template v-else>
          <strong>{{ line.who === "hero" ? "Toi" : npc.name }}</strong>
          {{ line.text }}<span v-if="line.streaming" class="caret" aria-hidden="true">▍</span>
        </template>
      </p>
    </div>

    <!-- Le guide : sujets en un clic, sans appel à l'IA -->
    <div v-if="quick?.length" class="choices quick">
      <button v-for="(q, i) in quick" :key="q.label" type="button" :disabled="busy" @click="emit('quick', i)">{{ q.label }}</button>
    </div>

    <!-- Boutique de Grizzle -->
    <div v-if="shop && present" class="shop">
      <div class="tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="tab === 'acheter'" @click="tab = 'acheter'">Acheter</button>
        <button type="button" role="tab" :aria-selected="tab === 'vendre'" @click="tab = 'vendre'">Vendre</button>
        <span class="gold">{{ gold }} or</span>
      </div>
      <ul v-if="tab === 'acheter'">
        <li v-for="row in shop" :key="row.index" :class="{ sold: row.sold }">
          <img :src="spriteUrl(row.def.id, 24)" alt="" width="24" height="24" />
          <span class="name" :style="{ color: RARITY_COLOR[row.def.rarity] }" :title="row.def.description">{{ row.def.name }}</span>
          <span class="desc">{{ row.def.description }}</span>
          <button type="button" :disabled="row.sold || gold < row.price" @click="emit('buy', row.index)">
            {{ row.sold ? "Vendu" : `${row.price} or` }}
          </button>
        </li>
      </ul>
      <ul v-else>
        <li v-if="!sellable?.length" class="empty">Rien à vendre.</li>
        <li v-for="row in sellable" :key="row.index">
          <img :src="spriteUrl(row.def.id, 24)" alt="" width="24" height="24" />
          <span class="name" :style="{ color: RARITY_COLOR[row.def.rarity] }">{{ row.def.name }}</span>
          <span class="desc">{{ row.def.description }}</span>
          <button type="button" @click="emit('sell', row.index)">+{{ row.price }} or</button>
        </li>
      </ul>
    </div>

    <!-- Brutus : payer ou se battre -->
    <div v-if="toll && present" class="choices">
      <button type="button" class="pay" :disabled="gold < toll" @click="emit('pay')">Payer {{ toll }} or</button>
      <button type="button" class="danger" @click="emit('attack')">Attaquer Brutus</button>
    </div>

    <!-- La liche : on peut couper court -->
    <div v-if="npc.id === 'morgrath' && present" class="choices">
      <button type="button" class="danger" @click="emit('fight')">Assez parlé : combattre !</button>
    </div>

    <form v-if="present" class="say" @submit.prevent="submit">
      <label class="sr" :for="`say-${npc.id}`">Ta réplique</label>
      <textarea
        :id="`say-${npc.id}`"
        ref="input"
        v-model="draft"
        rows="2"
        :maxlength="MAX_LENGTH"
        :placeholder="canTalk ? npc.placeholder : `${npc.name} n'a plus rien à te dire.`"
        :disabled="!canTalk"
        @keydown="onKey"
      ></textarea>
      <div class="send">
        <span class="left">{{ canTalk ? `${remaining} réplique${remaining > 1 ? "s" : ""}` : "" }}</span>
        <button type="submit" class="btn-send" :disabled="busy || !canTalk || !draft.trim()">
          {{ busy ? "…" : "Dire" }}
        </button>
      </div>
    </form>
    <button v-else type="button" class="leave" @click="emit('close')">Continuer l'exploration</button>
  </section>
</template>

<style scoped>
.dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}
.who {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who img {
  image-rendering: pixelated;
  background: #1d1a29;
  border: 2px solid #3a3550;
  border-radius: 6px;
}
.who h3 {
  margin: 0;
  font-size: 26px;
  color: #ffffff;
}
.who p {
  margin: 0;
  color: #9aa5b1;
  font-size: 14px;
}
.close {
  margin-left: auto;
  align-self: flex-start;
  background: none;
  border: 0;
  color: #9aa5b1;
  font-size: 18px;
  cursor: pointer;
}
.lines {
  flex: 1;
  min-height: 120px;
  max-height: 260px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 6px;
  background: #0b0a11;
}
.line {
  margin: 0 0 8px;
  font-size: 15px;
  line-height: 1.45;
  color: #e6e7e8;
}
.line strong {
  color: #ffd23f;
}
.line.hero strong {
  color: #49c0b2;
}
.line.system {
  padding: 4px 8px;
  border-left: 3px solid #b48cff;
  color: #d0b0ff;
  font-size: 14px;
}
.caret {
  animation: blink 0.9s steps(2) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

.shop ul {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 210px;
  overflow-y: auto;
}
.shop li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  grid-template-areas: "icon name btn" "icon desc btn";
  column-gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-top: 1px solid #2a2638;
  font-size: 14px;
}
.shop li img {
  grid-area: icon;
  image-rendering: pixelated;
}
.shop .name {
  grid-area: name;
  font-weight: 700;
}
.shop .desc {
  grid-area: desc;
  color: #9aa5b1;
  font-size: 12px;
}
.shop li button {
  grid-area: btn;
}
.shop li.sold {
  opacity: 0.45;
}
.shop .empty {
  display: block;
  color: #9aa5b1;
}
.tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
.tabs button[aria-selected="true"] {
  background: #49c0b2;
  border-color: #49c0b2;
  color: #0a2540;
}
.gold {
  margin-left: auto;
  color: #ffd23f;
  font-family: "JetBrains Mono", monospace;
  font-weight: 600;
}
button {
  min-height: 34px;
  padding: 4px 12px;
  border: 2px solid #3a3550;
  border-radius: 4px;
  background: #1d1a29;
  color: #e6e7e8;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: #49c0b2;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.quick button {
  border-color: #d9774b;
  color: #ffd2bd;
}
.pay {
  border-color: #c9971c;
  color: #ffd23f;
}
.danger {
  border-color: #9e2430;
  color: #ff8a8a;
}
.say textarea {
  width: 100%;
  padding: 8px 10px;
  border: 2px solid #3a3550;
  border-radius: 6px;
  background: #0b0a11;
  color: #ffffff;
  font: inherit;
  font-size: 15px;
  resize: none;
}
.say textarea:focus {
  outline: none;
  border-color: #49c0b2;
}
.send {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.left {
  color: #9aa5b1;
  font-size: 13px;
}
.btn-send {
  border-color: #0070c0;
  background: #0070c0;
  color: #ffffff;
}
.leave {
  border-color: #49c0b2;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
