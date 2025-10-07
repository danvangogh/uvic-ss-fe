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
          <th>Created Date</th>
          <th class="actions-header">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="content in sourceContent"
          :key="content.id"
          class="content-row"
          @click="$router.push(`/content/${content.id}`)"
        >
          <td>{{ content.source_content_title }}</td>
          <td>
            {{
              content.template
                ? content.template.template_name
                : "No template selected"
            }}
          </td>
          <td>{{ formatDate(content.created_at) }}</td>
          <td class="actions-cell">
            <button
              @click.stop="duplicateContent(content)"
              class="icon-button"
              title="Duplicate"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                ></path>
              </svg>
            </button>
            <button
              @click.stop="deleteContent(content.id)"
              class="icon-button trash-button"
              title="Delete"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="no-content">
      No content found. Start by submitting an article or PDF.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";

const { user } = useAuth();
const sourceContent = ref([]);
const loading = ref(true);
const error = ref(null);
let subscription = null;
let isSubscribed = false;

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

const duplicateContent = async (contentToDuplicate) => {
  try {
    const response = await fetch(`${process.env.VUE_APP_API_BASE_URL || ''}/api/content/duplicate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: contentToDuplicate.id,
        userId: user.value.id,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to duplicate content.');
    }
    // Add the new content to the top of the list for immediate UI update
    sourceContent.value.unshift(result.data);
  } catch (err) {
    console.error('Error duplicating content:', err);
    error.value = 'Failed to duplicate content.';
  }
};

const deleteContent = async (contentId) => {
  if (window.confirm("Are you sure you want to delete this content?")) {
    try {
      const { error: deleteError } = await supabase
        .from("source_content")
        .delete()
        .eq("id", contentId);

      if (deleteError) throw deleteError;

      // Remove the content from the list for immediate UI update
      sourceContent.value = sourceContent.value.filter(
        (content) => content.id !== contentId
      );
    } catch (err) {
      console.error("Error deleting content:", err);
      error.value = "Failed to delete content.";
    }
  }
};

const setupRealtimeSubscription = () => {
  if (!user.value || isSubscribed) return;

  console.log("Setting up real-time subscription for user:", user.value.id);

  // Clean up any existing subscription
  if (subscription) {
    console.log("Cleaning up existing subscription");
    subscription.unsubscribe();
    subscription = null;
  }

  // Create a single subscription with all the needed listeners
  subscription = supabase
    .channel("dashboard_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "source_content",
        filter: `user_id=eq.${user.value.id}`,
      },
      (payload) => {
        console.log("Source content change received:", payload);
        fetchContent();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "content_templates",
      },
      (payload) => {
        console.log("Content template change received:", payload);
        fetchContent();
      }
    )
    .subscribe((status, err) => {
      console.log("Real-time subscription status:", status);
      if (err) {
        console.error("Error setting up real-time subscription:", err);
        error.value = "Failed to setup live updates. Please refresh the page.";
        isSubscribed = false;
      } else {
        isSubscribed = true;
      }
    });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Watch for user changes and setup subscription when user becomes available
watch(user, (newUser) => {
  if (newUser) {
    fetchContent();
    setupRealtimeSubscription();
  } else {
    sourceContent.value = [];
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
      isSubscribed = false;
    }
  }
});

onMounted(() => {
  // Only fetch and subscribe if user is already available
  if (user.value) {
    fetchContent();
    setupRealtimeSubscription();
  }
});

onUnmounted(() => {
  // Clean up subscription when component is unmounted
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
    isSubscribed = false;
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

.actions-header {
  text-align: center;
}

.actions-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  color: #6c757d;
}

.icon-button:hover {
  background-color: #e9ecef;
}

.trash-button:hover {
  color: #dc3545;
  background-color: #f8d7da;
}

.content-table tr:last-child td {
  border-bottom: none;
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

.content-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.content-row:hover {
  background-color: #f0f0f0 !important;
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
