<script setup lang="ts">
import { computed } from "vue";
import ProjectCard from "./ProjectCard.vue";
import { projects } from "../projects";

// Le projet phare en largeur, les autres en grille de trois
const featured = computed(() => projects.filter((p) => p.featured));
const others = computed(() => projects.filter((p) => !p.featured));
</script>

<template>
  <div class="list">
    <ProjectCard v-for="p in featured" :key="p.slug" :project="p" wide />
    <div class="grid">
      <ProjectCard v-for="p in others" :key="p.slug" :project="p" />
    </div>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 960px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
