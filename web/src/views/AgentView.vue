<script setup lang="ts">
import { ref } from "vue";
import { projects } from "../projects";

// L'interface de l'assistant est une application Angular, buildée à part (widgets/agp-angular)
// et livrée comme Web Component <agp-assistant>. On charge son script à l'ouverture de la page.
const AGP_SCRIPT = "/widgets/agp/main.js";
const loadFailed = ref(false);
if (!document.querySelector(`script[src="${AGP_SCRIPT}"]`)) {
  const script = document.createElement("script");
  script.type = "module";
  script.src = AGP_SCRIPT;
  script.onerror = () => {
    loadFailed.value = true;
    script.remove(); // on pourra réessayer en revenant sur la page
  };
  document.head.append(script);
}

const project = projects.find((p) => p.slug === "assistant-agp")!;

const loop = [
  { title: "La demande", text: "Ta phrase part vers Claude avec la liste des outils qu'il a le droit d'utiliser et ce que fait chacun." },
  { title: "Claude choisit", text: "Au lieu de répondre directement, il demande un ou plusieurs outils, avec leurs paramètres en JSON." },
  { title: "Le serveur exécute", text: "Mon serveur vérifie chaque paramètre, exécute l'outil et renvoie le résultat à Claude." },
  { title: "On recommence", text: "Claude lit les résultats et décide de la suite. La boucle s'arrête quand il a fini, ou au bout de 8 tours." },
];

const tools = [
  { name: "resoudre_date", text: "Transforme « samedi prochain » en date précise et signale les ambiguïtés. Un calcul déterministe, parce qu'un LLM se trompe facilement sur les jours." },
  { name: "verifier_agenda", text: "Liste ce qui est déjà prévu ce jour-là, pour repérer les conflits." },
  { name: "chercher_spot", text: "Retrouve un lieu connu de l'association à partir d'un mot comme « Bastille » ou « en salle »." },
  { name: "meteo", text: "Interroge Open-Meteo, un vrai service extérieur : prévisions, heure du coucher du soleil et conseil pour une séance en plein air." },
  { name: "creer_brouillon", text: "Prépare la fiche après avoir vérifié chaque champ. Il ne publie rien." },
  { name: "modifier_brouillon", text: "Change seulement les champs demandés (« mets-le à 17 h »). Si seul le début bouge, la durée est gardée." },
];

const guards = [
  { what: "L'humain publie, pas le modèle", why: "Aucun outil ne peut publier. Seul le bouton « Publier » appelle la route de publication." },
  { what: "Le serveur revérifie tout", why: "Date, horaires, lieu, nombre de places : chaque paramètre envoyé par Claude est contrôlé avant d'être utilisé." },
  { what: "8 tours maximum", why: "Un agent qui tourne en rond coûte de l'argent. Au-delà, la boucle s'arrête et demande de reformuler." },
  { what: "Les résultats sont des données", why: "Claude a pour consigne d'ignorer toute instruction cachée dans un résultat d'outil." },
  { what: "Historique en texte seul", why: "Le navigateur ne renvoie que du texte : impossible d'y glisser de faux résultats d'outils." },
  { what: "Un agenda par visiteur", why: "Ce que tu publies ici n'est visible que par toi, et tout s'efface au bout de quelques heures." },
  { what: "Des limites de coût", why: "6 demandes par heure et par visiteur, 100 par jour au total. Chaque demande fait plusieurs appels à Claude." },
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

  <agp-assistant />
  <p v-if="loadFailed" class="hint" role="alert">L'assistant n'a pas pu se charger. Recharge la page pour réessayer.</p>
  <p class="hint">Clique sur une étape pour voir l'appel exact envoyé par Claude et la réponse du serveur.</p>

  <section class="section" aria-labelledby="loop-title">
    <h2 id="loop-title">La boucle d'agent</h2>
    <p class="intro">
      Mon assistant RAG répond à une question. Celui-ci agit : il enchaîne des outils jusqu'à obtenir ce qu'il faut.
      Tout repose sur le « tool use » de l'API Claude, en une boucle de quelques dizaines de lignes.
      L'interface, elle, est une application Angular (signaux, sans zone.js) intégrée à ce site Vue
      sous forme de Web Component.
    </p>
    <ol class="loop">
      <li v-for="step in loop" :key="step.title">
        <strong>{{ step.title }}</strong>
        <span>{{ step.text }}</span>
      </li>
    </ol>
  </section>

  <section class="section split">
    <div>
      <h2 id="tools-title">Ses six outils</h2>
      <dl class="list" aria-labelledby="tools-title">
        <div v-for="t in tools" :key="t.name">
          <dt><code>{{ t.name }}</code></dt>
          <dd>{{ t.text }}</dd>
        </div>
      </dl>
    </div>
    <div>
      <h2 id="guards-title">Les garde-fous</h2>
      <dl class="list" aria-labelledby="guards-title">
        <div v-for="g in guards" :key="g.what">
          <dt>{{ g.what }}</dt>
          <dd>{{ g.why }}</dd>
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
.hint {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
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

/* La boucle : quatre blocs, le dernier renvoie au premier */
.loop {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: loop;
}
.loop li {
  counter-increment: loop;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  font-size: 15px;
}
.loop li:nth-child(2),
.loop li:nth-child(3) {
  border-color: var(--blue);
}
.loop li:nth-child(4) {
  background: var(--teal-wash);
}
.loop strong {
  font-size: 18px;
  font-stretch: 75%;
}
.loop strong::before {
  content: counter(loop) ". ";
  color: var(--blue);
}
.loop li + li::before {
  content: "→";
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 800;
}
.loop li:last-child::after {
  content: "↺ retour à l'étape 2";
  margin-top: auto;
  padding-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--blue-deep);
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 48px;
}
.list {
  margin: 0;
}
.list div {
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.list dt {
  font-weight: 700;
}
.list dd {
  margin: 2px 0 0;
}
code {
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace;
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--teal-wash);
}

@media (max-width: 860px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .loop {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }
  .loop li + li::before {
    content: "↓";
    left: 50%;
    top: -24px;
    transform: translateX(-50%);
  }
}
</style>
