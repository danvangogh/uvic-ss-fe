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
          :placeholder="placeholder"
          v-model="articleUrl"
          :disabled="loading"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
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
        <div v-if="pdfUploadSuccess" class="upload-success-message">
          <svg
            class="checkmark"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 52 52"
          >
            <circle
              class="checkmark__circle"
              cx="26"
              cy="26"
              r="25"
              fill="none"
            />
            <path
              class="checkmark__check"
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
            />
          </svg>
          <span>PDF successfully processed.</span>
        </div>
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
        Content submitted successfully! Redirecting to content detail...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";
import { useRouter } from "vue-router";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// Set the workerSrc for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const router = useRouter();
const { user } = useAuth();
const articleUrl = ref("");
const termsAccepted = ref(false);
const fileInput = ref(null);
const pdfText = ref(""); // To store extracted PDF text
const pdfUploadSuccess = ref(false);
const loading = ref(false);
const error = ref(null);
const showSuccess = ref(false);
const placeholder = ref(
  "Enter a research/news article you'd like to turn into content"
);

const canSubmit = computed(() => {
  return (
    (articleUrl.value.trim() || pdfText.value) &&
    termsAccepted.value
  );
});

watch(articleUrl, (newValue) => {
  if (newValue.trim()) {
    if (fileInput.value) {
      fileInput.value.value = null;
    }
    pdfText.value = "";
    pdfUploadSuccess.value = false;
  }
});

const triggerFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  // Clear URL and previous PDF text
  articleUrl.value = "";
  pdfText.value = "";
  error.value = null;
  loading.value = true;
  pdfUploadSuccess.value = false;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          fullText += pageText + "\\n\\n";
        }

        pdfText.value = fullText.trim();
        pdfUploadSuccess.value = true;
        console.log("PDF parsed successfully. Text length:", pdfText.value.length);
      } catch (err) {
        console.error("Error parsing PDF:", err);
        error.value = "Failed to parse PDF. Please ensure it's a valid file.";
      } finally {
        loading.value = false;
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error("Error reading file:", err);
    error.value = "Failed to read the uploaded file.";
    loading.value = false;
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
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
};

const handleSubmit = async () => {
  console.log("handleSubmit triggered.");
  if (!canSubmit.value) {
    console.log("Submit cancelled: canSubmit is false.", {
      pdfText: !!pdfText.value,
      termsAccepted: termsAccepted.value,
    });
    return;
  }

  loading.value = true;
  error.value = null;
  showSuccess.value = false;

  try {
    console.log("Fetching user profile...");
    const profile = await getUserProfile();
    console.log("User profile fetched successfully:", profile);

    if (pdfText.value) {
      console.log("Proceeding with PDF submission...");
      // Handle PDF submission
      const response = await fetch(
        `${process.env.VUE_APP_API_BASE_URL}/api/content/create-from-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: pdfText.value,
            fileName: fileInput.value.files[0].name,
            userId: user.value.id,
            institutionId: profile.institution_id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create content from PDF");
      }

      // Show success message and redirect
      showSuccess.value = true;
      setTimeout(() => {
        router.push(`/content/${result.data.id}`);
      }, 2000);

      // Clear form
      pdfText.value = "";
      if (fileInput.value) {
        fileInput.value.value = null;
      }
      termsAccepted.value = false;
    } else {
      // Handle URL submission
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

      console.log("Scraping response received.");

      if (!response.ok) {
        throw new Error("Failed to scrape content");
      }

      // Show success message and redirect
      showSuccess.value = true;
      setTimeout(() => {
        router.push(`/content/${sourceContent.id}`);
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

const handleInputFocus = () => {
  placeholder.value = "";
};

const handleInputBlur = () => {
  if (!articleUrl.value) {
    placeholder.value =
      "Enter a research/news article you'd like to turn into content";
  }
};

onMounted(() => {
  if (!user.value) {
    router.push("/auth");
  }
});
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
  font-size: 14px;
  color: #5f6368;
}

.upload-option a {
  color: #1a73e8;
  text-decoration: none;
}

.upload-option a:hover {
  text-decoration: underline;
}

.upload-option a.disabled {
  color: #9aa0a6;
  pointer-events: none;
}

.upload-success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  color: #1e8e3e;
  font-size: 14px;
}

.checkmark {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
  stroke-width: 3;
  stroke: #1e8e3e;
  stroke-miterlimit: 10;
  margin-right: 8px;
  box-shadow: inset 0px 0px 0px #1e8e3e;
  animation: fill 0.4s ease-in-out 0.4s forwards,
    scale 0.3s ease-in-out 0.9s both;
}

.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: #1e8e3e;
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark__check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}

@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes scale {
  0%,
  100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
}

@keyframes fill {
  100% {
    box-shadow: inset 0px 0px 0px 30px #fff;
  }
}

.hidden {
  display: none;
}

.terms-container {
  margin-top: 2rem;
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
