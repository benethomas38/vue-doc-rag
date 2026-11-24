<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "../../composables/useChat";
import { renderAnswer } from "../../lib/markdown";

const props = defineProps<{ message: Message }>();

const html = computed(() => renderAnswer(props.message.text, props.message.allSources));
const isStreaming = computed(() => props.message.status === "streaming");
</script>

<template>
  <article v-if="message.role === 'user'" class="msg msg--user">
    {{ message.text }}
  </article>

  <article v-else class="msg msg--assistant" :aria-busy="isStreaming">
    <p v-if="isStreaming && !message.text" class="thinking">
      <span class="dot" /><span class="dot" /><span class="dot" />
      Recherche dans la documentation…
    </p>

    <!-- HTML nettoyé par DOMPurify dans renderAnswer -->
    <div class="answer" :class="{ 'answer--streaming': isStreaming && message.text }" v-html="html" />

    <p v-if="message.status === 'error'" class="error" role="alert">
      {{ message.error }}
    </p>

    <footer v-if="message.sources.length" class="sources">
      <h3>Sources dans la doc Vue</h3>
      <ul>
        <li v-for="s in message.sources" :key="s.n">
          <a :href="s.url" target="_blank" rel="noopener">
            <span class="sources__n">{{ s.n }}</span>
            <span class="sources__title">{{ s.title }}</span>
          </a>
        </li>
      </ul>
    </footer>
  </article>
</template>

<style scoped>
.msg {
  max-width: 100%;
  animation: rise 0.25s ease-out;
}
.msg--user {
  align-self: flex-end;
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msg--assistant {
  align-self: stretch;
}

.thinking {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  margin: 0;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: blink 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; margin-right: 6px; }

/* Curseur clignotant à la fin du texte pendant le streaming */
.answer--streaming > :deep(:last-child)::after {
  content: "▍";
  margin-left: 2px;
  color: var(--accent);
  animation: blink 1s steps(2) infinite;
}

.error {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
}

.sources {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.sources h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}
.sources ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sources a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 5px 10px 5px 5px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  text-decoration: none;
  font-size: 0.85rem;
  transition: border-color 0.15s;
}
.sources a:hover {
  border-color: var(--accent);
}
.sources__n {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 700;
}
.sources__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes blink {
  50% { opacity: 0.2; }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
}
</style>
