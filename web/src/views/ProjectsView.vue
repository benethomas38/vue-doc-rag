<script setup lang="ts">
import ProjectCard from "../components/ProjectCard.vue";
import { projects } from "../projects";
</script>

<template>
  <section class="head">
    <h1>Projets</h1>
    <p>Des projets perso pour explorer de nouvelles technos. Le code de chacun est public sur GitHub.</p>
  </section>

  <div class="grid">
    <ProjectCard v-for="p in projects" :key="p.slug" :project="p" />
  </div>
</template>

<style scoped>
.head {
  padding: 56px 0 24px;
}
h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 5vw, 2.8rem);
  letter-spacing: -0.03em;
}
.head p {
  margin: 0;
  max-width: 60ch;
  color: var(--muted);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 16px;
  padding-bottom: 48px;
}
</style>
