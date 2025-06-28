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
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <template v-if="!editingTitle">
                <h1 style="margin: 0;">{{ content.source_content_title }}</h1>
                <button class="edit-title-btn" @click="editingTitle = true" title="Edit title">
                  <i class="fas fa-pencil-alt"></i>
                </button>
              </template>
              <template v-else>
                <input
                  v-model="editedTitle"
                  class="edit-title-input"
                  @keyup.enter="saveTitle"
                  @keyup.esc="cancelTitleEdit"
                  :disabled="savingTitle"
                  :size="Math.max(editedTitle.length, 10)"
                  autofocus
                />
                <button class="save-title-btn" @click="saveTitle" :disabled="savingTitle" title="Save title">
                  <i class="fas fa-check"></i>
                </button>
                <button class="cancel-title-btn" @click="cancelTitleEdit" :disabled="savingTitle" title="Cancel">
                  <i class="fas fa-times"></i>
                </button>
              </template>
              <!-- Generate Imagery button in header -->
              <button
                class="generate-imagery-header-btn"
                @click="generateImagery"
                :disabled="!canGenerateImagery"
                style="margin-left: 1rem;"
              >
                <template v-if="isGeneratingImagery">
                  <i class="fas fa-spinner fa-spin"></i>
                  Generating Imagery...
                </template>
                <template v-else>
                  <i class="fas fa-image"></i>
                  Generate Imagery
                </template>
              </button>
            </div>
            <span class="date"
              >Created {{ formatDate(content.created_at) }}</span
            >

            <!-- Add image previews -->
            <div v-if="generatedImages.length" class="image-previews-section">

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
        <!-- Tab Bar -->
        <div class="tab-bar">
          <button
            v-for="tab in tabLabels"
            :key="tab"
            :class="['tab-btn', { active: selectedTab === tab }]"
            @click="selectedTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Tab Content -->
        <div v-if="selectedTab === 'Source Text'">
          <!-- Source Text Section -->
          <section class="content-section">
            <div class="section-header">
              <h2>Source Text</h2>
              <button class="edit-button" @click="showEditModal = true">
                Edit & Verify Text
              </button>
            </div>
            <span style="font-weight: 300; font-size: 10px"
              >Text length:
              {{ getWordCount(content.source_content_main_text) }} words
            </span>
            <div class="source-text-container">
              <div class="source-text-summary">
                <p v-if="content.source_content_main_text">
                  {{ getFirstNWords(content.source_content_main_text, 30) }}...
                </p>
                <p v-else style="color: #dc3545">
                  I'm having trouble accessing the source content. Please click
                  Edit Text, and paste in the source text.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="selectedTab === 'Images'">
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
                  multiple
                  class="hidden"
                />
                <button 
                  class="upload-button" 
                  @click="triggerImageUpload"
                  :disabled="isUploadingImage"
                >
                  <i v-if="isUploadingImage" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-upload"></i>
                  {{ isUploadingImage ? `Uploading ${uploadingCount} image${uploadingCount !== 1 ? 's' : ''}...` : "Upload Images" }}
                </button>
                <span v-if="uploadSuccess" class="upload-success">
                  <i class="fas fa-check"></i> Images uploaded successfully
                </span>
              </div>
            </div>
            <div class="images-container">
              <div v-if="isUploadingImage" class="uploading-indicator">
                <div class="loading-spinner"></div>
                <p>Uploading {{ uploadingCount }} image{{ uploadingCount !== 1 ? 's' : '' }}...</p>
              </div>
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
              <p v-else-if="!isUploadingImage" class="no-images">No images uploaded yet</p>
            </div>
          </section>
        </div>

        <div v-else-if="selectedTab === 'Template Selection'">
          <!-- Template Selection Section -->
          <section class="content-section">
            <h2>Template Selection</h2>
            <div class="templates-container">
              <div v-if="templates.length">
                <div class="template-select-wrapper">
                  <div class="custom-dropdown" @click="toggleDropdown" :class="{ open: dropdownOpen }">
                    <div class="custom-dropdown-selected">
                      <img v-if="selectedTemplate && selectedTemplate.template_thumbnail_url" :src="selectedTemplate.template_thumbnail_url" :alt="selectedTemplate.template_name" class="template-dropdown-thumb" />
                      <span class="template-dropdown-name">{{ selectedTemplate ? selectedTemplate.template_name : 'Select a template' }}</span>
                      <i class="fas fa-chevron-down dropdown-arrow"></i>
                    </div>
                    <div v-if="dropdownOpen" class="custom-dropdown-list">
                      <div
                        v-for="template in templates"
                        :key="template.id"
                        class="custom-dropdown-option"
                        :class="{ disabled: !isTemplateEnabled(template), selected: selectedTemplateId === template.id }"
                        @click.stop="selectDropdownTemplate(template)"
                      >
                        <img v-if="template.template_thumbnail_url" :src="template.template_thumbnail_url" :alt="template.template_name" class="template-dropdown-thumb" />
                        <span class="template-dropdown-name">{{ template.template_name }}</span>
                        <span v-if="!isTemplateEnabled(template)" class="template-dropdown-disabled-reason">({{ getMinimumImages(template) }} image{{ getMinimumImages(template) !== 1 ? 's' : '' }} required)</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="selectedTemplate && !isTemplateEnabled(selectedTemplate)" class="template-tooltip">
                    {{ getMinimumImages(selectedTemplate) }} image{{ getMinimumImages(selectedTemplate) !== 1 ? 's' : '' }} required
                  </div>
                </div>
              </div>
              <p v-else class="no-templates">No templates available</p>
            </div>
          </section>
        </div>

        <div v-else-if="selectedTab === 'Template Text'">
          <!-- Template Text Section -->
          <section class="content-section">
            <div class="section-header">
              <h2>Template Text</h2>
              <button
                class="generate-button"
                @click="generatePostText"
                :disabled="isGeneratingText || !content?.template_id"
              >
                <template v-if="isGeneratingText">
                  <i class="fas fa-spinner fa-spin"></i>
                  Generating template text using AI...
                </template>
                <template v-else> Generate Template Text </template>
              </button>
            </div>
            <div v-if="isGeneratingText" class="generating-text">
              <div class="loading-spinner"></div>
              <p>Generating template text using AI...</p>
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
              Please select a template first to generate template text.
            </p>
          </section>
        </div>

        <div v-else-if="selectedTab === 'Captions'">
          <!-- Captions Section -->
          <section class="content-section captions-section">
            <div class="section-header">
              <h2>Captions</h2>
              <button
                class="generate-button"
                @click="generateCaptions"
                :disabled="isGeneratingCaptions"
              >
                <template v-if="isGeneratingCaptions">
                  <i class="fas fa-spinner fa-spin"></i>
                  Generating...
                </template>
                <template v-else> Generate Captions </template>
              </button>
            </div>
            <div v-if="isGeneratingCaptions" class="generating-text">
              <div class="loading-spinner"></div>
              <p>Generating captions using AI...</p>
            </div>
            <div class="captions-controls" v-else>
              <select v-model="selectedCaptionPlatform" class="captions-dropdown">
                <option value="Bluesky">Bluesky</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
              </select>
              <div class="captions-textarea-wrapper">
                <textarea
                  class="captions-textarea"
                  :value="getCaptionWithUrl"
                  readonly
                  rows="3"
                ></textarea>
                <button class="copy-caption-btn" @click="copyCaption" :title="copied ? 'Copied!' : 'Copy to clipboard'">
                  <i :class="['fas', copied ? 'fa-check' : 'fa-copy']"></i>
                </button>
              </div>
            </div>
            <div v-if="copied" class="caption-copied-feedback">Copied!</div>
          </section>
        </div>
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
            <label for="title">Title</label>
            <input
              id="title"
              v-model="content.source_content_title"
              class="modal-title-input"
              placeholder="Enter the article title..."
              @input="handleSourceTextChange"
            />
          </div>
          <div class="modal-field">
            <label for="mainText">Text</label>
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
const imageInput = ref(null);
const isUploadingImage = ref(false);
const uploadingCount = ref(0);
const selectedTemplateId = ref(null);
const dropdownOpen = ref(false);
const selectedCaptionPlatform = ref('Bluesky');
const copied = ref(false);
const isGeneratingCaptions = ref(false);
const captions = ref({
  bluesky_caption: '',
  linkedin_caption: '',
  facebook_caption: '',
  instagram_caption: ''
});
const editingTitle = ref(false);
const editedTitle = ref("");
const savingTitle = ref(false);

const tabLabels = [
  'Source Text',
  'Images',
  'Template Selection',
  'Template Text',
  'Captions',
];
const selectedTab = ref(tabLabels[0]);

const fetchCaptions = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('social_captions')
      .select('bluesky_caption, linkedin_caption, facebook_caption, instagram_caption')
      .eq('id', content.value.id)
      .single();
    if (fetchError) throw fetchError;
    captions.value = data || {
      bluesky_caption: '',
      linkedin_caption: '',
      facebook_caption: '',
      instagram_caption: ''
    };
  } catch (err) {
    console.error('Error fetching captions:', err);
    captions.value = {
      bluesky_caption: '',
      linkedin_caption: '',
      facebook_caption: '',
      instagram_caption: ''
    };
  }
};

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

const visiblePostTextFields = computed(() => {
  // Default fields if no schema is available
  const defaultFields = ["p1a", "p1b", "p2a", "p2b", "p3a", "p3b"];

  if (!activeTemplateSchema.value) return defaultFields;

  // Get fields from schema or use defaults
  const schemaFields = Object.keys(activeTemplateSchema.value);
  return schemaFields.length > 0 ? schemaFields : defaultFields;
});

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

const hasPostText = computed(() => {
  return (
    post_text.value &&
    Object.values(post_text.value).some(
      (text) => typeof text === "string" && text.trim().length > 0
    )
  );
});

const getMinimumImages = (template) => {
  return template.minimum_images || 0;
};

const isTemplateEnabled = (template) => {
  const minimumImages = getMinimumImages(template);
  return images.value.length >= minimumImages;
};

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
      .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error

    if (!postTextError && postTextData) {
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
      .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error

    if (error) {
      console.error("Error fetching generated images:", error);
      // Don't throw error, just set empty array
      generatedImages.value = [];
      return;
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
    // Don't throw error, just set empty array
    generatedImages.value = [];
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
  imageInput.value.click();
};

const handleImageUpload = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  try {
    isUploadingImage.value = true;
    uploadingCount.value = files.length;
    error.value = null;

    // Get the starting sequence number
    const startSequence =
      images.value.length > 0
        ? Math.max(...images.value.map((img) => img.sequence)) + 1
        : 1;

    // Upload files sequentially and display each one immediately
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create form data for single file
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

      // Save single image record to Supabase
      const { data: newImage, error: insertError } = await supabase
        .from("images")
        .insert({
          image_title: `Image ${startSequence + i}`,
          image_url: url,
          source_content_id: content.value.id,
          user_id: user.value.id,
          institution_id: content.value.institution_id,
          sequence: startSequence + i,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add the new image to the local array immediately for instant UI update
      images.value.push(newImage);

      // Update the uploading count to show progress
      uploadingCount.value = files.length - (i + 1);
    }

    // Show success message
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);

    // Clear the file input
    event.target.value = '';
  } catch (err) {
    console.error("Error uploading images:", err);
    error.value = "Failed to upload images. Please try again.";
  } finally {
    isUploadingImage.value = false;
    uploadingCount.value = 0;
  }
};

const deleteImage = async (imageId) => {
  try {
    // Find the image to get its URL for deletion from storage
    const imageToDelete = images.value.find((img) => img.id === imageId);
    if (!imageToDelete) {
      throw new Error("Image not found in local state.");
    }

    // First, delete the file from DigitalOcean Spaces via the backend
    const response = await fetch(
      `${process.env.VUE_APP_API_BASE_URL}/api/delete-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: imageToDelete.image_url }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to delete image from storage: ${errorData.message}`
      );
    }

    // If storage deletion is successful, then delete from Supabase
    const { error: deleteError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      // Note: This could leave an orphaned DB record if the file was deleted but DB record was not.
      // A more robust solution might involve a multi-step transaction or a cleanup job.
      throw deleteError;
    }

    // Remove the image from the local array immediately for instant UI update
    images.value = images.value.filter((img) => img.id !== imageId);
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);

    if (updateError) throw updateError;

    // Update local state directly instead of refreshing
    content.value = {
      ...content.value,
      template_id: templateId,
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

const getFirstNWords = (text, n) => {
  if (!text) return "";
  return text.split(/\s+/).slice(0, n).join(" ");
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

const selectedTemplate = computed(() => {
  return templates.value.find(t => t.id === selectedTemplateId.value) || null;
});

watch(
  () => content.value?.template_id,
  (newId) => {
    if (newId) selectedTemplateId.value = newId;
  },
  { immediate: true }
);

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

const selectDropdownTemplate = (template) => {
  if (!isTemplateEnabled(template)) return;
  selectedTemplateId.value = template.id;
  selectTemplate(template.id);
  dropdownOpen.value = false;
};

// Close dropdown on outside click
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.custom-dropdown');
  if (dropdown && !dropdown.contains(event.target)) {
    dropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

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

    // No need to refresh content since we've already updated local state
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
    console.error("Error saving template text:", err);
    error.value = "Failed to save template text. Please try again.";
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
      console.error("Error upserting template text:", upsertError);
      throw new Error("Failed to save generated text to database");
    }
  } catch (err) {
    console.error("Error generating template text:", err);
    error.value =
      err.message || "Failed to generate template text. Please try again.";
  } finally {
    // Only update the local UI state for isGeneratingText
    isGeneratingText.value = false;
  }
};

const generateImagery = async () => {
  if (!canGenerateImagery.value) {
    console.log("Cannot generate imagery:", {
      hasTemplateId: !!content.value?.template_id,
      hasPostText: hasPostText.value,
      isGeneratingImagery: isGeneratingImagery.value,
    });
    return;
  }

  try {
    console.log("Starting imagery generation");
    isGeneratingImagery.value = true;
    error.value = null;

    // Map the images to the format expected by Bannerbear for modifications
    const mappedImages = images.value.map((image, index) => {
      let name;
      if (index === 0) {
        name = "featured_img";
      } else {
        name = `image${index + 1}`;
      }
      return {
        name,
        image_url: image.image_url,
      };
    });

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
          images: mappedImages, // Send the mapped images
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
  } finally {
    console.log("Imagery generation process completed");
    isGeneratingImagery.value = false;
  }
};

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

    // Helper: format date as MM_DD
    const formatDateForFilename = (dateString) => {
      const date = new Date(dateString);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${mm}_${dd}`;
    };
    // Helper: get first three words of title, sanitized
    const getFirstThreeWords = (title) => {
      if (!title) return 'Untitled';
      return title
        .split(/\s+/)
        .slice(0, 3)
        .join('_')
        .replace(/[^a-zA-Z0-9_]/g, '');
    };
    const datePart = formatDateForFilename(content.value.created_at);
    const titlePart = getFirstThreeWords(content.value.source_content_title);
    const baseName = `${datePart}_${titlePart}`;

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
        .map(([key, url], idx) => ({ key, url, idx }));

      for (const { key, url, idx } of pngUrls) {
        try {
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
            throw new Error(`Failed to download PNG ${key}: ${response.statusText}`);
          }

          const blob = await response.blob();
          // Name: MM_DD_FirstThreeWordsofTitle_Slide#.png
          const slideNum = idx + 1;
          const filename = `${baseName}_Slide${slideNum}.png`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Error downloading PNG ${key}:`, err);
        }
      }
    }

    // Add PDF if available
    if (createdContent.pdf_url) {
      try {
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
          throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        // Name: MM_DD_FirstThreeWordsofTitle.pdf
        const filename = `${baseName}.pdf`;
        zip.file(filename, blob);
      } catch (err) {
        console.error("Error downloading PDF:", err);
      }
    }

    // Add video if available (keep original name)
    if (createdContent.video_url) {
      try {
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
          throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const blob = await response.blob();
        zip.file(`${baseName}.mp4`, blob);
      } catch (err) {
        console.error("Error downloading video:", err);
      }
    }

    // Generate the zip file
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Download the zip file
    saveAs(zipBlob, `${baseName}.zip`);
  } catch (err) {
    console.error("Error preparing download:", err);
    error.value = "Failed to prepare download. Please try again.";
  } finally {
    isDownloading.value = false;
  }
};

const generateCaptions = async () => {
  try {
    isGeneratingCaptions.value = true;
    error.value = null;
    const response = await fetch(`${process.env.VUE_APP_API_BASE_URL}/api/generate-captions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: content.value.id,
        institutionId: content.value.institution_id,
        templateId: content.value.template_id
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to generate captions');
    }
    // Update local state with new captions
    captions.value = result.captions;
  } catch (err) {
    console.error('Error generating captions:', err);
    error.value = err.message || 'Failed to generate captions. Please try again.';
  } finally {
    isGeneratingCaptions.value = false;
  }
};

// Fetch captions on content load
watch(
  () => content.value?.id,
  (newId) => {
    if (newId) fetchCaptions();
  },
  { immediate: true }
);

const getCaptionWithUrl = computed(() => {
  console.log('getCaptionWithUrl content.value:', content.value);
  const platform = selectedCaptionPlatform.value;
  const baseCaption = captions.value[platform.toLowerCase() + '_caption'] || '';
  // Only append if content is an article (not a PDF)
  if (content.value && content.value.source_content_type === 'article' && content.value.source_content_url) {
    console.log('Caption URL for display:', content.value.source_content_url);
    if (platform === 'Bluesky') {
      return baseCaption ? `${baseCaption} ${content.value.source_content_url}` : '';
    } else if (platform === 'LinkedIn' || platform === 'Facebook') {
      return baseCaption ? `${baseCaption} Read more at ${content.value.source_content_url}` : '';
    } else if (platform === 'Instagram') {
      return baseCaption;
    }
  }
  return baseCaption;
});

const copyCaption = async () => {
  try {
    await navigator.clipboard.writeText(getCaptionWithUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1200);
  } catch (e) {
    copied.value = false;
  }
};

watch(
  () => content.value?.source_content_title,
  (newTitle) => {
    if (!editingTitle.value) editedTitle.value = newTitle;
  },
  { immediate: true }
);

const saveTitle = async () => {
  if (!editedTitle.value.trim() || editedTitle.value === content.value.source_content_title) {
    editingTitle.value = false;
    return;
  }
  try {
    savingTitle.value = true;
    const { error: updateError } = await supabase
      .from("source_content")
      .update({
        source_content_title: editedTitle.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content.value.id);
    if (updateError) throw updateError;
    content.value.source_content_title = editedTitle.value;
    editingTitle.value = false;
  } catch (err) {
    error.value = "Failed to update title. Please try again.";
  } finally {
    savingTitle.value = false;
  }
};

const cancelTitleEdit = () => {
  editedTitle.value = content.value.source_content_title;
  editingTitle.value = false;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.upload-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-button:not(:disabled):hover {
  background-color: #0056b3;
}

.images-grid {
  display: flex;
  gap: 1rem;
  min-height: 50px;
  overflow-x: auto;
  padding: 0.5rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
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
  flex: 0 0 120px;
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-item img {
  width: 100%;
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

.templates-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.template-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.custom-dropdown {
  position: relative;
  min-width: 220px;
  user-select: none;
  cursor: pointer;
}
.custom-dropdown-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 1rem;
}
.dropdown-arrow {
  margin-left: auto;
  color: #888;
}
.custom-dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 2px;
}
.custom-dropdown-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.15s;
}
.custom-dropdown-option.selected {
  background: #e6f7ff;
}
.custom-dropdown-option.disabled {
  color: #aaa;
  cursor: not-allowed;
  background: #f8f9fa;
}
.custom-dropdown-option:not(.disabled):hover {
  background: #f0f8ff;
}
.custom-dropdown-option .template-dropdown-name {
  font-size: 12px;
  font-weight: 400;
}
.template-dropdown-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
}
.template-dropdown-name {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}
.template-dropdown-disabled-reason {
  font-size: 0.85rem;
  color: #dc3545;
  margin-left: 0.5rem;
}
.no-templates {
  text-align: center;
  color: #666;
  padding: 2rem;
}

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

.top-sections-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

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

.uploading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.uploading-indicator .loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

.uploading-indicator p {
  margin: 0;
  font-size: 0.9rem;
}

.template-tooltip {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  text-align: center;
  z-index: 1002;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: none;
}

.template-tooltip::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 4px solid rgba(0, 0, 0, 0.9);
}

.template-item.disabled:hover .template-tooltip {
  opacity: 1;
  visibility: visible;
}

.template-captions-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}
@media (max-width: 768px) {
  .template-captions-wrapper {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
.captions-section .captions-placeholder {
  color: #666;
  font-size: 0.95rem;
  padding: 1rem 0;
  font-style: italic;
}
.captions-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.captions-dropdown {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 1rem;
  width: 200px;
  background: #fff;
}
.captions-textarea-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
}
.captions-textarea {
  width: 100%;
  min-width: 220px;
  max-width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  font-size: 12px;
  color: #333;
  font-family: inherit;
  font-weight: 400;
  font-style: italic;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  resize: none;
}
.copy-caption-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}
.copy-caption-btn:hover {
  background: #e6f0ff;
}
.caption-copied-feedback {
  color: #28a745;
  font-size: 0.95rem;
  margin-top: 0.5rem;
  font-weight: 500;
}
.edit-title-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: background 0.2s;
}
.edit-title-btn:hover {
  background: #e6f0ff;
}
.save-title-btn, .cancel-title-btn {
  background: none;
  border: none;
  color: #28a745;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: background 0.2s;
}
.save-title-btn:hover {
  background: #e6ffe6;
}
.cancel-title-btn {
  color: #dc3545;
}
.cancel-title-btn:hover {
  background: #ffeaea;
}
.edit-title-input {
  font-size: 1.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  min-width: 120px;
  max-width: 100%;
  width: fit-content;
  margin-right: 0.5rem;
  transition: width 0.2s;
}

.tab-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #eee;
}
.tab-btn {
  background: none;
  border: none;
  font-size: 1rem;
  padding: 0.75rem 1.5rem 0.5rem 1.5rem;
  cursor: pointer;
  color: #888;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-bottom 0.2s;
}
.tab-btn.active {
  color: #007bff;
  border-bottom: 2px solid #007bff;
  font-weight: 600;
}
.generate-imagery-header-btn {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  margin-left: 1rem;
  transition: all 0.2s ease;
}
.generate-imagery-header-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}
.generate-imagery-header-btn:not(:disabled):hover {
  background-color: #218838;
}
</style>
