<template>
  <AppLayout v-if="!isAuthRoute">
    <router-view></router-view>
  </AppLayout>
  <router-view v-else></router-view>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppLayout from "./components/AppLayout.vue";

const route = useRoute();
const isAuthRoute = computed(() => {
  return ["/auth", "/login", "/signup"].includes(route.path);
});
</script>

<style>
/* Global styles */
:root {
  --primary-color: #007aff;
  --primary-hover: #0066cc;
  --text-color: #1a1a1a;
  --background-color: #f5f5f5;
  --border-color: #eaeaea;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  color: var(--text-color);
  line-height: 1.5;
}

#app {
  min-height: 100vh;
}
</style>
