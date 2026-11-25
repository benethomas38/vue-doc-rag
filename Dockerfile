# Image unique : site Vue buildé (avec ses widgets React et Angular) + serveur Node + index de la doc + modèle d'embeddings.
# Fonctionne sur n'importe quel hébergeur Docker (Render, Railway, Fly.io, VPS OVH…).

FROM node:22-slim

# git sert à cloner la doc Vue pendant le build
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances d'abord : Docker les garde en cache tant que package*.json ne change pas
COPY package.json package-lock.json ./
# Pas de carte graphique sur le serveur : on saute le téléchargement de la version CUDA
# d'onnxruntime (le moteur du modèle d'embeddings), qui échoue sinon.
RUN npm ci --onnxruntime-node-install-cuda=skip

# L'assistant AGP est une application Angular à part (TypeScript 6, ses propres dépendances)
COPY widgets/agp-angular/package.json widgets/agp-angular/package-lock.json ./widgets/agp-angular/
RUN npm ci --prefix widgets/agp-angular

# Index de la doc : on ne copie QUE le code qui le construit. Tant que ces fichiers
# ne changent pas, Docker réutilise le cache et saute la vectorisation (~3 min),
# même si le site ou le serveur ont changé. Le modèle d'embeddings est téléchargé
# ici et reste dans l'image : pas de téléchargement au démarrage.
COPY tsconfig.json ./
COPY src/ingest ./src/ingest
COPY src/lib ./src/lib
RUN npm run docs:fetch \
  && npm run ingest \
  && npm run embed \
  && rm -rf data/vue-docs

# Le reste du projet (site, serveur). data/ est exclu par .dockerignore,
# donc l'index construit juste au-dessus n'est pas écrasé.
COPY . .

# Assistant Angular → web/public/widgets/agp, puis site Vue (+ visualiseur React) → web/dist, servi par Express
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# ANTHROPIC_API_KEY est fournie par l'hébergeur, jamais copiée dans l'image
CMD ["npm", "start"]
