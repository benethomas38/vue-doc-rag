<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { site } from "../site";

const open = ref(false);
const route = useRoute();

// Referme le menu mobile après un changement de page
watch(() => route.fullPath, () => (open.value = false));

const links = [
  { to: "/", label: "Accueil" },
  { to: "/projets", label: "Projets" },
];
</script>

<template>
  <header class="header">
    <div class="inner">
      <RouterLink to="/" class="brand" aria-label="Accueil">
        <span class="mark" aria-hidden="true">TB</span>
        <span class="brand__name">{{ site.name }}</span>
      </RouterLink>

      <button
        class="burger"
        :aria-expanded="open"
        aria-controls="menu"
        aria-label="Menu"
        @click="open = !open"
      >
        <span /><span />
      </button>

      <nav id="menu" class="nav" :class="{ 'nav--open': open }" aria-label="Navigation principale">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="nav__link"
          :exact-active-class="l.to === '/' ? 'is-active' : ''"
          :active-class="l.to === '/' ? '' : 'is-active'"
        >
          {{ l.label }}
        </RouterLink>
        <a v-if="site.links.github" :href="site.links.github" target="_blank" rel="noopener" class="nav__link">
          GitHub
        </a>
        <a v-if="site.links.email" :href="`mailto:${site.links.email}`" class="nav__cta">Me contacter</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.inner {
  max-width: var(--max);
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
}
.mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.nav__link {
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}
.nav__link:hover {
  color: var(--text);
}
.nav__link.is-active {
  color: var(--text);
  background: var(--accent-soft);
}
.nav__cta {
  margin-left: 8px;
  padding: 7px 14px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--on-accent);
  text-decoration: none;
  font-weight: 600;
}

.burger {
  display: none;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.burger span {
  display: block;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--text);
  transition: transform 0.2s;
}
.burger[aria-expanded="true"] span:first-child { transform: translateY(3.5px) rotate(45deg); }
.burger[aria-expanded="true"] span:last-child { transform: translateY(-3.5px) rotate(-45deg); }

@media (max-width: 640px) {
  .burger { display: flex; }
  .brand__name { display: none; }
  .nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    padding: 8px 16px 16px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .nav--open { display: flex; }
  .nav__link { padding: 12px; }
  .nav__cta { margin: 8px 0 0; text-align: center; }
}
</style>
