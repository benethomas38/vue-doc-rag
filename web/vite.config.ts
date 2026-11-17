import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // En développement, /api/* est redirigé vers le serveur Node : pas de souci de CORS
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
