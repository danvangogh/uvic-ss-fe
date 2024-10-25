import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ContentRequest from "../views/ContentRequest.vue";
import Dashboard from "../views/Dashboard.vue";
import RecordDetail from "../views/RecordDetail.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/content-request",
    name: "ContentRequestView",
    component: ContentRequest,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
  },
  {
    path: "/record/:id",
    name: "recordDetail",
    component: RecordDetail,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// Navigation guard to update the document title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || "Prism of Content";
  next();
});

export default router;
