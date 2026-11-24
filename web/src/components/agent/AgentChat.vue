<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import QuestionForm from "../rag/QuestionForm.vue";
import AgentStep from "./AgentStep.vue";
import DraftCard from "./DraftCard.vue";
import DemoAgenda from "./DemoAgenda.vue";
import { useAgent, type Draft } from "../../composables/useAgent";

const { session, turns, loading, agendaVersion, run, publish, reset } = useAgent();
const request = ref("");
const form = ref<InstanceType<typeof QuestionForm> | null>(null);
const list = ref<HTMLElement | null>(null);

const examples = [
  "Organise un jam samedi à 14 h à la Bastille, 30 places, ouvert aux débutants.",
  "Une initiation pour les 8-12 ans mercredi prochain à 15 h au parc Mistral.",
  "Entraînement en salle jeudi à 19 h pour les confirmés.",
  "Sortie au campus le 12 décembre, de 10 h à midi.",
];

function submit(text = request.value) {
  const r = text.trim();
  if (!r || loading.value) return;
  request.value = "";
  run(r);
}

function edit(draft: Draft) {
  request.value = `Modifie la fiche « ${draft.titre} » : `;
  form.value?.focus();
}

function newChat() {
  reset();
  form.value?.focus();
}

// Suit l'agent pendant qu'il travaille (dans la fenêtre du chat, pas toute la page)
watch(
  turns,
  async () => {
    await nextTick();
    list.value?.scrollTo({ top: list.value.scrollHeight, behavior: "smooth" });
  },
  { deep: true },
);
</script>

<template>
  <div class="layout">
    <div class="chat">
      <div class="chat__bar">
        <span class="chat__title">Assistant AGP</span>
        <button v-if="turns.length" class="link" :disabled="loading" @click="newChat">Nouvelle demande</button>
      </div>

      <div ref="list" class="chat__list" aria-live="polite">
        <div v-if="!turns.length" class="empty">
          <p>Décris l'événement à organiser, comme tu l'écrirais à un bénévole, ou pars d'un exemple :</p>
          <ul class="examples">
            <li v-for="ex in examples" :key="ex">
              <button @click="submit(ex)">{{ ex }}</button>
            </li>
          </ul>
        </div>

        <template v-for="t in turns" :key="t.id">
          <article v-if="t.role === 'user'" class="msg msg--user">{{ t.text }}</article>

          <article v-else class="msg msg--agent" :aria-busy="t.status === 'running'">
            <template v-for="(p, i) in t.parts" :key="i">
              <p v-if="p.kind === 'text'" class="text">{{ p.text }}</p>
              <AgentStep v-else-if="p.kind === 'step'" :step="p.step" />
              <DraftCard v-else :draft="p.draft" @publish="publish(p.draft)" @edit="edit(p.draft)" />
            </template>

            <p v-if="t.status === 'running'" class="thinking">
              <span class="dot" /><span class="dot" /><span class="dot" />
              L'agent réfléchit…
            </p>
            <p v-if="t.status === 'error'" class="error" role="alert">{{ t.error }}</p>
          </article>
        </template>
      </div>

      <div class="chat__composer">
        <QuestionForm
          ref="form"
          v-model="request"
          :disabled="loading"
          placeholder="Décris l'événement à organiser…"
          @submit="submit()"
        />
      </div>
    </div>

    <DemoAgenda :session="session" :version="agendaVersion" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.chat {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100dvh - 120px));
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--bg-soft);
  overflow: hidden;
}
.chat__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.85rem;
}
.chat__title {
  font-weight: 600;
}
.link {
  border: 0;
  background: none;
  color: var(--accent-strong);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chat__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 16px;
}
.chat__composer {
  padding: 12px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.empty {
  margin: auto 0;
}
.empty p {
  margin: 0 0 12px;
  color: var(--muted);
}
.examples {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 8px;
}
.examples button {
  width: 100%;
  height: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.examples button:hover {
  border-color: var(--accent);
}

.msg--user {
  align-self: flex-end;
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--accent-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msg--agent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.text {
  margin: 0;
  white-space: pre-wrap;
}
.thinking {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--muted);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: blink 1.2s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
  margin-right: 6px;
}
.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--danger-soft);
  color: var(--danger);
}
@keyframes blink {
  50% {
    opacity: 0.2;
  }
}
@media (max-width: 860px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
