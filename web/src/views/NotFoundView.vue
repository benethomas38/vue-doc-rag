<template>
  <section class="nf">
    <h1>Page introuvable</h1>
    <p>Le lien est peut-être ancien, ou il contient une faute de frappe.</p>
    <RouterLink to="/" class="btn btn--primary">Revenir à l'accueil</RouterLink>
  </section>
</template>

<style scoped>
.nf {
  padding: 96px 0;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(44px, 8vw, 80px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
}
p {
  margin: 0 0 24px;
}
</style>
