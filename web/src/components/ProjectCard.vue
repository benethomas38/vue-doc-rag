<script setup lang="ts">
import type { Project } from "../projects";

defineProps<{ project: Project }>();
</script>

<template>
  <article class="card">
    <div class="card__top">
      <span class="year">{{ project.year }}</span>
      <span v-if="project.demo" class="live"><span class="pulse" aria-hidden="true" />Démo en ligne</span>
    </div>

    <h3>
      <RouterLink v-if="project.route" :to="project.route" class="stretched">{{ project.title }}</RouterLink>
      <template v-else>{{ project.title }}</template>
    </h3>
    <p>{{ project.summary }}</p>

    <ul class="tags" aria-label="Technologies">
      <li v-for="t in project.tags" :key="t">{{ t }}</li>
    </ul>

    <div class="actions">
      <RouterLink v-if="project.route" :to="project.route" class="btn btn--primary">
        {{ project.demo ? "Essayer la démo" : "Voir le projet" }}
      </RouterLink>
      <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener" class="btn">Code source</a>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--muted);
}
.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-strong);
  font-weight: 600;
}
.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 var(--accent);
  animation: pulse 2s infinite;
}
h3 {
  margin: 0;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}
h3 a {
  color: inherit;
  text-decoration: none;
}
p {
  margin: 0;
  color: var(--muted);
}
.tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tags li {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 600;
}
.actions {
  position: relative;
  z-index: 1; /* au-dessus du lien étiré */
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
}
/* Toute la carte est cliquable grâce au lien du titre */
.stretched::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 16px;
}
@keyframes pulse {
  70% { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
</style>
