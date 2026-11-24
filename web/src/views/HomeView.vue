<script setup lang="ts">
import ProjectCard from "../components/ProjectCard.vue";
import { site } from "../site";
import { projects } from "../projects";
</script>

<template>
  <section class="hero">
    <div class="hero__text">
      <h1 class="name">
        <span>{{ site.firstName }}</span>
        <span>{{ site.lastName }}</span>
      </h1>
      <p class="role">{{ site.role }}</p>
      <p class="intro">{{ site.intro }}</p>
      <p class="status">{{ site.status }}</p>
      <p class="cta">
        <RouterLink to="/projets/vue-doc-rag" class="btn btn--primary">Tester mon assistant IA</RouterLink>
        <a v-if="site.links.cv" :href="site.links.cv" class="btn" download>Télécharger mon CV</a>
        <a v-if="site.links.email" :href="`mailto:${site.links.email}`" class="btn">M'écrire</a>
      </p>
    </div>
    <!-- Les deux blocs de couleur reprennent le bandeau et la colonne du CV -->
    <div class="hero__photo" aria-hidden="true">
      <div class="block block--blue" />
      <div class="block block--teal">
        <img src="/photo.png" alt="" width="600" height="600" />
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="skills-title">
    <h2 id="skills-title">Ce que je sais faire</h2>
    <div class="skills">
      <div v-for="g in site.skills" :key="g.title" class="skills__col">
        <h3>{{ g.title }}</h3>
        <ul>
          <li v-for="s in g.items" :key="s">{{ s }}</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="projects-title">
    <h2 id="projects-title">Projets</h2>
    <ProjectCard v-for="p in projects" :key="p.slug" :project="p" />
  </section>

  <section class="section" aria-labelledby="offscreen-title">
    <h2 id="offscreen-title">Hors de l'écran</h2>
    <div class="offscreen">
      <div v-for="o in site.offscreen" :key="o.title">
        <h3>{{ o.title }}</h3>
        <p>{{ o.text }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 48px;
  align-items: center;
  padding: 28px 0 56px;
}
.name {
  margin: 0;
  display: flex;
  flex-direction: column;
  font-size: clamp(64px, 12vw, 148px);
  font-stretch: 62%;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}
.name span:last-child {
  color: var(--blue);
}
.role {
  margin: 20px 0 0;
  font-size: 22px;
  font-weight: 700;
}
.intro {
  margin: 12px 0 0;
  max-width: 56ch;
}
.status {
  margin: 12px 0 0;
  padding-left: 12px;
  border-left: 4px solid var(--teal);
  font-weight: 600;
}
.cta {
  margin: 28px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero__photo {
  position: relative;
  aspect-ratio: 1;
  max-width: 380px;
  width: 100%;
  justify-self: end;
}
.block {
  position: absolute;
  border-radius: 4px;
}
.block--blue {
  inset: 14% 0 0 14%;
  background: var(--blue);
}
.block--teal {
  inset: 0 14% 14% 0;
  background: var(--teal);
  overflow: hidden;
  display: grid;
  place-items: end center;
}
.block--teal img {
  width: 92%;
  height: auto;
  border-radius: 50%;
  margin-bottom: 4%;
  /* Photo en noir et blanc, posée sur le turquoise */
  filter: grayscale(1) contrast(1.05);
}

.section {
  padding: 56px 0 8px;
}
.section > h2 {
  margin: 0 0 28px;
  font-size: clamp(36px, 6vw, 56px);
}

.skills {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 2px solid var(--ink);
}
.skills__col {
  padding: 20px 20px 8px 0;
}
.skills__col + .skills__col {
  padding-left: 20px;
  border-left: 1px solid var(--border);
}
.skills h3 {
  margin: 0 0 12px;
  font-size: 26px;
  color: var(--blue-deep);
}
.skills ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.skills li {
  padding: 4px 0;
}

.offscreen {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}
.offscreen h3 {
  margin: 0 0 8px;
  font-size: 26px;
  padding-bottom: 6px;
  border-bottom: 4px solid var(--teal);
  display: inline-block;
}
.offscreen p {
  margin: 0;
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px 0 40px;
    gap: 24px;
  }
  .hero__photo {
    order: -1;
    max-width: 180px;
    justify-self: start;
  }
  .skills {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .skills__col:nth-child(3) {
    padding-left: 0;
    border-left: 0;
  }
  .offscreen {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
}
@media (max-width: 480px) {
  .skills {
    grid-template-columns: minmax(0, 1fr);
  }
  .skills__col + .skills__col {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid var(--border);
  }
}
</style>
