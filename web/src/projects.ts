/**
 * La liste de tes projets. Pour en ajouter un :
 * 1. ajoute une entrée ici ;
 * 2. si le projet a une page à lui, crée la vue dans views/ et la route dans router.ts.
 */
export interface Project {
  slug: string;
  title: string;
  summary: string;
  stack: string;   // technos, en une ligne
  year: string;
  route?: string;  // page du projet sur le site
  repo?: string;   // code source
  demo?: boolean;  // démo utilisable en ligne
}

export const projects: Project[] = [
  {
    slug: "vue-doc-rag",
    title: "Vue Doc Assistant",
    summary:
      "Pose une question sur Vue.js, l'assistant cherche les bons passages dans la documentation officielle " +
      "et Claude rédige la réponse en citant ses sources.",
    stack: "Vue 3, TypeScript, Node.js, API Claude, Docker",
    year: "2026",
    route: "/projets/vue-doc-rag",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
  {
    slug: "visualiseur",
    title: "Visualiseur audio",
    summary:
      "Glisse n'importe quel morceau, il prend vie en temps réel : spectre circulaire, barres ou oscilloscope, " +
      "avec une détection de beat qui fait réagir l'image au kick. Tout tourne dans le navigateur.",
    stack: "Vue 3, TypeScript, Web Audio API, Canvas 2D",
    year: "2026",
    route: "/projets/visualiseur",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
];
