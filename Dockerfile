# Image unique : site Vue buildé + serveur Node + index de la doc + modèle d'embeddings.
# Fonctionne sur n'importe quel hébergeur Docker (Render, Railway, Fly.io, VPS OVH…).

FROM node:22-slim

# git sert à cloner la doc Vue pendant le build
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances d'abord : Docker les garde en cache tant que package*.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Index de la doc construit une fois pour toutes. Le modèle d'embeddings est
# téléchargé ici et reste dans l'image : pas de téléchargement au démarrage.
RUN npm run docs:fetch \
  && npm run ingest \
  && npm run embed \
  && rm -rf data/vue-docs

# Interface Vue → web/dist, servie par Express
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# ANTHROPIC_API_KEY est fournie par l'hébergeur, jamais copiée dans l'image
CMD ["npm", "start"]
