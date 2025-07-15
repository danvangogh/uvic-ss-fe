<template>
  <div class="auth-container">
    <div class="auth-box">
      <h2>{{ isLogin ? "Login" : "Sign Up" }}</h2>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            v-model="formData.email"
            required
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            v-model="formData.password"
            required
            class="form-input"
          />
        </div>

        <div v-if="message" class="info-message">
          {{ message }}
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? "Processing..." : isLogin ? "Login" : "Sign Up" }}
        </button>

        <div class="toggle-auth">
          <p>
            {{
              isLogin ? "Don't have an account?" : "Already have an account?"
            }}
            <a href="#" @click.prevent="toggleAuth">
              {{ isLogin ? "Sign Up" : "Login" }}
            </a>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useAuth } from "../stores/authStore";
import { useRouter } from "vue-router";
import { supabase } from "../supabase";

export default {
  setup() {
    const router = useRouter();
    const { signIn, signUp } = useAuth();

    const isLogin = ref(true);
    const loading = ref(false);
    const error = ref(null);
    const message = ref(null);
    const formData = ref({
      email: "",
      password: "",
    });

    const toggleAuth = () => {
      isLogin.value = !isLogin.value;
      error.value = null;
      message.value = null;
    };

    const handleSubmit = async () => {
      loading.value = true;
      error.value = null;
      message.value = null;

      const { email, password } = formData.value;

      try {
        if (isLogin.value) {
          // Handle login
          const { data, error: authError } = await signIn(email, password);
          if (authError) throw authError;

          // Check if profile is complete before redirecting
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("institution_id, role_id")
            .eq("id", data.user.id)
            .single();

          if (profileError && profileError.code === "PGRST116") {
            // No profile row exists, redirect to onboarding
            router.push("/onboarding");
          } else if (!profile?.institution_id || !profile?.role_id) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        } else {
          // Handle signup
          const { data, error: authError } = await signUp(email, password);
          if (authError) throw authError;

          if (data.user) {
            console.log('Redirecting to /check-email after successful sign up');
            router.push('/check-email');
            // Do NOT create user_profiles row here!
          } else {
            // This branch should not be hit unless email confirmation is off
            router.push("/onboarding");
          }
        }
      } catch (err) {
        error.value = err.message || "An error occurred during authentication";
      } finally {
        loading.value = false;
      }
    };

    return {
      isLogin,
      loading,
      error,
      message,
      formData,
      toggleAuth,
      handleSubmit,
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

.info-message {
  color: #007bff; /* A different color for info messages */
  margin-bottom: 20px;
  text-align: center;
  font-size: 14px;
}

.toggle-auth {
  margin-top: 20px;
  text-align: center;
}

.toggle-auth a {
  color: #002754;
  text-decoration: none;
  font-weight: 500;
}

.toggle-auth a:hover {
  text-decoration: underline;
}
</style>
