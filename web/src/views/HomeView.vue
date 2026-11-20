<script setup lang="ts">
import ProjectCard from "../components/ProjectCard.vue";
import { site } from "../site";
import { projects } from "../projects";

const featured = projects.slice(0, 3);
</script>

<template>
  <section class="hero">
    <p v-if="site.available" class="badge"><span class="dot" aria-hidden="true" />{{ site.available }}</p>
    <h1>
      {{ site.name }}<br />
      <span class="role">{{ site.role }}</span>
    </h1>
    <p class="intro">{{ site.intro }}</p>
    <p class="loc">{{ site.location }}</p>

    <div class="cta">
      <RouterLink to="/projets" class="btn btn--primary">Voir mes projets</RouterLink>
      <a v-if="site.links.cv" :href="site.links.cv" class="btn" download>Télécharger mon CV</a>
      <a v-if="site.links.linkedin" :href="site.links.linkedin" target="_blank" rel="noopener" class="btn">LinkedIn</a>
      <a v-if="site.links.email" :href="`mailto:${site.links.email}`" class="btn">Me contacter</a>
    </div>
  </section>

  <section class="block" aria-labelledby="skills-title">
    <h2 id="skills-title">Compétences</h2>
    <ul class="skills">
      <li v-for="s in site.skills" :key="s">{{ s }}</li>
    </ul>
  </section>

  <section class="block" aria-labelledby="projects-title">
    <div class="block__head">
      <h2 id="projects-title">Projets récents</h2>
      <RouterLink to="/projets" class="more">Tous les projets →</RouterLink>
    </div>
    <div class="grid">
      <ProjectCard v-for="p in featured" :key="p.slug" :project="p" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: clamp(48px, 10vw, 110px) 0 48px;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--muted);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
h1 {
  margin: 0;
  font-size: clamp(2.3rem, 7vw, 4.2rem);
  line-height: 1.05;
  letter-spacing: -0.035em;
}
.role {
  color: var(--accent-strong);
}
.intro {
  max-width: 60ch;
  margin: 24px 0 8px;
  font-size: 1.1rem;
  color: var(--muted);
}
.loc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}
.loc::before {
  content: "📍 ";
}
.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.block {
  padding: 32px 0;
}
.block h2 {
  margin: 0 0 16px;
  font-size: 1.35rem;
  letter-spacing: -0.01em;
}
.block__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.more {
  color: var(--accent-strong);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}
.skills {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.skills li {
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 0.92rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 16px;
}
</style>
