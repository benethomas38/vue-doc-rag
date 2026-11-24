<script setup lang="ts">
import type { Project } from "../projects";

defineProps<{ project: Project }>();
</script>

<!-- Un projet = une ligne : année, description, liens. Pas de carte. -->
<template>
  <article class="row">
    <p class="year">{{ project.year }}</p>
    <div class="body">
      <h3>
        <RouterLink v-if="project.route" :to="project.route">{{ project.title }}</RouterLink>
        <template v-else>{{ project.title }}</template>
      </h3>
      <p class="summary">{{ project.summary }}</p>
      <p class="stack">{{ project.stack }}</p>
      <p class="actions">
        <RouterLink v-if="project.route" :to="project.route" class="btn btn--primary">
          {{ project.demo ? "Tester la démo" : "Voir le projet" }}
        </RouterLink>
        <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener" class="btn">Voir le code</a>
      </p>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 8px 24px;
  padding: 28px 0;
  border-top: 1px solid var(--border);
}
.year {
  margin: 4px 0 0;
  font-weight: 700;
  color: var(--blue-deep);
}
h3 {
  margin: 0 0 8px;
  font-size: 34px;
}
h3 a {
  color: var(--ink);
  text-decoration: none;
}
h3 a:hover {
  text-decoration: underline;
  text-decoration-color: var(--teal);
  text-decoration-thickness: 4px;
}
.summary {
  margin: 0 0 6px;
  max-width: 62ch;
}
.stack {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 15px;
}
.actions {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
@media (max-width: 600px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
  }
  h3 {
    font-size: 28px;
  }
}
</style>
