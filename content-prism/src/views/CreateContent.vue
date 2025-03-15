<template>
  <div class="create-content">
    <div class="content-center">
      <div class="logo-container">
        <img src="/favicon.ico" alt="Logo" class="logo" />
        <h1 class="logo-text">Prism of Content</h1>
      </div>

      <div class="input-container">
        <input
          type="text"
          class="content-input"
          placeholder="Enter a research/news article you'd like to turn into content"
          v-model="articleUrl"
          :disabled="loading"
        />
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <div class="options-container">
        <p class="upload-option">
          Or
          <a
            href="#"
            @click.prevent="triggerFileUpload"
            :class="{ disabled: loading }"
            >upload a pdf</a
          >
          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept=".pdf"
            @change="handleFileUpload"
            :disabled="loading"
          />
        </p>
      </div>

      <div class="terms-container">
        <label class="terms-label">
          <input
            type="checkbox"
            v-model="termsAccepted"
            class="terms-checkbox"
            :disabled="loading"
          />
          <span>I have read and agree to the Terms and Conditions</span>
        </label>
      </div>

      <div class="submit-container">
        <button
          class="submit-button"
          :disabled="!canSubmit || loading"
          @click="handleSubmit"
        >
          <div v-if="loading" class="spinner"></div>
          <span v-else>Submit</span>
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="showSuccess" class="success-message">
        Content submitted successfully! Redirecting to dashboard...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";
import { useRouter } from "vue-router";

const router = useRouter();
const { user } = useAuth();
const articleUrl = ref("");
const termsAccepted = ref(false);
const fileInput = ref(null);
const loading = ref(false);
const error = ref(null);
const showSuccess = ref(false);

const canSubmit = computed(() => {
  return (
    (articleUrl.value.trim() || fileInput.value?.files?.length) &&
    termsAccepted.value
  );
});

const triggerFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    articleUrl.value = ""; // Clear URL input if file is selected
  }
};

const getUserProfile = async () => {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("institution_id")
    .eq("id", user.value.id)
    .single();

  if (error) throw error;
  return profile;
};

const createSourceContent = async (url, institutionId) => {
  // Get the ID of the 'New Submission' status
  const { data: statusData, error: statusError } = await supabase
    .from("content_status")
    .select("id")
    .eq("status", "New Submission")
    .single();

  if (statusError) throw statusError;

  const { data, error } = await supabase
    .from("source_content")
    .insert([
      {
        source_content_url: url,
        source_content_type: "article", // Default to article for URL submissions
        user_id: user.value.id,
        institution_id: institutionId,
        source_content_title: "Pending...", // Will be updated by scraper
        source_content_main_text: null, // Will be updated by scraper
        content_status_id: statusData.id, // Set the initial status
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  loading.value = true;
  error.value = null;
  showSuccess.value = false;

  try {
    if (fileInput.value?.files?.length) {
      // Handle PDF upload - to be implemented
      console.log("Uploading PDF:", fileInput.value.files[0]);
    } else {
      // Handle URL submission
      const profile = await getUserProfile();
      const sourceContent = await createSourceContent(
        articleUrl.value.trim(),
        profile.institution_id
      );

      // Get the user's session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No access token available");
      }

      // Call the scraping endpoint
      const response = await fetch(
        `${process.env.VUE_APP_API_BASE_URL}/api/scrape-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceContentId: sourceContent.id,
            url: articleUrl.value.trim(),
            accessToken: session.access_token,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to scrape content");
      }

      // Show success message and redirect
      showSuccess.value = true;
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

      // Clear form
      articleUrl.value = "";
      termsAccepted.value = false;
    }
  } catch (err) {
    console.error("Error submitting content:", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.create-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px); /* Account for header and padding */
}

.content-center {
  width: 100%;
  max-width: 600px;
  text-align: center;
}

.logo-container {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.logo {
  width: 40px;
  height: 40px;
}

.logo-text {
  font-size: 24px;
  font-weight: 400;
  color: #202124;
  margin: 0;
}

.input-container {
  margin-bottom: 1.5rem;
}

.content-input {
  width: 100%;
  padding: 1rem;
  font-size: 16px;
  border: 1px solid #dfe1e5;
  border-radius: 24px;
  outline: none;
  transition: all 0.3s ease;
  text-align: center;
}

.content-input:hover {
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
  border-color: rgba(223, 225, 229, 0);
}

.content-input:focus {
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
  border-color: rgba(223, 225, 229, 0);
}

.options-container {
  margin-bottom: 1.5rem;
}

.upload-option {
  color: #4a4a4a;
  font-size: 14px;
}

.upload-option a {
  color: #1a73e8;
  text-decoration: none;
}

.upload-option a:hover {
  text-decoration: underline;
}

.hidden {
  display: none;
}

.terms-container {
  margin-bottom: 1.5rem;
}

.terms-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #4a4a4a;
  font-size: 14px;
}

.terms-checkbox {
  width: 16px;
  height: 16px;
}

.submit-button {
  background-color: #1a73e8;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #1557b0;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Add loading and error styles */
.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 0.5rem;
}

.content-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-message {
  color: #28a745;
  font-size: 14px;
  margin-top: 1rem;
  text-align: center;
}

.upload-option a.disabled {
  color: #999;
  cursor: not-allowed;
  pointer-events: none;
}

.terms-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.terms-label {
  opacity: 1;
  transition: opacity 0.2s;
}

.terms-label:has(.terms-checkbox:disabled) {
  opacity: 0.6;
}
</style>
