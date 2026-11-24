<script setup lang="ts">
import SiteHeader from "./components/SiteHeader.vue";
import { fullName, site } from "./site";

const year = new Date().getFullYear();
</script>

<template>
  <a class="skip" href="#contenu">Aller au contenu</a>
  <SiteHeader />
  <main id="contenu" class="page">
    <RouterView />
  </main>
  <footer class="site-footer">
    <p>{{ fullName }}, {{ year }}</p>
    <p class="links">
      <a v-if="site.links.email" :href="`mailto:${site.links.email}`">{{ site.links.email }}</a>
      <a v-if="site.links.linkedin" :href="site.links.linkedin" target="_blank" rel="noopener">LinkedIn</a>
      <a v-if="site.links.github" :href="site.links.github" target="_blank" rel="noopener">GitHub</a>
    </p>
  </footer>
</template>

<style scoped>
.page {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0 24px;
  min-height: calc(100dvh - 160px);
}
.site-footer {
  max-width: var(--max);
  margin: 64px auto 0;
  padding: 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 24px;
  border-top: 2px solid var(--ink);
  font-size: 15px;
}
.site-footer p {
  margin: 0;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
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
  background: var(--paper);
}
@media (max-width: 600px) {
  .page {
    padding: 0 16px;
  }
  .site-footer {
    padding: 24px 16px;
  }
}
</style>
