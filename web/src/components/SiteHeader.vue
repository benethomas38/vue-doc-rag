<script setup lang="ts">
import { fullName, site } from "../site";
</script>

<template>
  <header class="header">
    <div class="inner">
      <RouterLink to="/" class="name">{{ fullName }}</RouterLink>
      <nav class="nav" aria-label="Navigation principale">
        <RouterLink to="/projets" active-class="is-active">Projets</RouterLink>
        <a v-if="site.links.cv" :href="site.links.cv">CV</a>
        <a v-if="site.links.github" :href="site.links.github" target="_blank" rel="noopener">GitHub</a>
        <a v-if="site.links.email" :href="`mailto:${site.links.email}`">Contact</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 2px solid var(--ink);
}
.inner {
  max-width: var(--max);
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 24px;
}
.name {
  font-stretch: 75%;
  font-weight: 800;
  font-size: 22px;
  color: var(--ink);
  text-decoration: none;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  font-weight: 600;
}
.nav a {
  color: var(--ink);
  text-decoration: none;
  padding: 6px 0;
  border-bottom: 3px solid transparent;
}
.nav a:hover,
.nav a.is-active {
  border-bottom-color: var(--teal);
}
@media (max-width: 600px) {
  .inner {
    padding: 14px 16px;
  }
}
</style>
