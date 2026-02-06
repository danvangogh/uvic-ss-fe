<template>
  <div class="brand-positioning">
    <h1>Brand Positioning</h1>

    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Loading positioning options...</p>
    </div>

    <div v-else>
      <div class="content-section">
        <div class="section-header">
          <h2>Emotional Positioning</h2>
        </div>
        <div class="positioning-section">
          <p class="info-text">
            Define emotional positioning options to guide the tone of generated content.
            The selected positioning will influence how the AI crafts the opening hook
            and supporting content to evoke specific emotional responses from readers.
          </p>
          <div v-if="positioningOptions.length" class="positioning-list">
            <div
              v-for="(option, index) in positioningOptions"
              :key="option.id"
              class="positioning-card"
            >
              <div class="positioning-card-header">
                <h3>Positioning {{ index + 1 }}</h3>
                <button
                  class="remove-positioning-button"
                  @click="removePositioning(option.id)"
                  :disabled="isSaving"
                >
                  <i class="fas fa-trash"></i>
                  Remove
                </button>
              </div>
              <label class="positioning-label" :for="`positioningName-${option.id}`">
                Name
              </label>
              <input
                :id="`positioningName-${option.id}`"
                v-model="option.name"
                class="positioning-input"
                type="text"
                placeholder="E.g., Curiosity, Joy, Urgency"
                :disabled="isSaving"
              />
              <label
                class="positioning-label"
                :for="`positioningDescription-${option.id}`"
              >
                Description
              </label>
              <textarea
                :id="`positioningDescription-${option.id}`"
                v-model="option.description"
                class="positioning-textarea"
                placeholder="Describe how this emotional positioning should influence the content. This will guide the AI in crafting the tone and messaging..."
                rows="4"
                :disabled="isSaving"
              ></textarea>
            </div>
          </div>
          <p v-else class="no-positioning">
            No positioning options yet. Add one to guide the emotional tone of generated content.
          </p>
          <div class="positioning-actions">
            <button
              class="secondary-button"
              @click="addPositioning"
              :disabled="isSaving"
            >
              <i class="fas fa-plus"></i>
              Add Positioning
            </button>
            <button
              @click="savePositioning"
              :disabled="isSaving || !isPositioningFormValid"
              class="save-button"
            >
              <template v-if="isSaving">
                <div class="loading-spinner"></div>
                Saving...
              </template>
              <template v-else> Save Positioning </template>
            </button>
          </div>
          <div v-if="!isPositioningFormValid && positioningOptions.length > 0" class="positioning-validation">
            Each positioning option needs both a name and description before saving.
          </div>
          <div v-if="saveSuccess" class="success-message">
            Positioning options saved successfully!
          </div>
          <div v-if="saveError" class="error-message">
            {{ saveError }}
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
const positioningOptions = ref([]);
const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref(null);
const institutionId = ref(null);
const brandAssetId = ref(null);
const isLoading = ref(true);

const generatePositioningId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `positioning_${Date.now()}_${Math.random().toString(16).slice(2)}`);

const parsePositioningData = (rawValue) => {
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
      return [];
    }
  }

  return [];
};

const normalizePositioning = (entries = []) =>
  entries.map((entry, index) => ({
    id: entry.id || generatePositioningId(),
    name:
      typeof entry.name === "string" ? entry.name : `Positioning ${index + 1}`,
    description: typeof entry.description === "string" ? entry.description : "",
  }));

const addPositioning = () => {
  positioningOptions.value = [
    ...positioningOptions.value,
    {
      id: generatePositioningId(),
      name: "",
      description: "",
    },
  ];
};

const removePositioning = (id) => {
  positioningOptions.value = positioningOptions.value.filter((option) => option.id !== id);
};

const isPositioningFormValid = computed(() => {
  if (!positioningOptions.value.length) {
    return true; // Empty list is valid (no positioning selected)
  }

  return positioningOptions.value.every(
    (option) =>
      typeof option.name === "string" &&
      option.name.trim().length > 0 &&
      typeof option.description === "string" &&
      option.description.trim().length > 0
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
    positioningOptions.value = [];
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
        .select("id, emotional_positioning")
        .eq("institution_id", institutionId.value)
        .single();

      if (brandError && brandError.code !== "PGRST116") {
        // PGRST116 means no rows returned, which is fine for new institutions
        throw brandError;
      }

      if (brandAssets) {
        brandAssetId.value = brandAssets.id;
        const parsedPositioning = parsePositioningData(
          brandAssets.emotional_positioning
        );
        positioningOptions.value = normalizePositioning(parsedPositioning);
      }
    }
  } catch (error) {
    console.error("Error fetching brand info:", error);
  }
};

// Save positioning
const savePositioning = async () => {
  if (!isPositioningFormValid.value) return;

  try {
    isSaving.value = true;
    saveError.value = null;

    const sanitizedPositioning = positioningOptions.value.map((option) => ({
      id: option.id || generatePositioningId(),
      name: option.name.trim(),
      description: option.description.trim(),
    }));

    await saveBrandAsset({
      emotional_positioning: sanitizedPositioning,
    });

    // Show success message
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err) {
    console.error("Error saving positioning:", err);
    saveError.value = "Failed to save positioning options. Please try again.";
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
.brand-positioning {
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

.positioning-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.positioning-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.positioning-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.positioning-card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.positioning-label {
  font-size: 0.85rem;
  color: #555;
  font-weight: 500;
}

.positioning-input,
.positioning-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.positioning-input:focus,
.positioning-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.positioning-textarea {
  min-height: 120px;
  resize: vertical;
}

.positioning-actions {
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

.remove-positioning-button {
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

.remove-positioning-button:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.1);
}

.remove-positioning-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-positioning {
  font-size: 0.95rem;
  color: #6b7280;
  font-style: italic;
}

.positioning-validation {
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
