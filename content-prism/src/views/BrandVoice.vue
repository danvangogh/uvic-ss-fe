<template>
  <div class="brand-voice">
    <h1>Brand Voice</h1>

    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Loading brand voices...</p>
    </div>

    <div v-else>
      <div class="content-section">
        <div class="section-header">
          <h2>Voice Settings</h2>
        </div>
        <div class="brand-voice-section">
          <p class="info-text">
            Describe your brand's voice and tone. This will be used to guide
            content generation.
          </p>
          <div v-if="brandVoices.length" class="brand-voices-list">
            <div
              v-for="(voice, index) in brandVoices"
              :key="voice.id"
              class="brand-voice-card"
            >
              <div class="brand-voice-card-header">
                <h3>Brand Voice {{ index + 1 }}</h3>
                <button
                  class="remove-voice-button"
                  @click="removeBrandVoice(voice.id)"
                  :disabled="isSaving"
                >
                  <i class="fas fa-trash"></i>
                  Remove
                </button>
              </div>
              <label class="brand-voice-label" :for="`brandVoiceName-${voice.id}`">
                Name
              </label>
              <input
                :id="`brandVoiceName-${voice.id}`"
                v-model="voice.name"
                class="brand-voice-input"
                type="text"
                placeholder="E.g., Faculty voice, Research voice"
                :disabled="isSaving"
              />
              <label
                class="brand-voice-label"
                :for="`brandVoiceDescription-${voice.id}`"
              >
                Description
              </label>
              <textarea
                :id="`brandVoiceDescription-${voice.id}`"
                v-model="voice.description"
                class="brand-voice-textarea"
                placeholder="Describe the tone, personality, and stylistic preferences for this voice..."
                rows="4"
                :disabled="isSaving"
              ></textarea>
            </div>
          </div>
          <p v-else class="no-brand-voices">
            No brand voices yet. Add one to guide generated content.
          </p>
          <div class="brand-voice-actions">
            <button
              class="secondary-button"
              @click="addBrandVoice"
              :disabled="isSaving"
            >
              <i class="fas fa-plus"></i>
              Add Brand Voice
            </button>
            <button
              @click="saveBrandVoices"
              :disabled="isSaving || !isBrandVoiceFormValid"
              class="save-button"
            >
              <template v-if="isSaving">
                <div class="loading-spinner"></div>
                Saving...
              </template>
              <template v-else> Save Voices </template>
            </button>
          </div>
          <div v-if="!isBrandVoiceFormValid" class="brand-voice-validation">
            Each brand voice needs both a name and description before saving.
          </div>
          <div v-if="voiceSaveSuccess" class="success-message">
            Brand voices saved successfully!
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
import { ref, onMounted, watch, computed } from "vue";
import { supabase } from "../supabase";
import { useAuth } from "../stores/authStore";

const { user } = useAuth();
const brandVoices = ref([]);
const isSaving = ref(false);
const voiceSaveSuccess = ref(false);
const voiceSaveError = ref(null);
const institutionId = ref(null);
const brandAssetId = ref(null);
const isLoading = ref(true);

const generateVoiceId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `voice_${Date.now()}_${Math.random().toString(16).slice(2)}`);

const parseBrandVoiceData = (rawValue) => {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "object" && rawValue !== null) {
    if (Array.isArray(rawValue.entries)) {
      return rawValue.entries;
    }
    return [];
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries;
      }
    } catch (error) {
      return [
        {
          id: generateVoiceId(),
          name: "Primary Brand Voice",
          description: rawValue,
        },
      ];
    }

    return [
      {
        id: generateVoiceId(),
        name: "Primary Brand Voice",
        description: rawValue,
      },
    ];
  }

  return [];
};

const normalizeBrandVoices = (entries = []) =>
  entries.map((entry, index) => ({
    id: entry.id || generateVoiceId(),
    name:
      typeof entry.name === "string" ? entry.name : `Brand Voice ${index + 1}`,
    description: typeof entry.description === "string" ? entry.description : "",
  }));

const addBrandVoice = () => {
  brandVoices.value = [
    ...brandVoices.value,
    {
      id: generateVoiceId(),
      name: "",
      description: "",
    },
  ];
};

const removeBrandVoice = (id) => {
  brandVoices.value = brandVoices.value.filter((voice) => voice.id !== id);
};

const isBrandVoiceFormValid = computed(() => {
  if (!brandVoices.value.length) {
    return false;
  }

  return brandVoices.value.every(
    (voice) =>
      typeof voice.name === "string" &&
      voice.name.trim().length > 0 &&
      typeof voice.description === "string" &&
      voice.description.trim().length > 0
  );
});

// Fetch brand assets info on component mount and when user changes
onMounted(async () => {
  if (user.value) {
    isLoading.value = true;
    await fetchBrandInfo();
    isLoading.value = false;
  }
});

// Watch for user changes
watch(user, async (newUser) => {
  if (newUser) {
    isLoading.value = true;
    await fetchBrandInfo();
    isLoading.value = false;
  } else {
    // Reset values when user logs out
    brandVoices.value = [];
    institutionId.value = null;
    brandAssetId.value = null;
  }
});

// Fetch user's institution and brand assets
const fetchBrandInfo = async () => {
  try {
    // Get the user's institution_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("institution_id")
      .eq("id", user.value.id)
      .single();

    if (profileError) throw profileError;

    if (profile?.institution_id) {
      institutionId.value = profile.institution_id;

      // Fetch existing brand assets
      const { data: brandAssets, error: brandError } = await supabase
        .from("brand_assets")
        .select("id, brand_voice_description")
        .eq("institution_id", institutionId.value)
        .single();

      if (brandError && brandError.code !== "PGRST116") {
        // PGRST116 means no rows returned, which is fine for new institutions
        throw brandError;
      }

      if (brandAssets) {
        brandAssetId.value = brandAssets.id;
        const parsedVoices = parseBrandVoiceData(
          brandAssets.brand_voice_description
        );
        brandVoices.value = normalizeBrandVoices(parsedVoices);
        if (!brandVoices.value.length) {
          addBrandVoice();
        }
      } else {
        // No brand assets yet, start with one empty voice
        addBrandVoice();
      }
    }
  } catch (error) {
    console.error("Error fetching brand info:", error);
  }
};

// Save brand voice
const saveBrandVoices = async () => {
  if (!isBrandVoiceFormValid.value) return;

  try {
    isSaving.value = true;
    voiceSaveError.value = null;

    const sanitizedVoices = brandVoices.value.map((voice) => ({
      id: voice.id || generateVoiceId(),
      name: voice.name.trim(),
      description: voice.description.trim(),
    }));

    await saveBrandAsset({
      brand_voice_description: sanitizedVoices,
    });

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
.brand-voice {
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

.info-text {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
}

.brand-voices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.brand-voice-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.brand-voice-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-voice-card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.brand-voice-label {
  font-size: 0.85rem;
  color: #555;
  font-weight: 500;
}

.brand-voice-input,
.brand-voice-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.brand-voice-input:focus,
.brand-voice-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.brand-voice-textarea {
  min-height: 120px;
  resize: vertical;
}

.brand-voice-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.secondary-button {
  padding: 0.5rem 1rem;
  background-color: #f1f5f9;
  color: #1f2937;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.secondary-button:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remove-voice-button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.remove-voice-button:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.1);
}

.remove-voice-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-brand-voices {
  font-size: 0.95rem;
  color: #6b7280;
  font-style: italic;
}

.brand-voice-validation {
  color: #dc3545;
  font-size: 0.85rem;
  font-style: italic;
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

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
}

.loading-indicator .loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(0, 122, 255, 0.2);
  border-top-color: #007aff;
}
</style>
