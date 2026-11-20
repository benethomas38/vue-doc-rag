/**
 * La liste de tes projets. Pour en ajouter un :
 * 1. ajoute une entrée ici ;
 * 2. si le projet a une page à lui, crée la vue dans views/ et la route dans router.ts.
 */
export interface Project {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
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
      "Un assistant qui répond aux questions sur Vue.js à partir de la documentation officielle, " +
      "avec les sources de chaque réponse. Recherche hybride, API Claude et réponses en streaming.",
    tags: ["Vue 3", "TypeScript", "RAG", "API Claude", "Node.js", "Vitest"],
    year: "2026",
    route: "/projets/vue-doc-rag",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
];
