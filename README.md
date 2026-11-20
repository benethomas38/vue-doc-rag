# Portfolio · Thomas Béné

Mon site portfolio en Vue 3, avec en projet phare **Vue Doc Assistant** : un assistant RAG
(Retrieval-Augmented Generation) qui répond aux questions sur Vue.js à partir de la
documentation officielle, en citant chaque passage utilisé.

**Stack** : Vue 3 · Vue Router · TypeScript · Vite · Node / Express · API Claude (Anthropic) ·
Transformers.js · Vitest · Docker · GitHub Actions

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

## Lancer le projet en local

```bash
npm install
cp .env.example .env      # puis colle ta clé ANTHROPIC_API_KEY
npm run docs:fetch        # clone la doc Vue dans data/
npm run ingest            # découpe → data/chunks.json
npm run embed             # vectorise → data/index.json
npm run dev               # serveur (3001) + site (http://localhost:5173)
```

Autres commandes : `npm test`, `npm run typecheck`, `npm run build`,
`npm run search -- "ta question"` (tester la recherche seule).

## Déploiement

Le `Dockerfile` construit une image unique : site buildé, serveur, index de la doc et
modèle d'embeddings. Variables à définir chez l'hébergeur :

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | clé de l'API Claude | (obligatoire) |
| `CLAUDE_MODEL` | modèle utilisé | `claude-haiku-5-5` |
| `RATE_LIMIT_PER_HOUR` | questions par visiteur et par heure | `10` |
| `DAILY_LIMIT` | questions par jour, tous visiteurs | `200` |

La CI GitHub Actions vérifie les types, lance les tests et builde le site à chaque push.

## Structure

```
src/
├── ingest/   découpage de la doc, embeddings, recherche en ligne de commande
├── lib/      embeddings, similarité, BM25, fusion des classements
└── server/   API Express, prompt, appel à Claude (streaming), limites d'usage
web/src/
├── views/        Accueil, Projets, page du RAG, 404
├── components/   en-tête, cartes de projet, chat du RAG (rag/)
├── composables/  useChat (lecture du flux SSE)
├── lib/          parseur SSE, rendu Markdown, liens de citations
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
