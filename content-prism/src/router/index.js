import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ContentRequest from "../views/ContentRequest.vue";
import Dashboard from "../views/Dashboard.vue";
import RecordDetail from "../views/RecordDetail.vue";
import LogIn from "../views/LogIn.vue";
import ProperoDashboard from "../views/ProperoDashboard.vue";
import ProperoRecordDetail from "../views/ProperoRecordDetail.vue";
import ProperoContentRequest from "../views/ProperoContentRequest.vue";

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
  {
    path: "/login",
    name: "login",
    component: LogIn,
  },
  {
    path: "/propero/dashboard",
    name: "properoDashboard",
    component: ProperoDashboard,
  },
  {
    path: "/propero/record/:id",
    name: "properoRecordDetail",
    component: ProperoRecordDetail,
  },
  {
    path: "/propero/content-request",
    name: "ProperoContentRequestView",
    component: ProperoContentRequest,
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
