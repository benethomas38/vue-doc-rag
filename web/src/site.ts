/**
 * Tes infos personnelles, utilisées sur tout le site.
 * Laisse un lien vide ("") pour le masquer.
 */
export const site = {
  firstName: "Thomas",
  lastName: "Béné",
  role: "Développeur front-end à Grenoble",
  status: "Freelance, disponible pour de nouvelles missions.",
  intro:
    "Je fais du front depuis plus de six ans, surtout en Vue.js, mais aussi en AngularJS et en React. " +
    "J'utilise l'IA pour coder, déboguer et apprendre plus vite, et je l'intègre dans mes projets : " +
    "le premier, un assistant qui répond aux questions sur la doc de Vue, tourne en ligne sur ce site.",

  // Regroupées comme sur le CV
  skills: [
    {
      title: "Code",
      items: ["Vue 3 et Vue 2.7", "AngularJS", "TypeScript, JavaScript", "HTML5, CSS3 responsive", "Node.js, Express", "React (notions)"],
    },
    {
      title: "IA",
      items: ["ChatGPT et Claude pour coder", "RAG, embeddings", "API Claude en streaming", "Maîtrise des coûts d'API"],
    },
    {
      title: "Outils",
      items: ["Vite, Vitest", "Git, GitHub Actions", "Docker, Caddy", "VPS Linux", "Spring Boot (notions)"],
    },
    {
      title: "Organisation",
      items: ["Agile, Scrum", "Analyse du besoin client", "UX", "Travail en autonomie (freelance)"],
    },
  ],

  // Ce qui fait que tu n'es pas un CV comme les autres
  offscreen: [
    {
      title: "Parkour",
      text:
        "J'encadre des séances et je suis au conseil d'administration de l'Association Grenobloise de Parkour. " +
        "J'y ai organisé des événements de plusieurs centaines de participants.",
    },
    {
      title: "Musique",
      text: "Je rappe, et je mène mes projets jusqu'au bout : albums, clips et tout ce qui va autour.",
    },
    {
      title: "Voyage",
      text:
        "Deux ans à l'étranger, souvent en auto-stop, dont un passage comme barman au Guatemala. " +
        "J'en suis revenu avec un anglais C1 et un espagnol B1.",
    },
  ],

  links: {
    github: "https://github.com/benethomas38",
    linkedin: "",          // ex. "https://www.linkedin.com/in/ton-profil"
    email: "",             // ex. "contact@benethomas.fr"
    cv: "",                // ex. "/cv.pdf" après avoir placé le fichier dans web/public/
  },
};

export const fullName = `${site.firstName} ${site.lastName}`;
