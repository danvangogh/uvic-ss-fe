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
                {{ getWordCount(content.source_content_main_text) }} words long.
              </p>
              <p v-else style="color: #dc3545">
                I'm having trouble accessing the source content. Please click
                Edit Text, and paste in the source text.
              </p>
            </div>
          </div>
        </section>

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
                        <span class="image-title">{{ image.image_title }}</span>
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
      </div>
    </div>

    <div v-else class="not-found">Content not found</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";
import draggable from "vuedraggable";

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
    originalSourceText.value = data.source_content_main_text;
    await fetchImages();
    await fetchTemplates();
  } catch (err) {
    console.error("Error fetching content:", err);
    error.value = "Failed to load content. Please try again later.";
  } finally {
    loading.value = false;
  }
};

const fetchImages = async () => {
  try {
    const { data, error: imagesError } = await supabase
      .from("images")
      .select("*")
      .eq("source_content_id", route.params.id)
      .order("sequence", { ascending: true });

    if (imagesError) throw imagesError;
    images.value = data || [];
  } catch (err) {
    console.error("Error fetching images:", err);
  }
};

const fetchTemplates = async () => {
  try {
    const { data, error: templatesError } = await supabase
      .from("content_templates")
      .select("*");

    if (templatesError) throw templatesError;
    templates.value = data || [];
  } catch (err) {
    console.error("Error fetching templates:", err);
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

    // Refresh images
    await fetchImages();
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
    await fetchImages();
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
    error.value =
      "Please upload at least one image before selecting this template";
    return;
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
  } catch (err) {
    console.error("Error updating sequences:", err);
    error.value = "Failed to update image order. Please try again.";
    // Revert to original order if update fails
    await fetchImages();
  }
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

  // Subscribe to real-time changes
  const imagesSubscription = supabase
    .channel("images_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "images",
        filter: `source_content_id=eq.${route.params.id}`,
      },
      (payload) => {
        // Handle different types of changes
        if (payload.eventType === "INSERT") {
          const newImage = payload.new;
          if (!images.value.find((img) => img.id === newImage.id)) {
            images.value = [...images.value, newImage].sort(
              (a, b) => a.sequence - b.sequence
            );
          }
        } else if (payload.eventType === "DELETE") {
          images.value = images.value.filter(
            (img) => img.id !== payload.old.id
          );
        } else if (payload.eventType === "UPDATE") {
          images.value = images.value
            .map((img) => (img.id === payload.new.id ? payload.new : img))
            .sort((a, b) => a.sequence - b.sequence);
        }
      }
    )
    .subscribe();

  // Cleanup subscription on component unmount
  onUnmounted(() => {
    imagesSubscription.unsubscribe();
  });
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

.content-section {
  margin-bottom: 2rem;
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
  flex: 0 0 200px; /* Fixed width for each image item */
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-item img {
  width: 100%;
  height: 150px;
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
  opacity: 0.6;
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
  gap: 50px;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  flex-shrink: 0;
}

.section-header .image-upload {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1;
  justify-content: flex-start;
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
</style>
