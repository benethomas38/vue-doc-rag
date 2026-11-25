/**
 * Les énigmes de la Sphinge. Les réponses ne quittent jamais le serveur :
 * le client ne reçoit que la question (GET /api/game/riddle/:index).
 * Le client tire un numéro entre 0 et 7 : garde 8 énigmes, ou ajuste createGame().
 */
export interface Riddle {
  question: string;
  answer: string;
}

export const RIDDLES: Riddle[] = [
  {
    question: "Plus j'ai de gardiens, moins je suis gardé. Dès qu'on me partage, je n'existe plus. Qui suis-je ?",
    answer: "un secret",
  },
  {
    question: "Je te suis partout quand il fait jour, je disparais dans le noir, et c'est la lumière qui me fait naître. Qui suis-je ?",
    answer: "l'ombre",
  },
  {
    question: "Plus on m'enlève, plus je deviens grand. Qui suis-je ?",
    answer: "un trou",
  },
  {
    question: "J'ai des villes sans maisons, des forêts sans arbres et des fleuves sans eau. Qui suis-je ?",
    answer: "une carte (géographique)",
  },
  {
    question: "Je parle sans bouche, j'entends sans oreilles, et je ne fais que répéter ce qu'on me dit. Qui suis-je ?",
    answer: "l'écho",
  },
  {
    question: "Qu'est-ce qui monte toujours et ne redescend jamais ?",
    answer: "l'âge",
  },
  {
    question: "Je suis toujours devant toi, mais tu ne pourras jamais me voir. Qui suis-je ?",
    answer: "l'avenir (le futur, demain)",
  },
  {
    question: "Il suffit de prononcer mon nom pour me briser. Qui suis-je ?",
    answer: "le silence",
  },
];

export function riddle(index: number): Riddle {
  const i = Number.isInteger(index) ? Math.abs(index) % RIDDLES.length : 0;
  return RIDDLES[i];
}
