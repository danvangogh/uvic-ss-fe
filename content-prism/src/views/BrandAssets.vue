<template>
  <div class="brand-assets">
    <h1>Brand Assets</h1>

    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Loading brand assets...</p>
    </div>

    <div v-else>
      <div class="content-section">
        <div class="section-header">
          <h2>Logo</h2>
        </div>
        <div class="logo-section">
          <div v-if="brandLogo" class="current-logo">
            <h3>Current Logo</h3>
            <img :src="brandLogo" alt="Brand Logo" class="logo-preview" />
          </div>
          <div class="logo-upload">
            <h3>Upload New Logo</h3>
            <p class="info-text">Accepted formats: PNG, JPG (max 5MB)</p>
            <input
              type="file"
              @change="handleLogoUpload"
              accept=".png,.jpg,.jpeg"
              :disabled="isUploading"
              ref="logoInput"
            />
            <div v-if="isUploading" class="uploading-status">
              <div class="loading-spinner"></div>
              <span>Uploading...</span>
            </div>
            <div v-if="uploadSuccess" class="success-message">
              Logo uploaded successfully!
            </div>
            <div v-if="uploadError" class="error-message">
              {{ uploadError }}
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2>Brand Voice</h2>
        </div>
        <div class="brand-voice-section">
          <p class="info-text">
            Describe your brand's voice and tone. This will be used to guide
            content generation.
          </p>
          <textarea
            v-model="brandVoice"
            placeholder="E.g., Our brand voice is friendly but professional, using clear language that avoids jargon..."
            rows="5"
            :disabled="isSaving"
            :value="brandVoice"
            ref="textareaRef"
            @input="autoResizeTextarea"
            @focus="autoResizeTextarea"
          ></textarea>
          <button
            @click="saveBrandVoice"
            :disabled="isSaving || !brandVoice.trim()"
            class="save-button"
          >
            <template v-if="isSaving">
              <div class="loading-spinner"></div>
              Saving...
            </template>
            <template v-else> Save </template>
          </button>
          <div v-if="voiceSaveSuccess" class="success-message">
            Brand voice saved successfully!
          </div>
          <div v-if="voiceSaveError" class="error-message">
            {{ voiceSaveError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";

const { user } = useAuth();
const brandLogo = ref(null);
const brandVoice = ref("");
const isUploading = ref(false);
const isSaving = ref(false);
const uploadSuccess = ref(false);
const uploadError = ref(null);
const voiceSaveSuccess = ref(false);
const voiceSaveError = ref(null);
const logoInput = ref(null);
const institutionId = ref(null);
const brandAssetId = ref(null);
const isLoading = ref(true);
const textareaRef = ref(null);

// Function to resize textarea height based on content
const autoResizeTextarea = () => {
  if (!textareaRef.value) return;

  // Reset height to auto to get the correct scrollHeight
  textareaRef.value.style.height = "auto";

  // Set the height to match the scrollHeight (content height)
  textareaRef.value.style.height = textareaRef.value.scrollHeight + "px";
};

// Watch for changes in brand voice text to resize textarea
watch(brandVoice, () => {
  // Use nextTick to ensure the DOM has updated
  nextTick(autoResizeTextarea);
});

// Fetch brand assets info on component mount and when user changes
onMounted(async () => {
  if (user.value) {
    isLoading.value = true;
    await fetchBrandInfo();
    isLoading.value = false;
    // Resize textarea after data is loaded
    nextTick(autoResizeTextarea);
  }
});

// Watch for user changes
watch(user, async (newUser) => {
  if (newUser) {
    isLoading.value = true;
    await fetchBrandInfo();
    isLoading.value = false;
    // Resize textarea after data is loaded
    nextTick(autoResizeTextarea);
  } else {
    // Reset values when user logs out
    brandLogo.value = null;
    brandVoice.value = "";
    institutionId.value = null;
    brandAssetId.value = null;
  }
});

// Resize after fetching brand info to ensure it reflects the loaded content
watch(
  () => brandVoice.value,
  () => {
    nextTick(autoResizeTextarea);
  },
  { immediate: true }
);

// Fetch user's institution and brand assets
const fetchBrandInfo = async () => {
  try {
    console.log("Starting fetchBrandInfo");
    // Get the user's institution_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("institution_id")
      .eq("id", user.value.id)
      .single();

    console.log("User profile:", profile);
    console.log("Profile error:", profileError);

    if (profileError) throw profileError;

    if (profile?.institution_id) {
      institutionId.value = profile.institution_id;
      console.log("institutionId set to:", institutionId.value);

      // Fetch existing brand assets
      const { data: brandAssets, error: brandError } = await supabase
        .from("brand_assets")
        .select("id, logo, brand_voice_description")
        .eq("institution_id", institutionId.value)
        .single();

      console.log("Brand assets data:", brandAssets);
      console.log("Brand assets error:", brandError);

      if (brandError && brandError.code !== "PGRST116") {
        // PGRST116 means no rows returned, which is fine for new institutions
        throw brandError;
      }

      if (brandAssets) {
        console.log("Setting brandAssetId to:", brandAssets.id);
        console.log("Setting brandLogo to:", brandAssets.logo);
        console.log(
          "Setting brandVoice to:",
          brandAssets.brand_voice_description
        );

        brandAssetId.value = brandAssets.id;
        brandLogo.value = brandAssets.logo || null;
        brandVoice.value = brandAssets.brand_voice_description || "";

        console.log("After setting, brandVoice.value is:", brandVoice.value);
      }
    }

    // Auto-resize the textarea after data is loaded
    nextTick(autoResizeTextarea);
  } catch (error) {
    console.error("Error fetching brand info:", error);
  }
};

// Handle logo upload
const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = "Only PNG and JPG images are allowed.";
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = "File size exceeds 5MB limit.";
    return;
  }

  try {
    isUploading.value = true;
    uploadError.value = null;

    // Create form data
    const formData = new FormData();
    formData.append("image", file);

    // Upload to DigitalOcean Spaces via the existing API
    const response = await fetch(
      `${process.env.VUE_APP_API_BASE_URL}/api/upload-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload logo");
    }

    const { url } = await response.json();

    // Save or update brand assets
    await saveBrandAsset({ logo: url });

    // Update the displayed logo
    brandLogo.value = url;

    // Show success message
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);

    // Reset file input
    if (logoInput.value) {
      logoInput.value.value = "";
    }
  } catch (err) {
    console.error("Error uploading logo:", err);
    uploadError.value = "Failed to upload logo. Please try again.";
  } finally {
    isUploading.value = false;
  }
};

// Save brand voice
const saveBrandVoice = async () => {
  if (!brandVoice.value.trim()) return;

  try {
    isSaving.value = true;
    voiceSaveError.value = null;

    await saveBrandAsset({ brand_voice_description: brandVoice.value.trim() });

    // Show success message
    voiceSaveSuccess.value = true;
    setTimeout(() => {
      voiceSaveSuccess.value = false;
    }, 3000);
  } catch (err) {
    console.error("Error saving brand voice:", err);
    voiceSaveError.value = "Failed to save brand voice. Please try again.";
  } finally {
    isSaving.value = false;
  }
};

// Helper function to save/update brand assets
const saveBrandAsset = async (data) => {
  if (!institutionId.value) {
    throw new Error("Institution ID not found");
  }

  // Include institution_id in the data
  const assetData = {
    ...data,
    institution_id: institutionId.value,
    updated_at: new Date().toISOString(),
  };

  // If we have an existing record, update it
  if (brandAssetId.value) {
    const { error } = await supabase
      .from("brand_assets")
      .update(assetData)
      .eq("id", brandAssetId.value);

    if (error) throw error;
  } else {
    // Otherwise insert a new record
    const { data: newAsset, error } = await supabase
      .from("brand_assets")
      .insert([
        {
          ...assetData,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    // Store the new asset ID
    if (newAsset && newAsset.length > 0) {
      brandAssetId.value = newAsset[0].id;
    }
  }
};
</script>

<style scoped>
.brand-assets {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: #333;
}

.content-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.logo-section {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.current-logo,
.logo-upload {
  flex: 1;
  min-width: 300px;
}

.current-logo h3,
.logo-upload h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #555;
}

.logo-preview {
  max-width: 200px;
  max-height: 100px;
  object-fit: contain;
  border: 1px solid #eee;
  padding: 0.5rem;
  border-radius: 4px;
}

.info-text {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
  margin-bottom: 1rem;
  resize: none;
  overflow: hidden;
  min-height: 100px;
  transition: height 0.1s ease;
}

.save-button {
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.5rem;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-button:hover {
  background-color: #0066cc;
}

.save-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-message {
  color: #28a745;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.error-message {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.uploading-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.uploading-status .loading-spinner {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #007aff;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
