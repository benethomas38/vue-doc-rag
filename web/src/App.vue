<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import ChatMessage from "./components/ChatMessage.vue";
import QuestionForm from "./components/QuestionForm.vue";
import { useChat } from "./composables/useChat";

const { messages, loading, ask, reset } = useChat();
const question = ref("");
const form = ref<InstanceType<typeof QuestionForm> | null>(null);

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

// Suit la réponse pendant qu'elle s'écrit
watch(
  messages,
  async () => {
    await nextTick();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  },
  { deep: true },
);
</script>

<template>
  <div class="layout">
    <header class="top">
      <div class="brand">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <path d="M3 5h7l6 10 6-10h7L16 27z" fill="var(--accent)" />
          <path d="M9.5 5h4L16 9.5 18.5 5h4L16 16z" fill="var(--accent-strong)" />
        </svg>
        <span>Vue Doc <strong>Assistant</strong></span>
      </div>
      <button v-if="messages.length" class="ghost" :disabled="loading" @click="newChat">
        Nouvelle conversation
      </button>
    </header>

    <main class="chat">
      <section v-if="!messages.length" class="empty">
        <h1>Une question sur Vue.js ?</h1>
        <p>
          Les réponses s'appuient uniquement sur la documentation officielle,
          avec un lien vers chaque passage utilisé.
        </p>
        <ul class="examples">
          <li v-for="ex in examples" :key="ex">
            <button @click="submit(ex)">{{ ex }}</button>
          </li>
        </ul>
      </section>

      <ChatMessage v-for="m in messages" :key="m.id" :message="m" />
    </main>

    <footer class="composer">
      <QuestionForm ref="form" v-model="question" :disabled="loading" @submit="submit()" />
      <p class="hint">
        Recherche hybride (vecteurs + BM25) · Réponses générées par Claude
      </p>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  max-width: 760px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.top {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(8px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
}
.ghost {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  padding: 6px 12px;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.ghost:hover:not(:disabled) {
  border-color: var(--accent);
}
.ghost:disabled {
  opacity: 0.5;
}

.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 0 24px;
}

.empty {
  margin: auto 0;
  padding: 40px 0;
}
.empty h1 {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  letter-spacing: -0.02em;
  margin: 0 0 8px;
}
.empty p {
  color: var(--muted);
  margin: 0 0 24px;
  max-width: 52ch;
}
.examples {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

.composer {
  position: sticky;
  bottom: 0;
  padding: 12px 0 16px;
  background: linear-gradient(transparent, var(--bg) 30%);
}
.hint {
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
