<script setup lang="ts">
import RagChat from "../components/rag/RagChat.vue";
import { projects } from "../projects";

const project = projects.find((p) => p.slug === "vue-doc-rag")!;

const steps = [
  {
    title: "Découpage",
    text: "La doc Vue (Markdown) est découpée par titres, sans jamais couper un bloc de code.",
  },
  {
    title: "Embeddings",
    text: "Chaque passage devient un vecteur, calculé en local avec un modèle multilingue.",
  },
  {
    title: "Recherche hybride",
    text: "Vecteurs (le sens) et BM25 (les mots exacts), fusionnés par Reciprocal Rank Fusion.",
  },
  {
    title: "Génération",
    text: "Claude répond à partir des 6 meilleurs passages, en streaming, en citant ses sources.",
  },
];
</script>

<template>
  <nav class="crumb" aria-label="Fil d'Ariane">
    <RouterLink to="/projets">Projets</RouterLink> <span aria-hidden="true">/</span> {{ project.title }}
  </nav>

  <section class="head">
    <h1>{{ project.title }}</h1>
    <p class="lead">{{ project.summary }}</p>
    <ul class="tags" aria-label="Technologies">
      <li v-for="t in project.tags" :key="t">{{ t }}</li>
    </ul>
    <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener" class="btn">Voir le code sur GitHub</a>
  </section>

  <RagChat />

  <section class="how" aria-labelledby="how-title">
    <h2 id="how-title">Comment ça marche</h2>
    <ol class="steps">
      <li v-for="(s, i) in steps" :key="s.title">
        <span class="n">{{ i + 1 }}</span>
        <h3>{{ s.title }}</h3>
        <p>{{ s.text }}</p>
      </li>
    </ol>
    <p class="note">
      La démo est limitée en nombre de questions par visiteur et par jour, pour maîtriser
      les coûts de l'API.
    </p>
  </section>
</template>

<style scoped>
.crumb {
  padding-top: 28px;
  font-size: 0.85rem;
  color: var(--muted);
}
.crumb a {
  color: var(--accent-strong);
  text-decoration: none;
}
.head {
  padding: 16px 0 28px;
}
h1 {
  margin: 0 0 10px;
  font-size: clamp(2rem, 5vw, 2.8rem);
  letter-spacing: -0.03em;
}
.lead {
  max-width: 65ch;
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 1.05rem;
}
.tags {
  list-style: none;
  margin: 0 0 20px;
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
.how {
  padding: 48px 0;
}
.how h2 {
  margin: 0 0 20px;
  font-size: 1.35rem;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 12px;
}
.steps li {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}
.n {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-weight: 700;
  font-size: 0.85rem;
}
.steps h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.steps p {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
}
.note {
  margin: 20px 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
