<script setup lang="ts">
import AudioVisualizer from "../components/visualizer/AudioVisualizer.vue";
import { projects } from "../projects";

const project = projects.find((p) => p.slug === "visualiseur")!;

// Le graphe Web Audio, nœud par nœud
const graph = [
  { node: "Source", text: "Ton fichier lu par un élément <audio>, la boucle de démo, ou le micro." },
  { node: "AnalyserNode", text: "Fait une FFT de 2048 points sur le son, environ 60 fois par seconde." },
  { node: "GainNode", text: "Règle le volume. Il est placé après l'analyseur : baisser le son ne change pas l'animation." },
  { node: "Haut-parleurs", text: "Sauf pour le micro, qui n'y est pas branché pour éviter le larsen." },
];

// Ce qui se passe à chaque image
const frameSteps = [
  "Le navigateur appelle la fonction de dessin avant chaque rafraîchissement de l'écran (requestAnimationFrame).",
  "L'analyseur donne 1024 cases de fréquences. Elles sont linéaires, alors que l'oreille entend en octaves : je les regroupe en 72 bandes de largeur croissante, pour que les basses aient autant de place que les aigus.",
  "Je mesure l'énergie entre 30 et 140 Hz, là où tape le kick. Si elle dépasse de 40 % sa moyenne de la dernière seconde, c'est un beat : l'anneau gonfle et lâche des particules.",
  "Le rendu Canvas 2D dessine l'image en pixels CSS, mise à l'échelle de l'écran (jusqu'à 2× pour les écrans Retina).",
];

const choices = [
  {
    what: "Canvas 2D plutôt que WebGL",
    why: "Quelques centaines de formes par image, c'est largement dans les moyens du Canvas 2D à 60 images/s, et le code reste lisible. WebGL deviendrait utile avec des milliers de particules ou des shaders.",
  },
  {
    what: "Aucune bibliothèque",
    why: "Web Audio API et Canvas sont natifs dans tous les navigateurs récents. Le projet n'ajoute aucune dépendance au site.",
  },
  {
    what: "Rien ne quitte ton navigateur",
    why: "Le fichier est lu via une URL locale (URL.createObjectURL). Pas d'upload, pas de serveur, pas de stockage.",
  },
  {
    what: "Une boucle de démo synthétisée",
    why: "Kick, caisse claire, charleys, basse et accords sont générés en direct avec des oscillateurs et du bruit blanc. Aucun fichier audio dans le code.",
  },
  {
    what: "Sobre quand il le faut",
    why: "L'animation s'arrête quand la scène sort de l'écran, et les mouvements sont réduits si ton système le demande (prefers-reduced-motion).",
  },
];
</script>

<template>
  <nav class="crumb" aria-label="Fil d'Ariane">
    <RouterLink to="/projets">Projets</RouterLink>
    <span aria-hidden="true"> / </span>
    <span>{{ project.title }}</span>
  </nav>

  <section class="head">
    <h1>{{ project.title }}</h1>
    <p class="lead">{{ project.summary }}</p>
    <p class="meta">
      {{ project.stack }}.
      <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener">Voir le code sur GitHub</a>
    </p>
  </section>

  <AudioVisualizer />

  <section class="section" aria-labelledby="graph-title">
    <h2 id="graph-title">Le chemin du son</h2>
    <p class="intro">
      Tout se passe dans ton navigateur, avec la Web Audio API. Le son traverse une chaîne de nœuds,
      et l'un d'eux sert seulement à l'écouter pour en tirer des chiffres.
    </p>
    <ol class="graph">
      <li v-for="g in graph" :key="g.node">
        <strong>{{ g.node }}</strong>
        <span>{{ g.text }}</span>
      </li>
    </ol>
  </section>

  <section class="section split">
    <div>
      <h2 id="frame-title">Une image, 60 fois par seconde</h2>
      <ol class="journey" aria-labelledby="frame-title">
        <li v-for="(step, i) in frameSteps" :key="i">{{ step }}</li>
      </ol>
    </div>
    <div>
      <h2 id="choices-title">Les choix techniques</h2>
      <dl class="storage" aria-labelledby="choices-title">
        <div v-for="c in choices" :key="c.what">
          <dt>{{ c.what }}</dt>
          <dd>{{ c.why }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.crumb {
  padding-top: 28px;
  font-size: 15px;
}
.head {
  padding: 12px 0 28px;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(44px, 8vw, 84px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
}
.lead {
  max-width: 62ch;
  margin: 0 0 8px;
  font-size: 19px;
}
.meta {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}

.section {
  padding: 64px 0 0;
}
.section h2 {
  margin: 0 0 12px;
  font-size: clamp(32px, 5vw, 48px);
}
.intro {
  max-width: 62ch;
  margin: 0 0 24px;
}

/* Le graphe audio : des blocs reliés par des flèches */
.graph {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.graph li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  font-size: 15px;
}
.graph li:first-child {
  background: var(--teal-wash);
}
.graph li:nth-child(2) {
  border-color: var(--blue);
  background: var(--blue);
  color: #ffffff;
}
.graph strong {
  font-size: 18px;
  font-stretch: 75%;
}
.graph li + li::before {
  content: "→";
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 800;
  color: var(--ink);
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 48px;
}
.journey {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.journey li {
  counter-increment: step;
  position: relative;
  padding: 0 0 18px 44px;
}
.journey li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--blue);
  color: #ffffff;
  font-weight: 800;
  display: grid;
  place-items: center;
}
.storage {
  margin: 0;
}
.storage div {
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.storage dt {
  font-weight: 700;
}
.storage dd {
  margin: 2px 0 0;
}

@media (max-width: 860px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .graph {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }
  .graph li + li::before {
    content: "↓";
    left: 50%;
    top: -24px;
    transform: translateX(-50%);
  }
}
</style>
