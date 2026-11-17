# Vue Doc RAG

Assistant qui répond aux questions sur la documentation officielle de Vue.js, en citant ses sources.

**Stack** : TypeScript · Node · Vitest · API Claude (Anthropic) · Vue 3 + Vite (interface, à venir)

## Étape 1 — Ingestion de la doc

```bash
npm install
npm run docs:fetch   # clone la doc Vue (Markdown) dans data/vue-docs
npm run ingest       # découpe la doc en morceaux → data/chunks.json
npm test             # tests unitaires du découpage
```

Le découpage suit les titres de la doc (`##`, `###`) et garde le fil d'Ariane
(ex. `Computed Properties > Writable Computed`), ce qui donne des sources lisibles
dans les réponses. Les sections longues sont redécoupées par paragraphes,
sans jamais couper un bloc de code en deux.

## Feuille de route

- [x] 1. Récupérer et découper la doc
- [ ] 2. Embeddings + stockage vectoriel
- [ ] 3. Serveur Node : recherche des passages + appel à Claude
- [ ] 4. Interface Vue 3 avec affichage des sources
