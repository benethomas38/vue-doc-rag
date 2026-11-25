# Portfolio · Thomas Béné

Mon site portfolio en Vue 3, avec en projet phare **Vue Doc Assistant** : un assistant RAG
(Retrieval-Augmented Generation) qui répond aux questions sur Vue.js à partir de la
documentation officielle, en citant chaque passage utilisé.

**Stack** : Vue 3 · React · Angular · Vue Router · TypeScript · Vite · Node / Express · API Claude (Anthropic) ·
Transformers.js · Vitest · Docker · GitHub Actions

## Trois frameworks, un seul site : les Web Components

Le site est en Vue. Deux projets sont écrits avec d'autres frameworks et livrés comme
**Web Components** : la page Vue n'utilise qu'une balise, sans connaître le code qu'il y a derrière.

| Projet | Framework | Balise | Build |
| --- | --- | --- | --- |
| Visualiseur audio | React 19 | `<audio-visualizer>` | avec le site (Vite), dans un morceau de JS chargé seulement sur sa page |
| Assistant AGP | Angular 22 (signaux, zoneless) | `<agp-assistant>` | à part (`widgets/agp-angular`, Angular CLI), script chargé par la page |

- **React** : `createRoot` dans un `HTMLElement` personnalisé, styles en CSS Modules.
- **Angular** : Angular Elements (`createCustomElement`), sans zone.js : la page Vue n'est pas
  « patchée ». Angular 22 demande TypeScript 6, d'où un `package.json` à part.
- **Code partagé** (`shared/`) : moteur audio, parseur SSE, libellés de l'agent. Du TypeScript
  sans framework, utilisé par Vue, React et Angular et testé une seule fois.
- Les couleurs passent par les variables CSS du site, qui traversent les Web Components.

## Vue Doc Assistant : fonctionnement

1. **Ingestion** : la doc Vue (Markdown) est découpée par titres, en gardant le fil
   d'Ariane (`Computed Properties > Writable Computed`) et sans couper les blocs de code.
2. **Embeddings** : chaque morceau est vectorisé en local avec un modèle multilingue
   (`multilingual-e5-small`), pour des questions en français sur une doc en anglais.
3. **Recherche hybride** : recherche vectorielle (le sens) + BM25 (les mots exacts),
   fusionnées par Reciprocal Rank Fusion.
4. **Génération** : les 6 meilleurs passages sont envoyés à Claude, qui répond en
   citant ses sources `[1]`, `[2]`… La réponse arrive en streaming (Server-Sent Events).
5. **Interface** : chat en streaming, Markdown rendu et nettoyé (DOMPurify),
   citations cliquables vers vuejs.org, thème clair / sombre, responsive.

## Le Donjon qui parle : fonctionnement

Un jeu d'exploration de donjon en pixel art, au tour par tour (`/projets/donjon`).
5 étages générés à chaque partie, 18 créatures (plus des élites), 33 objets, et 6 PNJ joués par Claude, dont un guide à l'entrée.

1. **Moteur** (`web/src/lib/game/`) : TypeScript pur, sans DOM ni Vue. Génération des étages
   (salles + couloirs + boucles), champ de vision, combat, statuts, saut du traceur, inventaire.
   Aléatoire à graine : une partie se rejoue à l'identique, ce qui rend le moteur testable.
2. **Rendu** : Canvas 2D, sprites 8 × 8 écrits en code (aucun fichier image).
3. **PNJ** (`src/game/`) : chaque réplique part vers `/api/game/talk` avec un résumé de la partie.
   Claude répond en streaming dans la peau du personnage et peut appeler **un** outil
   (`ajuster_prix`, `laisser_passer`, `juger_reponse`…). Le serveur valide l'appel, puis le
   moteur le borne : l'IA propose, le moteur dispose.
4. **Coûts** : 300 tokens max par réplique, nombre de répliques limité par PNJ et par partie,
   limite par visiteur et par heure, plafond par jour. Sans l'IA, le jeu reste jouable.

## Lancer le projet en local

```bash
npm install
npm run install:widgets   # dépendances du widget Angular
cp .env.example .env      # puis colle ta clé ANTHROPIC_API_KEY
npm run docs:fetch        # clone la doc Vue dans data/
npm run ingest            # découpe → data/chunks.json
npm run embed             # vectorise → data/index.json
npm run dev               # serveur (3001) + site (http://localhost:5173) + widget Angular en watch
```

Autres commandes : `npm test`, `npm run typecheck`, `npm run build`,
`npm run search -- "ta question"` (tester la recherche seule).

## Déploiement

Le site tourne sur un VPS avec Docker Compose : l'application et Caddy, qui gère le
HTTPS automatiquement. Guide pas à pas : [DEPLOY.md](DEPLOY.md).

Le `Dockerfile` construit une image unique : site buildé, serveur, index de la doc et
modèle d'embeddings. Variables d'environnement (fichier `.env`) :

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | clé de l'API Claude | (obligatoire) |
| `CLAUDE_MODEL` | modèle utilisé | `claude-haiku-5-5` |
| `RATE_LIMIT_PER_HOUR` | questions par visiteur et par heure | `10` |
| `DAILY_LIMIT` | questions par jour, tous visiteurs | `200` |
| `GAME_PER_HOUR` | répliques aux PNJ par visiteur et par heure | `40` |
| `GAME_DAILY_LIMIT` | répliques aux PNJ par jour, tous visiteurs | `600` |
| `GAME_MODEL` | modèle des PNJ (optionnel) | `CLAUDE_MODEL` |
| `DOMAIN` | nom de domaine (production, pour Caddy) | (aucun) |

La CI GitHub Actions vérifie les types, lance les tests et builde le site à chaque push.

## Structure

```
src/
├── ingest/   découpage de la doc, embeddings, recherche en ligne de commande
├── lib/      embeddings, similarité, BM25, fusion des classements
├── server/   API Express, prompt, appel à Claude (streaming), limites d'usage
└── game/     PNJ du donjon : personnalités, outils, validation, énigmes
shared/           TypeScript sans framework : moteur audio (visualizer/), parseur SSE, libellés de l'agent
widgets/
├── visualizer-react/  visualiseur audio en React → <audio-visualizer>
└── agp-angular/       assistant AGP en Angular → <agp-assistant> (build vers web/public/widgets/agp)
web/src/
├── views/        Accueil, Projets, pages des projets, 404
├── components/   en-tête, cartes de projet, chat du RAG (rag/)
├── composables/  useChat (lecture du flux SSE)
├── lib/          rendu Markdown, liens de citations
│   └── game/     moteur du jeu, génération, sprites, rendu Canvas
├── site.ts       infos personnelles
└── projects.ts   liste des projets
```

## Choix techniques

- **Pas de base vectorielle** : ~900 morceaux tiennent en mémoire, une recherche
  linéaire prend quelques millisecondes.
- **Embeddings en local** : gratuit, sans clé, aucune donnée envoyée à un tiers.
- **Recherche hybride** : le modèle d'embeddings seul ratait des termes exacts
  (`computed`) dans des questions en français ; BM25 corrige ça.
- **Maîtrise des coûts** : limite par visiteur, plafond journalier global, et
  annulation de l'appel à Claude si le visiteur ferme l'onglet.
