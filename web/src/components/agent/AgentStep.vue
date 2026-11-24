<script setup lang="ts">
import { computed } from "vue";
import type { Step } from "../../composables/useAgent";
import { stepInput, stepLabel, stepOutput } from "../../lib/agentLabels";

const props = defineProps<{ step: Step }>();

const summary = computed(() =>
  props.step.status === "running" ? "…" : stepOutput(props.step.name, props.step.status === "ok", props.step.output),
);
const json = (v: unknown) => JSON.stringify(v, null, 2);
</script>

<!-- Une étape = un appel d'outil. Dépliée, elle montre l'appel exact et la réponse brute. -->
<template>
  <details class="step" :class="`step--${step.status}`">
    <summary>
      <span class="icon" aria-hidden="true">
        <span v-if="step.status === 'running'" class="spinner" />
        <template v-else-if="step.status === 'ok'">✓</template>
        <template v-else>!</template>
      </span>
      <span class="body">
        <span class="line">
          <strong>{{ stepLabel(step.name) }}</strong>
          <span class="input">{{ stepInput(step.name, step.input) }}</span>
        </span>
        <span class="output">{{ summary }}</span>
      </span>
    </summary>
    <div class="raw">
      <p class="raw__title"><code>{{ step.name }}</code>, paramètres envoyés par Claude :</p>
      <pre>{{ json(step.input) }}</pre>
      <template v-if="step.status !== 'running'">
        <p class="raw__title">Réponse du serveur, renvoyée à Claude :</p>
        <pre>{{ json(step.output) }}</pre>
      </template>
    </div>
  </details>
</template>

<style scoped>
.step {
  border-left: 3px solid var(--border);
  padding-left: 12px;
}
.step--ok {
  border-left-color: var(--teal);
}
.step--error {
  border-left-color: var(--danger);
}
summary {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  cursor: pointer;
  list-style: none;
  padding: 4px 0;
}
summary::-webkit-details-marker {
  display: none;
}
.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 800;
}
.step--ok .icon {
  background: var(--teal-wash);
  border-color: var(--teal);
  color: var(--blue-deep);
}
.step--error .icon {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}
.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 15px;
  line-height: 1.4;
}
.line {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
}
.input {
  color: var(--muted);
}
.output {
  color: var(--ink);
}
.step--error .output {
  color: var(--danger);
}
summary:hover strong {
  text-decoration: underline;
  text-decoration-color: var(--teal);
  text-underline-offset: 3px;
}
.raw {
  margin: 6px 0 4px 32px;
}
.raw__title {
  margin: 8px 0 4px;
  font-size: 13px;
  color: var(--muted);
}
pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--code-bg);
  color: var(--code-text);
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 260px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
