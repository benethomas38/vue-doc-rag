<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import ChatMessage from "./ChatMessage.vue";
import QuestionForm from "./QuestionForm.vue";
import { useChat } from "../../composables/useChat";

const { messages, loading, ask, reset } = useChat();
const question = ref("");
const form = ref<InstanceType<typeof QuestionForm> | null>(null);
const list = ref<HTMLElement | null>(null);

const examples = [
  "Quelle différence entre computed et watch ?",
  "Comment passer des données d'un parent à un enfant ?",
  "À quoi sert v-model sur un composant ?",
  "Comment fonctionne provide / inject ?",
];

function submit(text = question.value) {
  const q = text.trim();
  if (!q || loading.value) return;
  question.value = "";
  ask(q);
}

function newChat() {
  reset();
  form.value?.focus();
}

// Suit la réponse pendant qu'elle s'écrit (dans la fenêtre du chat, pas toute la page)
watch(
  messages,
  async () => {
    await nextTick();
    list.value?.scrollTo({ top: list.value.scrollHeight, behavior: "smooth" });
  },
  { deep: true },
);
</script>

<template>
  <div class="chat">
    <div class="chat__bar">
      <span class="chat__title"><span class="live" aria-hidden="true" />Démo en direct</span>
      <button v-if="messages.length" class="link" :disabled="loading" @click="newChat">
        Nouvelle conversation
      </button>
    </div>

    <div ref="list" class="chat__list" aria-live="polite">
      <div v-if="!messages.length" class="empty">
        <p>Pose une question sur Vue.js, ou essaie un exemple :</p>
        <ul class="examples">
          <li v-for="ex in examples" :key="ex">
            <button @click="submit(ex)">{{ ex }}</button>
          </li>
        </ul>
      </div>
      <ChatMessage v-for="m in messages" :key="m.id" :message="m" />
    </div>

    <div class="chat__composer">
      <QuestionForm ref="form" v-model="question" :disabled="loading" @submit="submit()" />
    </div>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100dvh - 120px));
  border: 1px solid var(--border);
  border-radius: 18px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
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
  gap: 24px;
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
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.examples button:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
</style>
