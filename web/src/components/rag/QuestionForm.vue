<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const model = defineModel<string>({ required: true });
withDefaults(defineProps<{ disabled: boolean; placeholder?: string }>(), {
  placeholder: "Pose ta question sur Vue.js…",
});
const emit = defineEmits<{ submit: [] }>();

const textarea = ref<HTMLTextAreaElement | null>(null);

// Entrée envoie, Maj+Entrée fait un retour à la ligne
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    emit("submit");
  }
}

// La zone de texte grandit avec le contenu (jusqu'à une limite fixée en CSS)
watch(model, async () => {
  await nextTick();
  const el = textarea.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
});

defineExpose({ focus: () => textarea.value?.focus() });
</script>

<template>
  <form class="ask" @submit.prevent="emit('submit')">
    <textarea
      ref="textarea"
      v-model="model"
      rows="1"
      :placeholder="placeholder"
      :aria-label="placeholder"
      @keydown="onKeydown"
    />
    <button type="submit" :disabled="disabled || !model.trim()" aria-label="Envoyer">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.ask {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
}
.ask:focus-within {
  border-color: var(--accent);
}
textarea {
  flex: 1;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  line-height: 1.5;
  padding: 8px 8px;
  max-height: 200px;
}
button {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
button:hover:not(:disabled) {
  transform: translateX(1px);
}
button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
