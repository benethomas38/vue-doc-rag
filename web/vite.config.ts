import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/** Balises des Web Components (React, Angular) : Vue les laisse au navigateur. */
const WEB_COMPONENTS = ["audio-visualizer", "agp-assistant"];

export default defineConfig({
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: (tag) => WEB_COMPONENTS.includes(tag) } },
    }),
  ],
  resolve: {
    alias: {
      // Le visualiseur React est buildé avec le site (son propre morceau de JS, chargé à la demande)
      "@widgets/visualizer-react": fileURLToPath(new URL("../widgets/visualizer-react/src/element.tsx", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // En développement, /api/* est redirigé vers le serveur Node : pas de souci de CORS
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
