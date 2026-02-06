import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useAuth } from "../stores/authStore";
// Views
import Dashboard from "../views/Dashboard.vue";
import Auth from "../views/Auth.vue";
import Onboarding from "../views/Onboarding.vue";
import ContentCreate from "../views/ContentCreate.vue";
import ContentDetail from "../views/ContentDetail.vue";
import BrandAssets from "../views/BrandAssets.vue";
import BrandVoice from "../views/BrandVoice.vue";
import BrandPositioning from "../views/BrandPositioning.vue";
import CheckEmail from "../views/CheckEmail.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: "/auth",
    name: "auth",
    component: Auth,
  },
  {
    path: "/onboarding",
    name: "onboarding",
    component: Onboarding,
    meta: { requiresAuth: true, requiresProfile: false },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/content",
    name: "content",
    redirect: "/content/create",
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/content/:id",
    name: "contentDetail",
    component: ContentDetail,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/content/create",
    name: "contentCreate",
    component: ContentCreate,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/brand",
    name: "brand",
    redirect: "/brand/assets",
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/brand/assets",
    name: "brandAssets",
    component: BrandAssets,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/brand/voice",
    name: "brandVoice",
    component: BrandVoice,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/brand/positioning",
    name: "brandPositioning",
    component: BrandPositioning,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/check-email",
    name: "checkEmail",
    component: CheckEmail,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// Navigation guard to check auth and profile completion
router.beforeEach(async (to) => {
  // Set the document title on each navigation
  document.title = "Prism of Content";

  const { user, loading } = useAuth();

  // Wait for auth to initialize
  if (loading.value) {
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (!loading.value) {
          clearInterval(check);
          resolve();
        }
      }, 10);
    });
  }

  // If not logged in, only allow /auth and /check-email
  if (!user.value && !["auth", "checkEmail"].includes(to.name)) {
    return "/auth";
  }

  // If logged in and on /auth, redirect to dashboard
  if (user.value && to.path === "/auth") {
    return "/dashboard";
  }

  return true;
});

export default router;
