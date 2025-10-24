<template>
  <!-- Add Font Awesome -->
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
  />

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
          <span
            >I have read and agree to the
            <a
              href="#"
              @click.prevent="showTermsModal = true"
              class="terms-link"
              >Terms and Conditions</a
            ></span
          >
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

      <!-- Terms & Conditions Modal -->
      <div
        v-if="showTermsModal"
        class="modal-overlay"
        @click="showTermsModal = false"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Terms and Conditions</h2>
            <button class="modal-close" @click="showTermsModal = false">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="terms-content">
              <h3>Prism of Content – Terms and Conditions</h3>
              <p><strong>Last Updated: July 17, 2025</strong></p>

              <h4>1. Introduction</h4>
              <p>
                Welcome to Prism of Content ("Prism," "we," "us," or "our").
                Prism is a product of Five String Media Inc. ("Five String
                Media"). For the avoidance of doubt, all references in these
                Terms to "Prism" shall be deemed to include Five String Media
                and each of their respective parents, subsidiaries, affiliates,
                directors, officers, employees, owners, and agents
                (collectively, the "Prism Parties"). Prism is an online
                application that ingests medium‑ to long‑form written materials
                (such as academic research, news articles, and blog posts),
                extracts key insights using artificial intelligence, and
                produces shareable visual assets based on predefined templates
                (the "Service").
              </p>
              <p>
                By accessing or using the Service, you ("User," "you," or
                "your") agree to be bound by these Terms and Conditions (the
                "Terms"). If you do not agree to all of the Terms, do not access
                or use the Service.
              </p>

              <h4>2. Acceptance of Terms</h4>
              <p>
                Your use of the Service constitutes acceptance of and agreement
                to these Terms and our Privacy Policy. If you are using the
                Service on behalf of an organization, you represent that you
                have authority to bind that organization and its affiliates to
                these Terms.
              </p>

              <h4>3. Description of Service</h4>
              <p>Prism provides:</p>
              <ul>
                <li>
                  <strong>Web Scraping & Text Ingestion</strong> – automated
                  tools that retrieve written content from third‑party websites
                  and store that content in a temporary database.
                </li>
                <li>
                  <strong>AI Processing</strong> – algorithms that analyze the
                  ingested text to produce summaries, key points, and other
                  derivative outputs.
                </li>
                <li>
                  <strong>Image Generation</strong> – creation of visual assets
                  using templates populated with AI‑derived text, suitable for
                  distribution on social platforms.
                </li>
              </ul>

              <h4>4. Eligibility</h4>
              <p>
                You must be at least 18 years old and legally capable of
                entering into binding contracts to use the Service.
              </p>

              <h4>5. User Responsibilities</h4>
              <h5>5.1 Obtaining Permission</h5>
              <p>
                You are solely responsible for ensuring that you possess all
                necessary rights, licenses, permissions, and consents to ingest,
                store, process, and distribute any third‑party content through
                the Service.
              </p>

              <h5>5.2 Compliance With Laws</h5>
              <p>
                You agree to comply with all applicable copyright,
                data‑protection, privacy, and export‑control laws.
              </p>

              <h5>5.3 Accuracy of Information</h5>
              <p>
                You warrant that all information you provide to Prism is
                truthful, complete, and current.
              </p>

              <h4>6. Intellectual Property</h4>
              <h5>6.1 Prism IP</h5>
              <p>
                All software, algorithms, templates, documentation, and other
                materials provided by Prism are owned by or licensed to Prism
                and are protected by intellectual‑property laws. Except as
                expressly stated in these Terms, no rights are granted to you.
              </p>

              <h5>6.2 User Content</h5>
              <p>
                You retain all rights in the original content you lawfully
                provide ("User Content"). By uploading or submitting User
                Content, you grant Prism a non‑exclusive, worldwide,
                royalty‑free license to store, process, and display such content
                solely for the purpose of providing the Service.
              </p>

              <h5>6.3 AI‑Generated Output</h5>
              <p>
                Prism assigns to you any rights it may hold in summaries, key
                points, or images generated specifically for you, subject to any
                third‑party rights contained in the underlying User Content. You
                acknowledge that similar or identical outputs may be generated
                for other users.
              </p>

              <h4>7. Prohibited Conduct</h4>
              <p>You agree not to:</p>
              <ul>
                <li>
                  Ingest content that you do not have legal permission to use;
                </li>
                <li>
                  Violate or attempt to circumvent the intellectual‑property
                  rights of others;
                </li>
                <li>
                  Use the Service to create or distribute defamatory, unlawful,
                  or harmful material;
                </li>
                <li>Interfere with or disrupt the Service or servers;</li>
                <li>
                  Reverse‑engineer, decompile, or disassemble any part of the
                  Service.
                </li>
              </ul>

              <h4>8. Copyright Compliance and Disclaimer</h4>
              <p>
                Prism does not monitor the legality, accuracy, or ownership of
                any content ingested through the Service. You assume full
                responsibility for verifying that the use of User Content
                (including any scraping, storage, transformation, and
                redistribution) is lawful. Prism disclaims all liability for
                copyright infringement or other violations arising from your use
                of the Service.
              </p>

              <h4>9. Privacy & Data Security</h4>
              <p>
                We process personal data in accordance with our Privacy Policy.
                Although we implement commercially reasonable safeguards, you
                acknowledge that no system can be 100 percent secure.
              </p>

              <h4>10. Fees & Payment</h4>
              <p>
                If the Service is offered on a paid basis, you agree to pay all
                applicable fees in accordance with the pricing and billing terms
                posted on our website or otherwise provided to you.
              </p>

              <h4>11. Disclaimer of Warranties</h4>
              <p>
                <strong
                  >THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." PRISM
                  MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES
                  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                  NON‑INFRINGEMENT.</strong
                >
                We do not guarantee that the Service will be uninterrupted,
                error‑free, or secure, nor that outputs will be accurate or fit
                for any purpose.
              </p>

              <h4>12. Limitation of Liability</h4>
              <p>
                <strong
                  >TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL
                  PRISM OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT,
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
                  FOR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR
                  RELATED TO THE SERVICE OR THESE TERMS, EVEN IF ADVISED OF THE
                  POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT
                  EXCEED THE GREATER OF (i) THE AMOUNT YOU PAID TO USE THE
                  SERVICE IN THE 12 MONTHS PRIOR TO THE EVENT GIVING RISE TO
                  LIABILITY OR (ii) CAD $100.</strong
                >
              </p>

              <h4>13. Indemnification</h4>
              <p>
                You agree to defend, indemnify, and hold harmless Prism, its
                directors, officers, employees, and agents from and against any
                claims, damages, liabilities, costs, and expenses (including
                reasonable attorneys' fees) arising from:
              </p>
              <ul>
                <li>Your breach of these Terms;</li>
                <li>
                  Your violation of any law or the rights of a third party; or
                </li>
                <li>
                  Any content you ingest, process, or distribute using the
                  Service.
                </li>
              </ul>

              <h4>14. Termination</h4>
              <p>
                We may suspend or terminate your access to the Service at any
                time, with or without notice, for any reason, including your
                violation of these Terms. Upon termination, your right to use
                the Service will immediately cease, and Sections 6–15 will
                survive.
              </p>

              <h4>15. Modifications</h4>
              <p>
                We may update these Terms at any time by posting the revised
                version on our website or within the application. Continued use
                of the Service after changes become effective constitutes
                acceptance of the updated Terms.
              </p>

              <h4>16. Governing Law & Jurisdiction</h4>
              <p>
                These Terms are governed by and construed in accordance with the
                laws of the Province of British Columbia and the applicable laws
                of Canada, without regard to conflict‑of‑law principles. You
                consent to the exclusive jurisdiction of the courts located in
                Victoria, BC.
              </p>

              <h4>17. Dispute Resolution</h4>
              <p>
                Before initiating any formal dispute, you agree to first contact
                us to seek an informal resolution. If we are unable to resolve
                the dispute within 30 days, either party may pursue relief in a
                court of competent jurisdiction.
              </p>

              <h4>18. Miscellaneous</h4>
              <p>
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions shall remain in full force. Our failure
                to enforce any right shall not be deemed a waiver of future
                enforcement. You may not assign these Terms without our prior
                written consent.
              </p>

              <h4>19. Contact</h4>
              <p>
                If you have questions about these Terms or the Service, please
                contact us.
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-button" @click="showTermsModal = false">
              Close
            </button>
          </div>
        </div>
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
const showTermsModal = ref(false);

const canSubmit = computed(() => {
  return (articleUrl.value.trim() || pdfText.value) && termsAccepted.value;
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
          // Extract text and clean it properly
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ")
            // Remove control characters but preserve spaces and newlines
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
            // Normalize whitespace - replace multiple spaces with single space
            .replace(/\s+/g, " ")
            .trim();
          
          if (pageText) {
            fullText += pageText + "\n\n";
          }
        }

        // Additional text cleaning to handle excessive newlines and duplicates
        let cleanedText = fullText
          .trim()
          // Replace multiple consecutive newlines with double newlines
          .replace(/\n{3,}/g, "\n\n")
          // Remove duplicate sentences/phrases (common in PDFs with headers/footers)
          .replace(/(.{50,}?)\1+/g, "$1")
          // Clean up any remaining excessive whitespace
          .replace(/\s{3,}/g, " ")
          // Final trim
          .trim();

        pdfText.value = cleanedText;
        pdfUploadSuccess.value = true;
        console.log(
          "PDF parsed successfully. Text length:",
          pdfText.value.length
        );
        console.log("First 200 characters:", pdfText.value.substring(0, 200));
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

.terms-link {
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
}

.terms-link:hover {
  text-decoration: underline;
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  padding: 5px;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
  font-size: 15px;
  line-height: 1.6;
  color: #555;
}

.terms-content {
  text-align: left;
}

.terms-content h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 18px;
  text-align: left;
}

.terms-content h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 16px;
  text-align: left;
}

.terms-content h5 {
  margin-top: 15px;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 14px;
  text-align: left;
}

.terms-content p {
  margin-bottom: 15px;
  text-align: left;
}

.terms-content ul {
  padding-left: 20px;
  margin-bottom: 15px;
  text-align: left;
}

.terms-content li {
  margin-bottom: 5px;
  text-align: left;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-button {
  background-color: #1a73e8;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-button:hover {
  background-color: #1557b0;
}

.modal-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  color: #888;
}
</style>
