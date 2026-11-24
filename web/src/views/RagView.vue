<script setup lang="ts">
import RagChat from "../components/rag/RagChat.vue";
import ArchitectureDiagram from "../components/rag/ArchitectureDiagram.vue";
import { projects } from "../projects";

const project = projects.find((p) => p.slug === "vue-doc-rag")!;

// Une vraie séquence : le trajet d'une question, dans l'ordre
const journey = [
  "Tu envoies ta question. Elle part en HTTPS vers benethomas.fr, que le DNS d'OVH fait pointer vers mon VPS.",
  "Caddy, qui gère le certificat HTTPS, transmet la requête à l'application Node.js.",
  "L'application vérifie que tu n'as pas dépassé la limite, 10 questions par heure, et que la démo n'a pas atteint ses 200 questions du jour.",
  "La question est transformée en vecteur sur place, par un petit modèle qui tourne sur le serveur. La recherche hybride compare ce vecteur et les mots exacts aux 891 passages de la doc, et garde les 6 meilleurs.",
  "La question et ces 6 passages partent vers l'API Claude. C'est le seul appel vers un service extérieur.",
  "Claude rédige la réponse en citant les passages. Elle revient morceau par morceau jusqu'à ton navigateur, qui l'affiche au fil de l'eau avec les liens vers la doc.",
];

const storage = [
  { what: "La documentation et ses vecteurs", where: "Un fichier index.json construit au déploiement, rangé dans l'image Docker et chargé en mémoire. Pas de base de données." },
  { what: "Tes questions", where: "Nulle part. Elles traversent le serveur sans être enregistrées." },
  { what: "Les compteurs de limites", where: "En mémoire. Ils repartent à zéro à chaque redémarrage du serveur." },
  { what: "La clé de l'API Claude", where: "Un fichier .env sur le VPS, jamais dans le code ni sur GitHub." },
  { what: "Le code source", where: "Public sur GitHub. Le VPS le récupère avec git pull à chaque mise à jour." },
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

  <RagChat />

  <section class="section" aria-labelledby="arch-title">
    <h2 id="arch-title">Comment ça tourne</h2>
    <p class="intro">
      Tout le projet tient sur un petit serveur loué chez OVH, avec deux conteneurs Docker.
      Voici où se trouve chaque pièce, et le chemin que suit ta question.
    </p>
    <ArchitectureDiagram />
  </section>

  <section class="section split" aria-labelledby="journey-title">
    <div>
      <h2 id="journey-title">Le trajet d'une question</h2>
      <ol class="journey">
        <li v-for="(step, i) in journey" :key="i">{{ step }}</li>
      </ol>
    </div>
    <div>
      <h2 id="storage-title">Où sont les données</h2>
      <dl class="storage" aria-labelledby="storage-title">
        <div v-for="s in storage" :key="s.what">
          <dt>{{ s.what }}</dt>
          <dd>{{ s.where }}</dd>
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
}
</style>
