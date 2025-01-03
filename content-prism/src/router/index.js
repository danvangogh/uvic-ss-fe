import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import Cookies from "js-cookie";
// Views
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
    meta: { requiresAuth: true },
  },
  {
    path: "/content-request",
    name: "ContentRequestView",
    component: ContentRequest,
    meta: { requiresAuth: true, role: "uvicSS" },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true, role: "uvicSS" },
  },
  {
    path: "/record/:id",
    name: "recordDetail",
    component: RecordDetail,
    meta: { requiresAuth: true, role: "uvicSS" },
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
    meta: { requiresAuth: true, role: "propero" },
  },
  {
    path: "/propero/record/:id",
    name: "properoRecordDetail",
    component: ProperoRecordDetail,
    meta: { requiresAuth: true, role: "propero" },
  },
  {
    path: "/propero/content-request",
    name: "ProperoContentRequestView",
    component: ProperoContentRequest,
    meta: { requiresAuth: true, role: "propero" },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// Navigation guard to update the document title
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const userRole = Cookies.get("role");

  if (requiresAuth) {
    const username = Cookies.get("username");
    if (!username) {
      next({ name: "login" });
    } else {
      const allowedRole = to.meta.role;
      if (allowedRole && allowedRole !== userRole) {
        next({ name: "unauthorized" });
      } else {
        next();
      }
    }
  } else {
    next();
  }

  // Set document title
  document.title = "Prism of Content"; // Default title
});

export default router;
