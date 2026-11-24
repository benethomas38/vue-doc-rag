<script setup lang="ts">
/**
 * Schéma de l'architecture du RAG, en HTML/CSS (pas d'image) :
 * lisible au clavier et par les lecteurs d'écran, et il se réorganise en colonne sur mobile.
 */
</script>

<template>
  <figure class="arch">
    <figcaption class="sr-only">
      Schéma : le navigateur parle en HTTPS au VPS OVH. Sur le VPS, Caddy transmet les requêtes au conteneur
      de l'application, qui cherche les passages dans l'index en mémoire puis appelle l'API Claude.
      L'index est construit pendant le build Docker à partir de la doc Vue clonée depuis GitHub.
    </figcaption>

    <!-- Ligne 1 : le trajet d'une question en production -->
    <div class="lane">
      <div class="node node--outside">
        <p class="node__title">Ton navigateur</p>
        <p>Le site Vue 3 et le chat</p>
      </div>

      <div class="link" aria-hidden="true">
        <span class="link__label">HTTPS</span>
        <svg viewBox="0 0 60 24" class="link__arrow"><path d="M2 8h52m-6-6 6 6-6 6M58 16H6m6-6-6 6 6 6" /></svg>
        <span class="link__label">flux SSE</span>
      </div>

      <div class="host">
        <p class="host__title">VPS OVH, Ubuntu 24.04</p>
        <p class="host__sub">Docker Compose, deux conteneurs</p>
        <div class="host__inner">
          <div class="node">
            <p class="node__title">Caddy</p>
            <p>Certificat HTTPS automatique, redirige vers l'application</p>
          </div>
          <div class="link link--small" aria-hidden="true">
            <svg viewBox="0 0 40 16" class="link__arrow"><path d="M2 8h34m-6-6 6 6-6 6" /></svg>
          </div>
          <div class="node node--main">
            <p class="node__title">Application Node.js</p>
            <ul>
              <li>Sert le site (fichiers buildés)</li>
              <li>Limites : 10 questions par heure et par visiteur, 200 par jour</li>
              <li>Index de la doc en mémoire : 891 passages et leurs vecteurs</li>
              <li>Modèle d'embeddings local, recherche BM25</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="link" aria-hidden="true">
        <span class="link__label">question + 6 passages</span>
        <svg viewBox="0 0 60 24" class="link__arrow"><path d="M2 8h52m-6-6 6 6-6 6M58 16H6m6-6-6 6 6 6" /></svg>
        <span class="link__label">réponse en streaming</span>
      </div>

      <div class="node node--outside">
        <p class="node__title">API Claude</p>
        <p>Anthropic. Le seul service externe appelé à chaque question</p>
      </div>
    </div>

    <!-- Ligne 2 : comment l'index est construit, une fois, au déploiement -->
    <div class="build">
      <p class="build__title">Au déploiement, une seule fois</p>
      <ol class="build__steps">
        <li><strong>GitHub, vuejs/docs</strong> : la doc officielle est clonée</li>
        <li><strong>Build Docker</strong> : découpage en 891 passages, calcul des vecteurs</li>
        <li><strong>index.json</strong> : rangé dans l'image, chargé en mémoire au démarrage</li>
      </ol>
    </div>
  </figure>
</template>

<style scoped>
.arch {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
p {
  margin: 0;
}

.lane {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px minmax(0, 2.4fr) 96px minmax(0, 1fr);
  align-items: center;
}

.node {
  padding: 14px 16px;
  border: 2px solid var(--ink);
  border-radius: 4px;
  background: var(--paper);
  font-size: 15px;
  line-height: 1.45;
}
.node__title {
  font-stretch: 75%;
  font-weight: 800;
  font-size: 20px;
  margin-bottom: 4px;
}
.node--outside {
  background: var(--gray);
  border-color: var(--gray);
}
.node--main {
  border-color: var(--blue);
}
.node ul {
  margin: 0;
  padding-left: 18px;
}

.host {
  padding: 16px;
  border-radius: 4px;
  background: var(--blue);
  color: #ffffff;
}
.host__title {
  font-stretch: 75%;
  font-weight: 800;
  font-size: 22px;
}
.host__sub {
  font-size: 14px;
  margin-bottom: 12px;
}
.host__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1.7fr);
  align-items: center;
  color: var(--ink);
}

.link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  text-align: center;
}
.link__label {
  font-size: 12px;
  line-height: 1.25;
  color: var(--muted);
}
.link__arrow {
  width: 100%;
  max-width: 60px;
  height: 24px;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.link--small .link__arrow {
  stroke: #ffffff;
  height: 16px;
}

.build {
  padding: 14px 16px;
  border: 2px dashed var(--teal);
  border-radius: 4px;
}
.build__title {
  font-weight: 700;
  margin-bottom: 8px;
}
.build__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  counter-reset: step;
  font-size: 15px;
}
.build__steps li {
  counter-increment: step;
  padding-left: 30px;
  position: relative;
}
.build__steps li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 1px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--teal);
  color: var(--ink);
  font-weight: 800;
  font-size: 13px;
  display: grid;
  place-items: center;
}

/* Sur tablette et mobile : tout passe en colonne, les flèches pointent vers le bas */
@media (max-width: 900px) {
  .lane,
  .host__inner {
    grid-template-columns: minmax(0, 1fr);
  }
  .link {
    flex-direction: row;
    justify-content: center;
    padding: 8px 0;
    gap: 10px;
  }
  .link__arrow {
    transform: rotate(90deg);
    width: 40px;
    flex: none;
  }
  .build__steps {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
