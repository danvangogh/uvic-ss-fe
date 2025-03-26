<template>
  <div class="app-layout">
    <!-- Left Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-logo">
        <img src="/favicon.ico" alt="Logo" class="logo" />
      </div>

      <div class="nav-sections">
        <!-- Content Section -->
        <div
          class="nav-section"
          :class="{ active: activeSection === 'content' }"
        >
          <div class="section-header" @click="navigateToContent">
            <span class="section-title">Content</span>
            <i
              class="arrow"
              :class="{ expanded: expandedSection === 'content' }"
            ></i>
          </div>
          <div class="section-items" v-show="expandedSection === 'content'">
            <router-link
              to="/create-content"
              class="nav-item"
              :class="{ active: $route.name === 'createContent' }"
            >
              Create
            </router-link>
            <router-link
              to="/dashboard"
              class="nav-item"
              :class="{ active: $route.name === 'dashboard' }"
            >
              Dashboard
            </router-link>
            <router-link
              to="/charts"
              class="nav-item"
              :class="{ active: $route.name === 'chartCreator' }"
            >
              Charts
            </router-link>
            <router-link
              to="/research"
              class="nav-item"
              :class="{ active: $route.name === 'research' }"
            >
              Research
            </router-link>
          </div>
        </div>

        <!-- Brand Section -->
        <div class="nav-section" :class="{ active: activeSection === 'brand' }">
          <div class="section-header" @click="navigateToBrand">
            <span class="section-title">Brand</span>
            <i
              class="arrow"
              :class="{ expanded: expandedSection === 'brand' }"
            ></i>
          </div>
          <div class="section-items" v-show="expandedSection === 'brand'">
            <router-link
              to="/brand/assets"
              class="nav-item"
              :class="{ active: $route.name === 'brandAssets' }"
            >
              Assets
            </router-link>
          </div>
        </div>

        <!-- Account Section -->
        <div
          class="nav-section"
          :class="{ active: activeSection === 'account' }"
        >
          <div class="section-header" @click="toggleSection('account')">
            <span class="section-title">Account</span>
            <i
              class="arrow"
              :class="{ expanded: expandedSection === 'account' }"
            ></i>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Top Brand Bar -->
      <header class="brand-bar">
        <div class="brand-logo">
          <img :src="brandLogo || '/favicon.ico'" alt="Logo" class="logo" />
        </div>
        <div class="brand-actions">
          <button
            class="create-button"
            @click="$router.push('/create-content')"
          >
            Create
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="page-content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const brandLogo = ref(null);

const expandedSection = ref("content"); // Default expanded section
const activeSection = computed(() => {
  const path = route.path;
  if (path.includes("content") || path.includes("dashboard")) return "content";
  if (path.includes("brand")) return "brand";
  if (path.includes("account")) return "account";
  return "content";
});

const toggleSection = (section) => {
  expandedSection.value = expandedSection.value === section ? null : section;
};

// Combined function to navigate to brand page and toggle the section
const navigateToBrand = () => {
  router.push("/brand"); // This will redirect to /brand/assets
  if (expandedSection.value !== "brand") {
    expandedSection.value = "brand";
  }
};

// Combined function to navigate to content page and toggle the section
const navigateToContent = () => {
  router.push("/content"); // This will redirect to /create-content
  if (expandedSection.value !== "content") {
    expandedSection.value = "content";
  }
};

const fetchBrandLogo = async () => {
  try {
    // First get the user's institution_id from their profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("institution_id")
      .eq("id", user.value.id)
      .single();

    if (profile?.institution_id) {
      // Then fetch the brand assets for that institution
      const { data: brandAssets } = await supabase
        .from("brand_assets")
        .select("logo")
        .eq("institution_id", profile.institution_id)
        .single();

      if (brandAssets?.logo) {
        brandLogo.value = brandAssets.logo;
      }
    }
  } catch (error) {
    console.error("Error fetching brand assets:", error);
  }
};

// Fetch logo when component is mounted
onMounted(() => {
  if (user.value) {
    fetchBrandLogo();
  }
});

// Watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    fetchBrandLogo();
  } else {
    brandLogo.value = null;
  }
});
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: #1a1a1a;
  color: white;
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  padding: 0 1.5rem;
  margin-bottom: 2rem;
}

.logo {
  height: 32px;
  width: auto;
}

.nav-sections {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-section {
  cursor: pointer;
}

.section-header {
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.1);
}

.section-items {
  padding: 0.5rem 0;
}

.nav-item {
  display: block;
  padding: 0.5rem 2rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.arrow {
  border: solid white;
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
  transform: rotate(45deg);
  transition: transform 0.2s;
}

.arrow.expanded {
  transform: rotate(-135deg);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.brand-bar {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
}

.brand-logo {
  display: flex;
  align-items: center;
  height: 100%;
}

.brand-logo .logo {
  height: 32px;
  width: auto;
  display: block;
}

.create-button {
  padding: 0.5rem 1.5rem;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.create-button:hover {
  background: #0066cc;
}

.page-content {
  flex: 1;
  padding: 2rem;
}
</style>
