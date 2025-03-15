import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useAuth } from "../stores/authStore";
import { supabase } from "../supabase";
// Views
import ContentRequest from "../views/ContentRequest.vue";
import Dashboard from "../views/Dashboard.vue";
import RecordDetail from "../views/RecordDetail.vue";
import Auth from "../views/Auth.vue";
import Onboarding from "../views/Onboarding.vue";
import ProperoDashboard from "../views/ProperoDashboard.vue";
import ProperoRecordDetail from "../views/ProperoRecordDetail.vue";
import ProperoContentRequest from "../views/ProperoContentRequest.vue";
import ProperoReports from "../views/ProperoReports.vue";

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
    path: "/content-request",
    name: "ContentRequestView",
    component: ContentRequest,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/record/:id",
    name: "recordDetail",
    component: RecordDetail,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/propero/dashboard",
    name: "properoDashboard",
    component: ProperoDashboard,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/propero/record/:id",
    name: "properoRecordDetail",
    component: ProperoRecordDetail,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/propero/content-request",
    name: "ProperoContentRequestView",
    component: ProperoContentRequest,
    meta: { requiresAuth: true, requiresProfile: true },
  },
  {
    path: "/propero/reports",
    name: "ProperoReports",
    component: ProperoReports,
    meta: { requiresAuth: true, requiresProfile: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// Navigation guard to check auth and profile completion
router.beforeEach(async (to) => {
  const { user, loading } = useAuth();

  // Wait for auth to initialize
  if (loading.value) {
    return;
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresProfile = to.matched.some(
    (record) => record.meta.requiresProfile
  );

  if (requiresAuth && !user.value) {
    return "/auth";
  }

  if (to.path === "/auth" && user.value) {
    return "/dashboard";
  }

  // Check if user needs to complete profile
  if (requiresProfile && user.value) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("institution_id, role_id")
      .eq("id", user.value.id)
      .single();

    if (!profile?.institution_id || !profile?.role_id) {
      return "/onboarding";
    }
  }
});

export default router;
