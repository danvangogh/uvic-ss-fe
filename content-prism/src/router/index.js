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
import CreateContent from "../views/CreateContent.vue";
import ContentDetail from "../views/ContentDetail.vue";

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
    path: "/content/:id",
    name: "contentDetail",
    component: ContentDetail,
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
  {
    path: "/create-content",
    name: "createContent",
    component: CreateContent,
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

  // Always allow access to auth page if not logged in
  if (to.path === "/auth" && !user.value) {
    return true;
  }

  // Require auth for protected routes
  if (requiresAuth && !user.value) {
    return "/auth";
  }

  try {
    // For authenticated users, check their profile status
    if (user.value) {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("institution_id, role_id")
        .eq("id", user.value.id)
        .single();

      if (error) {
        console.error("Supabase error checking profile:", error);
        // If there's an error checking the profile, allow access to onboarding
        if (to.path === "/onboarding") {
          return true;
        }
        return "/auth";
      }

      // Handle navigation based on profile completion
      const isProfileComplete = profile?.institution_id && profile?.role_id;

      // Redirect from auth page if already logged in
      if (to.path === "/auth") {
        return isProfileComplete ? "/create-content" : "/onboarding";
      }

      // Prevent access to onboarding if profile is complete
      if (to.path === "/onboarding" && isProfileComplete) {
        return "/dashboard";
      }

      // Redirect to onboarding if profile is incomplete and route requires profile
      if (requiresProfile && !isProfileComplete) {
        return "/onboarding";
      }
    }

    return true;
  } catch (error) {
    console.error("Unexpected error in router guard:", error);
    // For unexpected errors, redirect to auth
    return "/auth";
  }
});

export default router;
