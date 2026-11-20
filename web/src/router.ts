import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import { site } from "./site";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView, meta: { title: "" } },
    {
      path: "/projets",
      name: "projects",
      component: () => import("./views/ProjectsView.vue"),
      meta: { title: "Projets" },
    },
    {
      // Chargée seulement quand on ouvre la page : le rendu Markdown ne pèse pas sur l'accueil
      path: "/projets/vue-doc-rag",
      name: "vue-doc-rag",
      component: () => import("./views/RagView.vue"),
      meta: { title: "Vue Doc Assistant" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("./views/NotFoundView.vue"),
      meta: { title: "Page introuvable" },
    },
  ],
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 };
  },
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · ${site.name}` : `${site.name} · ${site.role}`;
});

export default router;
