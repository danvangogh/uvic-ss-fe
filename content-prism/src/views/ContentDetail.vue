<template>
  <div class="content-detail">
    <div v-if="loading" class="loading">Loading content...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="content" class="content-container">
      <header class="content-header">
        <div class="header-content">
          <div class="title-section">
            <h1>{{ content.source_content_title }}</h1>
            <span class="date"
              >Created {{ formatDate(content.created_at) }}</span
            >
          </div>
          <div class="progress-section">
            <div class="progress-bar">
              <div
                v-for="(status, index) in statusFlags"
                :key="index"
                class="progress-item"
                :class="{ completed: content[status.flag] }"
              >
                <div class="progress-dot"></div>
                <div class="progress-label">{{ status.label }}</div>
              </div>
              <div class="progress-line"></div>
            </div>
          </div>
        </div>
      </header>

      <div class="content-body">
        <!-- Content sections will go here -->
      </div>
    </div>

    <div v-else class="not-found">Content not found</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../supabase";

const route = useRoute();
const content = ref(null);
const loading = ref(true);
const error = ref(null);

const statusFlags = [
  { flag: "is_new_submission", label: "New Submission" },
  { flag: "is_capturing_source_text", label: "Capturing Source Text" },
  { flag: "is_source_text_captured", label: "Source Text Captured" },
  { flag: "is_template_selected", label: "Template Selected" },
  { flag: "is_generating_post_text", label: "Generating Post Text" },
  { flag: "is_post_text_generated", label: "Post Text Generated" },
  { flag: "is_generating_imagery", label: "Generating Imagery" },
  { flag: "is_imagery_generated", label: "Imagery Generated" },
];

const fetchContent = async () => {
  const contentId = route.params.id;
  if (!contentId) {
    error.value = "No content ID provided";
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    const { data, error: fetchError } = await supabase
      .from("source_content")
      .select(
        `
        *,
        template:template_id (
          template_name,
          template_content_description,
          post_type_id,
          content_template_post_types (
            content_template_post_type_name
          )
        )
      `
      )
      .eq("id", contentId)
      .single();

    if (fetchError) throw fetchError;

    if (!data) {
      error.value = "Content not found";
      return;
    }

    content.value = data;
  } catch (err) {
    console.error("Error fetching content:", err);
    error.value = "Failed to load content. Please try again later.";
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Watch for route changes to handle direct navigation
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      fetchContent();
    }
  }
);

onMounted(() => {
  fetchContent();
});
</script>

<style scoped>
.content-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.content-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.content-header {
  padding: 2rem;
  border-bottom: 1px solid #eee;
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.title-section {
  flex: 1;
}

h1 {
  margin: 0 0 0.5rem;
  color: #333;
  font-size: 1.75rem;
}

.date {
  font-size: 0.8rem;
  color: #666;
  display: block;
}

.progress-section {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 8px;
  width: 250px;
  flex-shrink: 0;
}

.progress-bar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-line {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 7px;
  width: 2px;
  background-color: #e9ecef;
  z-index: 0;
}

.progress-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1;
  font-size: 0.75rem;
}

.progress-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #e9ecef;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e9ecef;
  flex-shrink: 0;
}

.progress-label {
  color: #666;
}

.progress-item.completed .progress-dot {
  background-color: #28a745;
  box-shadow: 0 0 0 1px #28a745;
}

.progress-item.completed .progress-label {
  color: #28a745;
}

.content-body {
  padding: 2rem;
}

.loading,
.error,
.not-found {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .progress-section {
    width: 100%;
  }

  .title-section {
    width: 100%;
  }
}
</style>
