<script setup lang="ts">
import ProjectList from "../components/ProjectList.vue";
</script>

<template>
  <section class="head">
    <h1>Projets</h1>
    <p>Mes projets perso, pour tester de nouvelles technos en conditions réelles : Vue, React, Angular et IA. Chaque démo est en ligne, et le code est public sur GitHub.</p>
  </section>

  <ProjectList />
</template>

<style scoped>
.head {
  padding: 40px 0 28px;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(48px, 8vw, 84px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
}
.head p {
  margin: 0;
  max-width: 60ch;
}
</style>
