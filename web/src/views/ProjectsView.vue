<script setup lang="ts">
import ProjectCard from "../components/ProjectCard.vue";
import { projects } from "../projects";
</script>

<template>
  <section class="head">
    <h1>Projets</h1>
    <p>Mes projets perso, pour tester de nouvelles technos en conditions réelles. Le code de chacun est public sur GitHub.</p>
  </section>

  <ProjectCard v-for="p in projects" :key="p.slug" :project="p" />
</template>

<style scoped>
.head {
  padding: 56px 0 24px;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(48px, 9vw, 96px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
}
.head p {
  margin: 0;
  max-width: 60ch;
}
</style>
