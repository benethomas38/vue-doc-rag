import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import { fullName } from "./site";

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
      path: "/projets/visualiseur",
      name: "visualiseur",
      component: () => import("./views/VisualizerView.vue"),
      meta: { title: "Visualiseur audio" },
    },
    {
      path: "/projets/assistant-agp",
      name: "assistant-agp",
      component: () => import("./views/AgentView.vue"),
      meta: { title: "Assistant AGP" },
    },
    {
      path: "/projets/donjon",
      name: "donjon",
      component: () => import("./views/GameView.vue"),
      meta: { title: "Le Donjon qui parle" },
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
  document.title = title ? `${title} | ${fullName}` : `${fullName}, développeur front-end`;
});

export default router;
