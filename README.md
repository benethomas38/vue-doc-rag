# Vue Doc Assistant

Assistant RAG (Retrieval-Augmented Generation) qui répond aux questions sur Vue.js
à partir de la documentation officielle, en citant chaque passage utilisé.

**Stack** : Vue 3 · TypeScript · Vite · Node / Express · API Claude (Anthropic) ·
Transformers.js · Vitest

## Fonctionnement

1. **Ingestion** — la doc Vue (Markdown) est découpée par titres, en gardant le fil
   d'Ariane (`Computed Properties > Writable Computed`) et sans couper les blocs de code.
2. **Embeddings** — chaque morceau est vectorisé en local avec un modèle multilingue
   (`multilingual-e5-small`) : questions en français, doc en anglais.
3. **Recherche hybride** — recherche vectorielle (le sens) + BM25 (les mots exacts),
   fusionnées par Reciprocal Rank Fusion.
4. **Génération** — les 6 meilleurs passages sont envoyés à Claude, qui répond en
   citant ses sources `[1]`, `[2]`… La réponse arrive en streaming (Server-Sent Events).
5. **Interface Vue 3** — chat en streaming, Markdown rendu et nettoyé (DOMPurify),
   citations cliquables vers vuejs.org, thème clair / sombre.

## Lancer le projet

```bash
npm install
cp .env.example .env      # puis colle ta clé ANTHROPIC_API_KEY
npm run docs:fetch        # clone la doc Vue dans data/
npm run ingest            # découpe → data/chunks.json
npm run embed             # vectorise → data/index.json
npm run dev               # serveur (3001) + interface (http://localhost:5173)
```

Autres commandes : `npm test` (tests unitaires), `npm run typecheck`,
`npm run search -- "ta question"` (tester la recherche seule).

## Structure

```
src/
├── ingest/   découpage de la doc, embeddings, recherche en ligne de commande
├── lib/      embeddings, similarité, BM25, fusion des classements
└── server/   API Express, construction du prompt, appel à Claude (streaming)
web/
└── src/
    ├── components/   ChatMessage, QuestionForm
    ├── composables/  useChat (lecture du flux SSE)
    └── lib/          parseur SSE, rendu Markdown, liens de citations
```

## Choix techniques

- **Pas de base vectorielle** : ~900 morceaux tiennent en mémoire, une recherche
  linéaire prend quelques millisecondes. Une base (pgvector, Qdrant) deviendrait
  utile au-delà de quelques centaines de milliers de morceaux.
- **Embeddings en local** : gratuit, sans clé, et aucune donnée envoyée à un tiers.
- **Recherche hybride** : le modèle d'embeddings seul ratait des termes exacts
  (`computed`) dans des questions en français ; BM25 corrige ça.
- **Annulation** : si l'utilisateur ferme l'onglet, l'appel à Claude est interrompu.
