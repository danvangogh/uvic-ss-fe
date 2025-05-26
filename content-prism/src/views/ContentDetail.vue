<template>
  <div class="content-detail">
    <!-- Add Font Awesome -->
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    />

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

            <!-- Add image previews -->
            <div v-if="generatedImages.length" class="image-previews-section">
              <div class="image-previews-header">
                <h3>Generated Images</h3>
              </div>
              <div class="image-previews">
                <img
                  v-for="(url, index) in generatedImages"
                  :key="index"
                  :src="url"
                  :alt="`Generated image ${index + 1}`"
                  class="preview-thumbnail"
                  @click="openLightbox(url)"
                />
              </div>
              <button
                class="download-post-button"
                @click="downloadAllContent"
                :disabled="isDownloading"
              >
                <i v-if="isDownloading" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-download"></i>
                {{ isDownloading ? "Preparing Download..." : "Download Post" }}
              </button>
            </div>
          </div>
          <!-- <div class="progress-section">
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
          </div> -->
        </div>
      </header>

      <!-- Add lightbox -->
      <div v-if="lightboxOpen" class="lightbox" @click="closeLightbox">
        <button
          v-if="generatedImages.length > 1"
          class="lightbox-nav prev"
          @click.stop="navigateImage('prev')"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <img
          :src="lightboxImage"
          alt="Full size preview"
          class="lightbox-image"
          @click.stop
        />
        <button
          v-if="generatedImages.length > 1"
          class="lightbox-nav next"
          @click.stop="navigateImage('next')"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <div class="content-body">
        <!-- Wrap the first two sections -->
        <div class="top-sections-wrapper">
          <!-- Source Text Section -->
          <section class="content-section">
            <div class="section-header">
              <h2>Source Text</h2>
              <button class="edit-button" @click="showEditModal = true">
                Edit Text
              </button>
            </div>
            <div class="source-text-container">
              <div class="source-text-summary">
                <p v-if="content.source_content_main_text">
                  The source text for this begins with "{{
                    getFirstNWords(content.source_content_main_text, 12)
                  }}" and ends with "{{
                    getLastNWords(content.source_content_main_text, 12)
                  }}" and is
                  {{ getWordCount(content.source_content_main_text) }} words
                  long.
                </p>
                <p v-else style="color: #dc3545">
                  I'm having trouble accessing the source content. Please click
                  Edit Text, and paste in the source text.
                </p>
              </div>
            </div>
          </section>

          <!-- Images Section -->
          <section class="content-section">
            <div class="section-header">
              <h2>Images</h2>
              <div class="image-upload">
                <input
                  type="file"
                  ref="imageInput"
                  @change="handleImageUpload"
                  accept="image/*"
                  class="hidden"
                />
                <button class="upload-button" @click="triggerImageUpload">
                  Upload New Image
                </button>
                <span v-if="uploadSuccess" class="upload-success">
                  <i class="fas fa-check"></i> Image uploaded successfully
                </span>
              </div>
            </div>
            <div class="images-container">
              <div class="images-grid" v-if="images.length">
                <draggable
                  v-model="images"
                  :animation="200"
                  item-key="id"
                  class="images-grid"
                  handle=".drag-handle"
                  @end="updateSequences(images)"
                >
                  <template #item="{ element: image }">
                    <div class="image-item">
                      <div class="drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                      </div>
                      <img :src="image.image_url" :alt="image.image_title" />
                      <div class="image-info">
                        <div class="image-text">
                          <span class="upload-status"
                            >Image uploaded successfully</span
                          >
                          <span class="image-title">{{
                            image.image_title
                          }}</span>
                        </div>
                        <button
                          class="delete-button"
                          @click="deleteImage(image.id)"
                          title="Delete image"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>
              <p v-else class="no-images">No images uploaded yet</p>
            </div>
          </section>
        </div>

        <!-- Edit Text Modal -->
        <div
          v-if="showEditModal"
          class="modal-overlay"
          @click="showEditModal = false"
        >
          <div class="modal-content" @click.stop>
            <h2>Edit Source Text</h2>
            <p class="modal-instruction">
              Please verify we have captured all the text of the article. If
              not, please paste it in here and click save.
            </p>
            <div class="modal-field">
              <label for="title">Article Title</label>
              <input
                id="title"
                v-model="content.source_content_title"
                class="modal-title-input"
                placeholder="Enter the article title..."
                @input="handleSourceTextChange"
              />
            </div>
            <div class="modal-field">
              <label for="mainText">Article Text</label>
              <textarea
                id="mainText"
                v-model="content.source_content_main_text"
                class="modal-text-editor"
                placeholder="Enter or edit the source text here..."
                @input="handleSourceTextChange"
              ></textarea>
            </div>
            <div class="modal-actions">
              <button class="cancel-button" @click="cancelEdit">Cancel</button>
              <button
                class="save-button"
                @click="
                  saveSourceText();
                  showEditModal = false;
                "
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <!-- Template Selection Section -->
        <section class="content-section">
          <h2>Template Selection</h2>
          <div class="templates-container">
            <div class="templates-grid" v-if="templates.length">
              <div
                v-for="template in templates"
                :key="template.id"
                class="template-item"
                :class="{
                  selected: content.template_id === template.id,
                  disabled: template.requires_image && !images.length,
                }"
                @click="handleTemplateClick(template)"
              >
                <img
                  v-if="template.template_thumbnail_url"
                  :src="template.template_thumbnail_url"
                  :alt="template.template_name"
                  class="template-thumbnail"
                />
                <div class="template-info">
                  <h3>{{ template.template_name }}</h3>
                </div>
              </div>
            </div>
            <p v-else class="no-templates">No templates available</p>
          </div>
        </section>

        <!-- Post Text Section -->
        <section class="content-section">
          <div class="section-header">
            <h2>Post Text</h2>
            <button
              class="generate-button"
              @click="generatePostText"
              :disabled="isGeneratingText || !content?.template_id"
            >
              <template v-if="isGeneratingText">
                <i class="fas fa-spinner fa-spin"></i>
                Generating...
              </template>
              <template v-else> Generate Text </template>
            </button>
          </div>
          <div v-if="isGeneratingText" class="generating-text">
            <div class="loading-spinner"></div>
            <p>Generating post text using AI...</p>
          </div>
          <div class="post-text-container" v-else>
            <div class="post-text-grid">
              <div
                v-for="field in visiblePostTextFields"
                :key="field"
                class="post-text-item"
              >
                <textarea
                  :id="field"
                  v-model="post_text[field]"
                  class="text-preview"
                  :placeholder="'Enter text for ' + field"
                  @input="savePostText"
                ></textarea>
              </div>
            </div>
          </div>
          <p v-if="!content?.template_id" class="no-post-text">
            Please select a template first to generate post text.
          </p>
        </section>

        <!-- Image Generation Section -->
        <section class="content-section">
          <div class="section-header">
            <h2>Image Generation</h2>
            <button
              class="generate-button"
              @click="generateImagery"
              :disabled="!canGenerateImagery"
            >
              <template v-if="isGeneratingImagery">
                <i class="fas fa-spinner fa-spin"></i>
                Generating...
              </template>
              <template v-else> Generate Imagery </template>
            </button>
          </div>
          <div v-if="isGeneratingImagery" class="generating-text">
            <div class="loading-spinner"></div>
            <p>Generating imagery (this could take a minute...)</p>
          </div>
          <p v-if="!content?.template_id" class="no-imagery">
            Please select a template first to generate imagery.
          </p>
          <p v-else-if="!content?.is_post_text_generated" class="no-imagery">
            Please generate post text before generating imagery.
          </p>
        </section>
      </div>
    </div>

    <div v-else class="not-found">Content not found</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";
import draggable from "vuedraggable";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const { user } = useAuth();
const route = useRoute();
const content = ref(null);
const loading = ref(true);
const error = ref(null);
const images = ref([]);
const templates = ref([]);
const isSourceTextChanged = ref(false);
const originalSourceText = ref("");
const showEditModal = ref(false);
const uploadSuccess = ref(false);
const post_text = ref(null);
const isGeneratingText = ref(false);
const isGeneratingImagery = ref(false);
const generatedImages = ref([]);
const lightboxOpen = ref(false);
const lightboxImage = ref("");
const currentImageIndex = ref(0);
const channel = ref(null);
const isDownloading = ref(false);

// Add computed property for active template schema
const activeTemplateSchema = computed(() => {
  if (!content.value?.template_id || !templates.value?.length) return null;
  const template = templates.value.find(
    (t) => t.id === content.value.template_id
  );
  if (!template?.template_content_schema) return null;
  try {
    // Normalize the schema string by replacing curly quotes with straight quotes
    const normalizedSchema =
      typeof template.template_content_schema === "string"
        ? template.template_content_schema
            .replace(/[""]/g, '"') // Replace curly double quotes
            .replace(/['']/g, "'") // Replace curly single quotes
        : template.template_content_schema;

    const parsedSchema =
      typeof normalizedSchema === "string"
        ? JSON.parse(normalizedSchema)
        : normalizedSchema;

    // Ensure we return an object with the expected structure
    return parsedSchema || {};
  } catch (err) {
    console.error("Error parsing template schema:", err);
    return {};
  }
});

// Add computed property for visible post text fields
const visiblePostTextFields = computed(() => {
  // Default fields if no schema is available
  const defaultFields = ["p1a", "p1b", "p2a", "p2b", "p3a", "p3b"];

  if (!activeTemplateSchema.value) return defaultFields;

  // Get fields from schema or use defaults
  const schemaFields = Object.keys(activeTemplateSchema.value);
  return schemaFields.length > 0 ? schemaFields : defaultFields;
});

// Add computed property to check if imagery can be generated
const canGenerateImagery = computed(() => {
  // Check if we have a template and we're not currently generating
  if (!content.value?.template_id || isGeneratingImagery.value) {
    return false;
  }

  // Check if there's any text content in the post_text fields
  const hasText =
    post_text.value &&
    Object.values(post_text.value).some(
      (text) => typeof text === "string" && text.trim().length > 0
    );

  return hasText;
});

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
  try {
    loading.value = true;
    error.value = null;

    const { data, error: contentError } = await supabase
      .from("source_content")
      .select(
        `
        *,
        template:template_id (
          template_name,
          template_content_schema
        )
      `
      )
      .eq("id", route.params.id)
      .single();

    if (contentError) throw contentError;
    content.value = data;
    originalSourceText.value = data.source_content_main_text;

    // Fetch post text data
    const { data: postTextData, error: postTextError } = await supabase
      .from("post_text")
      .select("*")
      .eq("source_content_id", route.params.id)
      .single();

    if (!postTextError) {
      post_text.value = {
        p1a: "",
        p1b: "",
        p2a: "",
        p2b: "",
        p3a: "",
        p3b: "",
        p4a: "",
        p4b: "",
        p5a: "",
        p5b: "",
        p6a: "",
        p6b: "",
        ...postTextData,
      };
    } else {
      // Initialize with empty values if no post text exists
      post_text.value = {
        p1a: "",
        p1b: "",
        p2a: "",
        p2b: "",
        p3a: "",
        p3b: "",
        p4a: "",
        p4b: "",
        p5a: "",
        p5b: "",
        p6a: "",
        p6b: "",
      };
    }

    // Fetch generated images after content is loaded
    await fetchGeneratedImages();

    // Fetch templates
    const { data: templatesData, error: templatesError } = await supabase
      .from("content_templates")
      .select("*");

    if (templatesError) throw templatesError;
    templates.value = templatesData;

    // Fetch images
    const { data: imagesData, error: imagesError } = await supabase
      .from("images")
      .select("*")
      .eq("source_content_id", route.params.id)
      .order("sequence");

    if (imagesError) throw imagesError;
    images.value = imagesData;
  } catch (err) {
    console.error("Error fetching content:", err);
    error.value = "Failed to load content. Please try again later.";
  } finally {
    loading.value = false;
  }
};

const fetchGeneratedImages = async () => {
  console.log("Starting fetchGeneratedImages");
  try {
    const { data, error } = await supabase
      .from("created_content")
      .select("url_object")
      .eq("source_content_id", content.value.id)
      .single();

    if (error) {
      console.error("Error fetching generated images:", error);
      throw error;
    }

    console.log("Fetched created_content data:", data);

    if (data?.url_object) {
      // Extract PNG URLs and update the state
      const pngUrls = Object.entries(data.url_object)
        .filter(
          ([, url]) =>
            url && typeof url === "string" && url.toLowerCase().endsWith(".png")
        )
        .map(([, url]) => url);

      console.log("Current generatedImages:", generatedImages.value);
      console.log("New PNG URLs:", pngUrls);

      // Always update the images to ensure we have the latest
      generatedImages.value = pngUrls;
      console.log("Updated generatedImages:", generatedImages.value);
    } else {
      console.log("No url_object found in data");
      generatedImages.value = [];
    }
  } catch (err) {
    console.error("Error in fetchGeneratedImages:", err);
  }
};

const handleSourceTextChange = () => {
  isSourceTextChanged.value =
    content.value.source_content_main_text !== originalSourceText.value;
};

const saveSourceText = async () => {
  try {
    const { error: updateError } = await supabase
      .from("source_content")
      .update({
        source_content_main_text: content.value.source_content_main_text,
        source_content_title: content.value.source_content_title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (updateError) throw updateError;
    originalSourceText.value = content.value.source_content_main_text;
    isSourceTextChanged.value = false;
  } catch (err) {
    console.error("Error saving source text:", err);
    error.value = "Failed to save changes. Please try again.";
  }
};

const triggerImageUpload = () => {
  const imageInput = document.querySelector('input[type="file"]');
  imageInput.click();
};

const handleImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const sanitizedFileName = sanitizeFileName(file);

  try {
    // Get the next sequence number
    const nextSequence =
      images.value.length > 0
        ? Math.max(...images.value.map((img) => img.sequence)) + 1
        : 1;

    // Create form data
    const formData = new FormData();
    formData.append("image", file);

    // Upload to DigitalOcean Spaces via our API
    const response = await fetch(
      `${process.env.VUE_APP_API_BASE_URL}/api/upload-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) throw new Error("Failed to upload image");

    const { url } = await response.json();

    // Save image record to Supabase
    const { error: insertError } = await supabase.from("images").insert([
      {
        image_title: sanitizedFileName,
        image_url: url,
        source_content_id: content.value.id,
        user_id: user.value.id,
        institution_id: content.value.institution_id,
        sequence: nextSequence,
      },
    ]);

    if (insertError) throw insertError;

    // Show success message
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);

    // Refresh content which includes images
    await fetchContent();
  } catch (err) {
    console.error("Error uploading image:", err);
    error.value = "Failed to upload image. Please try again.";
  }
};

// Function to sanitize file names
const sanitizeFileName = (file) => {
  if (!file || !file.name) return "";

  // Get the file extension
  const ext = file.name.split(".").pop();
  // Get the name without extension
  const name = file.name.slice(0, -(ext.length + 1));

  // Remove special characters and spaces, convert to lowercase
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // Replace special chars with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Add timestamp to ensure uniqueness
  const timestamp = new Date().getTime();

  // Return sanitized name with timestamp and original extension
  return `${sanitized}-${timestamp}.${ext}`;
};

const deleteImage = async (imageId) => {
  try {
    const { error: deleteError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId);

    if (deleteError) throw deleteError;
    await fetchContent();
  } catch (err) {
    console.error("Error deleting image:", err);
    error.value = "Failed to delete image. Please try again.";
  }
};

const selectTemplate = async (templateId) => {
  try {
    const { error: updateError } = await supabase
      .from("source_content")
      .update({
        template_id: templateId,
        is_template_selected: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (updateError) throw updateError;

    // Update local state directly instead of refreshing
    content.value = {
      ...content.value,
      template_id: templateId,
      is_template_selected: true,
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Error selecting template:", err);
    error.value = "Failed to select template. Please try again.";
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

// Add these new utility functions
const getFirstNWords = (text, n) => {
  if (!text) return "";
  return text.split(/\s+/).slice(0, n).join(" ");
};

const getLastNWords = (text, n) => {
  if (!text) return "";
  const words = text.split(/\s+/);
  return words.slice(Math.max(words.length - n, 0)).join(" ");
};

const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
};

const cancelEdit = () => {
  content.value.source_content_main_text = originalSourceText.value;
  isSourceTextChanged.value = false;
  showEditModal.value = false;
};

const handleTemplateClick = (template) => {
  if (template.requires_image && !images.value.length) {
    return; // Do nothing if template requires images and no images are uploaded
  }
  selectTemplate(template.id);
};

const updateSequences = async (reorderedImages) => {
  try {
    // Update local state immediately
    images.value = reorderedImages.map((img, index) => ({
      ...img,
      sequence: index + 1,
    }));

    // Prepare updates for each image, including all required fields
    const updates = images.value.map((img, index) => ({
      id: img.id,
      source_content_id: content.value.id,
      sequence: index + 1,
      image_title: img.image_title,
      image_url: img.image_url,
      user_id: img.user_id,
      institution_id: img.institution_id,
    }));

    // Update sequences in database one at a time to avoid conflicts
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("images")
        .update({ sequence: update.sequence })
        .eq("id", update.id)
        .eq("source_content_id", update.source_content_id);

      if (updateError) throw updateError;
    }

    // Refresh content which includes images
    await fetchContent();
  } catch (err) {
    console.error("Error updating sequences:", err);
    error.value = "Failed to update image order. Please try again.";
  }
};

const savePostText = async () => {
  try {
    const postTextData = {
      source_content_id: route.params.id,
      user_id: user.value.id,
      institution_id: content.value.institution_id,
      ...post_text.value,
    };

    const { error: upsertError } = await supabase
      .from("post_text")
      .upsert(postTextData)
      .eq("source_content_id", route.params.id);

    if (upsertError) throw upsertError;
  } catch (err) {
    console.error("Error saving post text:", err);
    error.value = "Failed to save post text. Please try again.";
  }
};

const generatePostText = async () => {
  try {
    if (!content.value?.template_id) {
      error.value = "Please select a template first";
      return;
    }

    isGeneratingText.value = true;
    error.value = null; // Clear any previous errors

    // Update status to generating
    const { error: statusError } = await supabase
      .from("source_content")
      .update({
        is_generating_post_text: true,
        is_post_text_generated: false, // Reset this flag when starting generation
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (statusError) throw statusError;

    // Call the backend endpoint
    const response = await fetch(
      `${process.env.VUE_APP_API_BASE_URL}/api/generate-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId: content.value.id,
          templateId: content.value.template_id,
          institutionId: content.value.institution_id,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("Raw API response:", responseData);

    if (!responseData.success || !responseData.text) {
      throw new Error(responseData.error || "Failed to generate text");
    }

    // Log the text before attempting to parse
    console.log("Text to parse:", responseData.text);

    // Parse the response text as JSON
    let generatedContent;
    try {
      generatedContent =
        typeof responseData.text === "string"
          ? JSON.parse(responseData.text)
          : responseData.text;

      console.log("Generated content parsed:", generatedContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Failed to parse text:", responseData.text);
      throw new Error(
        `Invalid JSON format: ${
          parseError.message
        }. Raw text: ${responseData.text.substring(0, 100)}...`
      );
    }

    // Validate the generated content matches our schema
    if (!generatedContent || typeof generatedContent !== "object") {
      console.error("Invalid content structure:", generatedContent);
      throw new Error(
        `Generated content is not a valid object: ${JSON.stringify(
          generatedContent
        )}`
      );
    }

    // Check for required fields based on template schema
    if (activeTemplateSchema.value) {
      const requiredFields = Object.keys(activeTemplateSchema.value);
      const missingFields = requiredFields.filter(
        (field) => !(field.toLowerCase() in generatedContent)
      );

      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields);
        throw new Error(
          `Generated content is missing required fields: ${missingFields.join(
            ", "
          )}`
        );
      }
    }

    // Initialize with empty strings and merge with generated content
    const postTextData = {
      source_content_id: content.value.id,
      user_id: user.value.id,
      institution_id: content.value.institution_id,
      p1a: "",
      p1b: "",
      p2a: "",
      p2b: "",
      p3a: "",
      p3b: "",
      p4a: "",
      p4b: "",
      p5a: "",
      p5b: "",
      p6a: "",
      p6b: "",
      ...generatedContent,
    };

    // Update local state immediately for better UX
    post_text.value = { ...postTextData };
    console.log("Updated post_text.value:", post_text.value);

    // Use upsert to update existing row or create new one if it doesn't exist
    const { error: upsertError } = await supabase
      .from("post_text")
      .upsert(postTextData, {
        onConflict: "source_content_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Error upserting post text:", upsertError);
      throw new Error("Failed to save generated text to database");
    }

    // Update only is_post_text_generated to true, keep is_generating_post_text as true
    const { error: finalStatusError } = await supabase
      .from("source_content")
      .update({
        is_post_text_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (finalStatusError) throw finalStatusError;

    // Update local state
    content.value = {
      ...content.value,
      is_post_text_generated: true,
    };
  } catch (err) {
    console.error("Error generating post text:", err);
    error.value =
      err.message || "Failed to generate post text. Please try again.";

    // On error, reset both flags
    try {
      const { error: resetError } = await supabase
        .from("source_content")
        .update({
          is_generating_post_text: false,
          is_post_text_generated: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", content.value.id);

      if (resetError) {
        console.error("Error resetting status:", resetError);
      }

      // Update local state on error
      content.value = {
        ...content.value,
        is_generating_post_text: false,
        is_post_text_generated: false,
      };
    } catch (resetErr) {
      console.error("Error during status reset:", resetErr);
    }
  } finally {
    // Only update the local UI state for isGeneratingText
    isGeneratingText.value = false;
  }
};

// Add generateImagery function
const generateImagery = async () => {
  if (!canGenerateImagery.value) {
    console.log("Cannot generate imagery:", {
      hasTemplateId: !!content.value?.template_id,
      isPostTextGenerated: content.value?.is_post_text_generated,
      isGeneratingImagery: isGeneratingImagery.value,
    });
    return;
  }

  try {
    console.log("Starting imagery generation");
    isGeneratingImagery.value = true;
    error.value = null;

    // Update status to generating imagery
    const { error: statusError } = await supabase
      .from("source_content")
      .update({
        is_generating_imagery: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (statusError) throw statusError;
    console.log("Updated is_generating_imagery status to true");

    // Make API call to backend to generate imagery
    console.log("Calling generate-imagery API endpoint");
    const response = await fetch(
      `${process.env.VUE_APP_API_BASE_URL}/api/generate-imagery/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId: content.value.id,
          templateId: content.value.template_id,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Generate imagery API response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to generate imagery");
    }

    // Check if we need to wait for the subscription to catch up
    console.log("Waiting briefly for created_content update...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Force a refresh if the subscription hasn't caught it
    console.log("Forcing page refresh");
    window.location.reload();

    return data;
  } catch (err) {
    console.error("Error in generateImagery:", err);
    error.value =
      err.message || "Failed to generate imagery. Please try again.";

    // Reset the generating state on error
    try {
      console.log("Resetting is_generating_imagery status due to error");
      const { error: resetError } = await supabase
        .from("source_content")
        .update({
          is_generating_imagery: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", content.value.id);

      if (resetError) {
        console.error("Error resetting status:", resetError);
      }
    } catch (resetErr) {
      console.error("Error during status reset:", resetErr);
    }
  } finally {
    console.log("Imagery generation process completed");
    isGeneratingImagery.value = false;
  }
};

// Add this new function
const setupSubscriptions = () => {
  console.log("Setting up subscriptions for content ID:", route.params.id);

  // Clean up existing subscription if any
  if (channel.value) {
    channel.value.unsubscribe();
    channel.value = null;
  }

  // Create a new channel
  channel.value = supabase
    .channel("content_detail_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "created_content",
        filter: `source_content_id=eq.${route.params.id}`,
      },
      () => {
        console.log("Created content updated - refreshing page");
        window.location.reload();
      }
    )
    .subscribe((status) => {
      console.log("Subscription status:", status);
      if (status === "SUBSCRIBED") {
        console.log("Successfully subscribed to created_content changes");
      }
    });
};

// Modify onMounted to use the new function
onMounted(() => {
  console.log("Component mounted, initializing...");
  fetchContent();
  setupSubscriptions();

  // Check if we need to scroll to top (after page reload)
  if (sessionStorage.getItem("scrollToTop")) {
    console.log("Scrolling to top after reload");
    window.scrollTo(0, 0);
    sessionStorage.removeItem("scrollToTop");
  }
});

// Add a watcher for route changes to handle navigation
watch(
  () => route.params.id,
  (newId) => {
    console.log("Route ID changed to:", newId);
    if (newId) {
      fetchContent();
      setupSubscriptions(); // Re-setup subscriptions when route changes
    }
  }
);

// Modify onUnmounted to clean up subscriptions
onUnmounted(() => {
  if (channel.value) {
    channel.value.unsubscribe();
    channel.value = null;
  }
  window.removeEventListener("keydown", handleKeyPress);
});

const openLightbox = (url) => {
  currentImageIndex.value = generatedImages.value.findIndex(
    (image) => image === url
  );
  lightboxImage.value = url;
  lightboxOpen.value = true;
  // Add event listener when lightbox opens
  window.addEventListener("keydown", handleKeyPress);
};

const closeLightbox = () => {
  lightboxOpen.value = false;
  // Remove event listener when lightbox closes
  window.removeEventListener("keydown", handleKeyPress);
};

const handleKeyPress = (event) => {
  if (!lightboxOpen.value) return;

  switch (event.key) {
    case "ArrowLeft":
      navigateImage("prev");
      break;
    case "ArrowRight":
      navigateImage("next");
      break;
    case "Escape":
      closeLightbox();
      break;
  }
};

const navigateImage = (direction) => {
  const totalImages = generatedImages.value.length;
  if (totalImages <= 1) return;

  let newIndex;
  if (direction === "next") {
    newIndex = (currentImageIndex.value + 1) % totalImages;
  } else {
    newIndex = (currentImageIndex.value - 1 + totalImages) % totalImages;
  }

  currentImageIndex.value = newIndex;
  lightboxImage.value = generatedImages.value[newIndex];
};

// Add download functionality
const downloadAllContent = async () => {
  try {
    isDownloading.value = true;

    // Fetch the created_content record
    const { data: createdContent, error: fetchError } = await supabase
      .from("created_content")
      .select("*")
      .eq("source_content_id", content.value.id)
      .single();

    if (fetchError) throw fetchError;

    console.log("Created content record:", createdContent);
    console.log("URL object structure:", createdContent.url_object);

    // Create a new zip file
    const zip = new JSZip();

    // Add PNG files
    if (createdContent.url_object) {
      // Get all URLs from the url_object, regardless of key name
      const pngUrls = Object.entries(createdContent.url_object)
        .filter(
          ([, url]) =>
            url && typeof url === "string" && url.toLowerCase().endsWith(".png")
        )
        .map(([key, url]) => ({ key, url }));

      console.log("Found PNG URLs:", pngUrls);

      for (const { key, url } of pngUrls) {
        try {
          console.log(`Downloading PNG from ${key}:`, url);
          // Download through our backend proxy
          const response = await fetch(
            `${process.env.VUE_APP_API_BASE_URL}/api/download-file`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url }),
            }
          );

          if (!response.ok) {
            console.error(
              `Failed to download PNG ${key}:`,
              response.status,
              response.statusText
            );
            throw new Error(
              `Failed to download PNG ${key}: ${response.statusText}`
            );
          }

          const blob = await response.blob();
          console.log(`Successfully downloaded PNG ${key}, size:`, blob.size);
          zip.file(`${key}.png`, blob);
        } catch (err) {
          console.error(`Error downloading PNG ${key}:`, err);
        }
      }
    }

    // Add PDF if available
    if (createdContent.pdf_url) {
      try {
        console.log("Downloading PDF from:", createdContent.pdf_url);
        // Download through our backend proxy
        const response = await fetch(
          `${process.env.VUE_APP_API_BASE_URL}/api/download-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: createdContent.pdf_url }),
          }
        );

        if (!response.ok) {
          console.error(
            "Failed to download PDF:",
            response.status,
            response.statusText
          );
          throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("Successfully downloaded PDF, size:", blob.size);
        zip.file("post.pdf", blob);
      } catch (err) {
        console.error("Error downloading PDF:", err);
      }
    }

    // Add video if available
    if (createdContent.video_url) {
      try {
        console.log("Downloading video from:", createdContent.video_url);
        // Download through our backend proxy
        const response = await fetch(
          `${process.env.VUE_APP_API_BASE_URL}/api/download-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: createdContent.video_url }),
          }
        );

        if (!response.ok) {
          console.error(
            "Failed to download video:",
            response.status,
            response.statusText
          );
          throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("Successfully downloaded video, size:", blob.size);
        zip.file("post.mp4", blob);
      } catch (err) {
        console.error("Error downloading video:", err);
      }
    }

    // Generate the zip file
    console.log("Generating zip file...");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    console.log("Zip file generated, size:", zipBlob.size);

    // Download the zip file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    saveAs(zipBlob, `post_content_${timestamp}.zip`);
    console.log("Zip file download initiated");
  } catch (err) {
    console.error("Error preparing download:", err);
    error.value = "Failed to prepare download. Please try again.";
  } finally {
    isDownloading.value = false;
  }
};
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
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

.content-section {
  margin-bottom: 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.content-section h2 {
  margin: 0 0 1rem;
  color: #333;
  font-size: 1.25rem;
}

/* Source Text Styles */
.source-text-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.source-text-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.source-text-summary p {
  margin: 0;
  line-height: 1.6;
  color: #333;
}

.edit-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;
  width: fit-content;
}

/* Images Styles */
.images-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-upload {
  margin-bottom: 1rem;
}

.hidden {
  display: none;
}

.upload-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.images-grid {
  display: flex;
  gap: 1rem;
  min-height: 50px; /* Ensure grid is visible when empty */
  overflow-x: auto;
  padding: 0.5rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  scrollbar-width: thin;
  scrollbar-color: #007bff #f0f0f0;
}

.images-grid::-webkit-scrollbar {
  height: 8px;
}

.images-grid::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.images-grid::-webkit-scrollbar-thumb {
  background: #007bff;
  border-radius: 4px;
}

.image-item {
  flex: 0 0 160px;
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.drag-handle {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  cursor: grab;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle i {
  color: #666;
  font-size: 14px;
}

.sortable-ghost {
  opacity: 0.5;
}

.sortable-drag {
  cursor: grabbing;
}

.image-info {
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  gap: 0.5rem;
  border-top: 1px solid #ddd;
}

.image-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: calc(100% - 40px);
}

.upload-status {
  font-style: italic;
  font-size: 8px;
  color: #666;
}

.image-title {
  font-size: 10px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.delete-button {
  padding: 0.5rem;
  background-color: transparent;
  color: #dc3545;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

.delete-button i {
  font-size: 1.1rem;
}

/* Template Styles */
.templates-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.template-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  display: flex;
  flex-direction: column;
}

.template-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.template-item.selected {
  border-color: #28a745;
  box-shadow: 0 0 0 1px #28a745;
}

.template-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f8f9fa;
}

.template-thumbnail {
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  object-fit: cover;
}

.template-info {
  padding: 0.5rem;
  background: white;
}

.template-info h3 {
  margin: 0;
  font-size: 0.75rem;
  color: #333;
  text-align: center;
  line-height: 1.2;
}

.no-images,
.no-templates {
  text-align: center;
  color: #666;
  padding: 2rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-instruction {
  margin: 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.modal-field {
  margin-bottom: 1rem;
}

.modal-field label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.modal-title-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.modal-text-editor {
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-button {
  padding: 0.5rem 1rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button {
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.upload-success {
  display: inline-flex;
  align-items: center;
  margin-left: 1rem;
  color: #28a745;
  font-size: 0.9rem;
}

.upload-success i {
  margin-right: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
}

.section-header .image-upload {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.edit-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.upload-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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

  .content-section {
    padding: 1rem;
  }

  .templates-grid,
  .images-grid {
    grid-template-columns: 1fr;
  }
}

.source-text-error {
  color: #dc3545;
  margin: 0;
  line-height: 1.6;
}

/* Post Text Styles */
.post-text-container {
  padding: 0.5rem;
}

.post-text-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.post-text-item {
  display: flex;
  flex-direction: column;
}

.text-preview {
  font-size: 0.9rem;
  color: #333;
  white-space: pre-wrap;
  height: 30px;
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  padding: 4px 8px;
  font-family: inherit;
  line-height: 1.4;
  overflow-y: hidden;
}

.text-preview::placeholder {
  color: #999;
}

.text-preview:focus {
  outline: none;
  border-color: #007bff;
}

.no-post-text {
  text-align: center;
  color: #666;
  padding: 1rem;
}

.generate-button {
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.generate-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.generate-button:not(:disabled):hover {
  background-color: #218838;
}

.generating-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #28a745;
  border-radius: 50%;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.fa-spinner {
  animation: spin 1s linear infinite;
}

.field-description {
  font-size: 0.85rem;
  color: #666;
  margin: 0.25rem 0;
  font-style: italic;
  line-height: 1.4;
}

/* Add a wrapper for the first two sections */
.top-sections-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* Adjust media query for mobile responsiveness */
@media (max-width: 768px) {
  .top-sections-wrapper {
    grid-template-columns: 1fr;
  }
}

.no-imagery {
  text-align: center;
  color: #666;
  padding: 1rem;
}

.image-previews-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
}

.download-post-button {
  align-self: flex-start;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.download-post-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.download-post-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.download-post-button i {
  font-size: 1rem;
}

.image-previews {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.preview-thumbnail {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-thumbnail:hover {
  transform: scale(1.05);
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90vh;
  object-fit: contain;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 1rem;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  z-index: 1001;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav.prev {
  left: 20px;
}

.lightbox-nav.next {
  right: 20px;
}

.lightbox-nav i {
  font-size: 1.5rem;
}

@media (max-width: 768px) {
  .image-previews {
    justify-content: center;
  }

  .preview-thumbnail {
    width: 80px;
    height: 80px;
  }
}

.image-previews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.image-previews-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}
</style>
