<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div v-if="loading" class="loading">Loading content...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <table v-else-if="sourceContent.length" class="content-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Content Type</th>
          <th>Status</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="content in sourceContent" :key="content.id">
          <td>{{ content.source_content_title }}</td>
          <td>
            {{ content.template ? content.template.template_name : "Pending" }}
          </td>
          <td>{{ content.content_status.status }}</td>
          <td>{{ formatDate(content.created_at) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="no-content">
      No content found. Start by submitting an article or PDF.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";

const { user } = useAuth();
const sourceContent = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchContent = async () => {
  // Reset error state
  error.value = null;

  // Check if user is available
  if (!user.value) {
    loading.value = false;
    return;
  }

  try {
    const { data, error: fetchError } = await supabase
      .from("source_content")
      .select(
        `
        *,
        content_status:content_status_id (
          status
        ),
        template:template_id (
          template_name
        )
      `
      )
      .eq("user_id", user.value.id)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    sourceContent.value = data;
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

// Watch for user changes and fetch content when user becomes available
watch(user, (newUser) => {
  if (newUser) {
    fetchContent();
  } else {
    sourceContent.value = [];
  }
});

onMounted(() => {
  // Only fetch if user is already available
  if (user.value) {
    fetchContent();
  }
});
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}

.content-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.content-table th,
.content-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.content-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.content-table tr:last-child td {
  border-bottom: none;
}

.content-table tr:hover {
  background-color: #f8f9fa;
}

.loading,
.error,
.no-content {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }

  .content-table th,
  .content-table td {
    padding: 0.75rem;
  }
}
</style>
