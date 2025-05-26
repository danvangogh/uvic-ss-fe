<template>
  <div class="auth-container">
    <div class="auth-box">
      <h2>Complete Your Profile</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="institution">Institution Name</label>
          <div class="autocomplete-wrapper">
            <input
              type="text"
              id="institution"
              v-model="searchTerm"
              @input="handleInstitutionInput"
              @focus="showInstitutions = true"
              required
              class="form-input"
              :class="{ 'is-invalid': !isValidSelection }"
              placeholder="Type to search institutions..."
              autocomplete="off"
            />
            <div
              v-if="showInstitutions && filteredInstitutions.length"
              class="autocomplete-dropdown"
            >
              <div
                v-for="inst in filteredInstitutions"
                :key="inst.institution_name"
                class="autocomplete-item"
                @click="selectInstitution(inst.institution_name)"
              >
                {{ inst.institution_name }}
              </div>
            </div>
            <div
              v-else-if="
                showInstitutions && searchTerm && !filteredInstitutions.length
              "
              class="no-results"
            >
              No matching institutions found
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="role">Role</label>
          <select id="role" v-model="formData.role" required class="form-input">
            <option value="" disabled>Select your role</option>
            <option value="Researcher/Faculty">Researcher/Faculty</option>
            <option value="Communications/Marketing">
              Communications/Marketing
            </option>
            <option value="Co-op Student">Co-op Student</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="submit-button"
          :disabled="loading || !isValidSelection"
        >
          {{ loading ? "Saving..." : "Complete Setup" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabase";

export default {
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const error = ref(null);
    const institutions = ref([]);
    const showInstitutions = ref(false);
    const searchTerm = ref("");
    const formData = ref({
      institution: "",
      role: "",
    });

    // Check if profile is already complete
    onMounted(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("institution_id, role_id")
          .eq("id", user.id)
          .single();

        if (profile?.institution_id && profile?.role_id) {
          router.push("/dashboard");
          return;
        }

        // Fetch institutions only if profile is incomplete
        const { data, error: fetchError } = await supabase
          .from("institutions")
          .select("institution_name")
          .order("institution_name");

        console.log('Fetched institutions:', data);
        if (fetchError) throw fetchError;
        institutions.value = data;
      } catch (err) {
        console.error("Error checking profile:", err);
        error.value = "An error occurred while loading your profile";
      }
    });

    const filteredInstitutions = computed(() => {
      if (!searchTerm.value) return institutions.value;
      const search = searchTerm.value.toLowerCase();
      return institutions.value.filter((inst) =>
        inst.institution_name.toLowerCase().includes(search)
      );
    });

    const isValidSelection = computed(() => {
      return institutions.value.some(
        (inst) => inst.institution_name === formData.value.institution
      );
    });

    const handleInstitutionInput = () => {
      formData.value.institution = searchTerm.value;
    };

    const selectInstitution = (institutionName) => {
      searchTerm.value = institutionName;
      formData.value.institution = institutionName;
      showInstitutions.value = false;
    };

    // Click outside to close dropdown
    document.addEventListener("click", (e) => {
      const autocompleteWrapper = document.querySelector(
        ".autocomplete-wrapper"
      );
      if (autocompleteWrapper && !autocompleteWrapper.contains(e.target)) {
        showInstitutions.value = false;
        // Reset search term to last valid selection if current input is invalid
        if (!isValidSelection.value) {
          searchTerm.value = formData.value.institution;
        }
      }
    });

    async function handleSubmit() {
      try {
        if (!isValidSelection.value) {
          throw new Error("Please select a valid institution from the list");
        }

        loading.value = true;
        error.value = null;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        // Verify the selected institution exists
        const { data: institutionData, error: institutionError } =
          await supabase
            .from("institutions")
            .select("id")
            .eq("institution_name", formData.value.institution)
            .single();

        if (institutionError)
          throw new Error("Please select a valid institution from the list");
        const institutionId = institutionData.id;

        // Get the role ID
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("id")
          .eq("role_name", formData.value.role)
          .single();

        if (roleError) throw roleError;

        // Get the free tier ID
        const { data: tierData, error: tierError } = await supabase
          .from("pricing_tiers")
          .select("id")
          .eq("tier_name", "free")
          .single();

        if (tierError) throw tierError;

        // Check if profile exists, if not create it
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          // Create the profile if it doesn't exist
          const { error: insertError } = await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              institution_id: institutionId,
              role_id: roleData.id,
              pricing_tier_id: tierData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
        } else {
          // Update existing profile
          const { error: updateError } = await supabase
            .from("user_profiles")
            .update({
              institution_id: institutionId,
              role_id: roleData.id,
              pricing_tier_id: tierData.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          if (updateError) throw updateError;
        }

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        error.value =
          err.message || "An error occurred while saving your profile";
        console.error("Onboarding error:", err);
      } finally {
        loading.value = false;
      }
    }

    return {
      formData,
      loading,
      error,
      handleSubmit,
      filteredInstitutions,
      showInstitutions,
      handleInstitutionInput,
      selectInstitution,
      searchTerm,
      isValidSelection,
    };
  },
};
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

.auth-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #002754;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #002754;
  outline: none;
}

select.form-input {
  background-color: white;
  cursor: pointer;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #002754;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #003a7a;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  margin-bottom: 20px;
  text-align: center;
  font-size: 14px;
}

.autocomplete-wrapper {
  position: relative;
}

.form-input[readonly] {
  background-color: #fff;
  cursor: pointer;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0 0 6px 6px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.autocomplete-item {
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.autocomplete-item:hover {
  background-color: #f5f5f5;
}

.form-input.is-invalid {
  border-color: #dc3545;
}

.no-results {
  padding: 10px;
  text-align: center;
  color: #666;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 6px 6px;
}
</style>
