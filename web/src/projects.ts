/**
 * La liste de tes projets, dans l'ordre d'affichage. Pour en ajouter un :
 * 1. ajoute une entrée ici (et sa capture 16:9 dans web/public/projets/) ;
 * 2. si le projet a une page à lui, crée la vue dans views/ et la route dans router.ts.
 */
export interface Project {
  slug: string;
  title: string;
  pitch: string;     // une phrase, pour les cartes
  summary: string;   // le paragraphe complet, en tête de la page du projet
  tags: string[];    // technos principales, affichées en pastilles sur les cartes
  stack: string;     // technos détaillées, en une ligne, sur la page du projet
  year: string;
  image?: string;    // capture 16:9 dans web/public/
  featured?: boolean; // mis en avant en grand en haut de la liste
  route?: string;    // page du projet sur le site
  repo?: string;     // code source
  demo?: boolean;    // démo utilisable en ligne
}

export const projects: Project[] = [
  {
    slug: "vue-doc-rag",
    title: "Vue Doc Assistant",
    pitch:
      "Un assistant IA en production : pose une question sur Vue.js, il cherche dans la documentation officielle " +
      "et répond en citant ses sources.",
    summary:
      "Pose une question sur Vue.js, l'assistant cherche les bons passages dans la documentation officielle " +
      "et Claude rédige la réponse en citant ses sources.",
    tags: ["Vue 3", "TypeScript", "Node.js", "API Claude", "RAG", "Docker"],
    stack: "Vue 3, TypeScript, Node.js, API Claude, Docker",
    year: "2026",
    image: "/projets/vue-doc-rag.webp",
    featured: true,
    route: "/projets/vue-doc-rag",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
  {
    slug: "assistant-agp",
    title: "Assistant AGP",
    pitch:
      "Un agent IA qui agit : décris un événement en une phrase, il vérifie l'agenda, le lieu et la météo, " +
      "puis prépare la fiche, que l'humain valide.",
    summary:
      "Un agent IA qui agit : décris un événement de parkour en une phrase, il résout la date, vérifie l'agenda, " +
      "trouve le spot, consulte la météo et prépare la fiche. C'est toi qui cliques pour publier.",
    tags: ["Angular", "Signals", "Web Component", "Agent IA", "Node.js"],
    stack: "Angular (signaux, Angular Elements), TypeScript, Node.js, API Claude (tool use), Open-Meteo",
    year: "2026",
    image: "/projets/assistant-agp.webp",
    route: "/projets/assistant-agp",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
  {
    slug: "donjon",
    title: "Le Donjon qui parle",
    pitch:
      "Un jeu de donjon en pixel art où l'on discute librement avec les personnages. Claude leur donne la parole, " +
      "le moteur du jeu garde le dernier mot.",
    summary:
      "Un jeu d'exploration de donjon en pixel art, au tour par tour, où les personnages te répondent vraiment : " +
      "marchande avec un gobelin, console un squelette, baratine un garde. Claude leur donne la parole, le moteur du jeu garde le dernier mot.",
    tags: ["Vue 3", "TypeScript", "Canvas 2D", "API Claude", "Node.js"],
    stack: "Vue 3, TypeScript, Canvas 2D, Node.js, API Claude (tool use, streaming)",
    year: "2026",
    image: "/projets/donjon.webp",
    route: "/projets/donjon",
    // Tous les projets vivent dans le même dépôt : on pointe directement sur le code du jeu
    repo: "https://github.com/benethomas38/vue-doc-rag/tree/main/web/src/lib/game",
    demo: true,
  },
  {
    slug: "visualiseur",
    title: "Visualiseur audio",
    pitch:
      "Glisse un morceau, il prend vie en temps réel : spectre, oscilloscope et détection de beat, " +
      "entièrement dans le navigateur.",
    summary:
      "Glisse n'importe quel morceau, il prend vie en temps réel : spectre circulaire, barres ou oscilloscope, " +
      "avec une détection de beat qui fait réagir l'image au kick. Tout tourne dans le navigateur.",
    tags: ["React", "TypeScript", "Web Audio API", "Canvas 2D", "Web Component"],
    stack: "React, TypeScript, Web Audio API, Canvas 2D",
    year: "2026",
    image: "/projets/visualiseur.webp",
    route: "/projets/visualiseur",
    repo: "https://github.com/benethomas38/vue-doc-rag",
    demo: true,
  },
];
