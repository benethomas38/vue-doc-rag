<script setup lang="ts">
import SiteHeader from "./components/SiteHeader.vue";
import { site } from "./site";

const year = new Date().getFullYear();
</script>

<template>
  <a class="skip" href="#contenu">Aller au contenu</a>
  <SiteHeader />
  <main id="contenu" class="page">
    <RouterView />
  </main>
  <footer class="site-footer">
    <span>© {{ year }} {{ site.name }}</span>
    <span>Fait avec Vue 3, TypeScript et un peu d'IA</span>
  </footer>
</template>

<style scoped>
.page {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0 16px;
  min-height: calc(100dvh - 140px);
}
.site-footer {
  max-width: var(--max);
  margin: 0 auto;
  padding: 32px 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
}
.skip {
  position: absolute;
  left: -9999px;
}
.skip:focus {
  left: 16px;
  top: 12px;
  z-index: 10;
  padding: 8px 12px;
  background: var(--surface);
  border-radius: 8px;
}
</style>
