<script setup lang="ts">
import type { Project } from "../projects";

withDefaults(defineProps<{ project: Project; wide?: boolean }>(), { wide: false });
</script>

<!--
  Un projet = une carte : capture, titre, une phrase, technos en pastilles, boutons.
  Toute la carte mène à la démo ; « Voir le code » reste un lien à part.
  wide : version en largeur (capture à gauche), pour le projet mis en avant.
-->
<template>
  <article class="card" :class="{ 'card--wide': wide }">
    <div class="shot">
      <img v-if="project.image" :src="project.image" alt="" width="644" height="362" loading="lazy" />
      <span v-if="project.demo" class="live"><span class="dot" aria-hidden="true" />Démo en ligne</span>
    </div>

    <div class="body">
      <h3>
        <RouterLink v-if="project.route" :to="project.route" class="stretched">{{ project.title }}</RouterLink>
        <template v-else>{{ project.title }}</template>
      </h3>
      <p class="pitch">{{ project.pitch }}</p>

      <ul class="tags" aria-label="Technologies">
        <li v-for="t in project.tags" :key="t">{{ t }}</li>
      </ul>

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
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--paper);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 6px 6px 0 var(--teal);
}
.card:focus-within {
  box-shadow: 6px 6px 0 var(--teal);
}

.shot {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--ink);
  border-bottom: 2px solid var(--ink);
}
.shot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}
.live {
  position: absolute;
  left: 10px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(10, 37, 64, 0.25);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1fa35c;
}

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px 20px;
}
h3 {
  margin: 0;
  font-size: 28px;
}
h3 a {
  color: var(--ink);
  text-decoration: none;
}
.card:hover h3 a {
  text-decoration: underline;
  text-decoration-color: var(--teal);
  text-decoration-thickness: 4px;
}
/* Toute la carte est cliquable grâce au lien du titre */
.stretched::after {
  content: "";
  position: absolute;
  inset: 0;
}
.pitch {
  margin: 0;
  font-size: 16px;
}

/* Les technos : ce que le recruteur cherche, donc bien visibles */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
.tags li {
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--teal-wash);
  color: var(--blue-deep);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}
.tags li:first-child {
  background: var(--blue);
  color: #ffffff;
}

.actions {
  position: relative;
  z-index: 1; /* au-dessus du lien étiré */
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: auto 0 0;
  padding-top: 6px;
}
.actions .btn {
  min-height: 40px;
  padding: 6px 16px;
  font-size: 15px;
}

/* Le projet mis en avant : capture à gauche, texte à droite */
@media (min-width: 761px) {
  .card--wide {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  }
  .card--wide .shot {
    aspect-ratio: auto;
    min-height: 100%;
    border-bottom: 0;
    border-right: 2px solid var(--ink);
  }
  .card--wide .body {
    padding: 26px 28px;
    justify-content: center;
  }
  .card--wide h3 {
    font-size: 40px;
  }
  .card--wide .pitch {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card:hover {
    transform: none;
  }
}
</style>
