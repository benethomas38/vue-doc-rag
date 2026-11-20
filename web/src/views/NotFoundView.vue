<template>
  <section class="nf">
    <p class="code">404</p>
    <h1>Cette page n'existe pas</h1>
    <RouterLink to="/" class="btn btn--primary">Retour à l'accueil</RouterLink>
  </section>
</template>

<style scoped>
.nf {
  padding: 96px 0;
  text-align: center;
}
.code {
  margin: 0;
  font-size: 4rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.04em;
}
h1 {
  margin: 0 0 24px;
  font-size: 1.4rem;
}
</style>
