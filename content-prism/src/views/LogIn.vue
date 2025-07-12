<template>
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <div>
        <label for="email">Email:</label>
        <input type="email" v-model="loginData.email" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" v-model="loginData.password" required />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </form>
  </div>
</template>

<script>
import { useAuth } from "../stores/authStore";
import { useRouter } from "vue-router";

export default {
  data() {
    return {
      loginData: {
        email: "",
        password: "",
      },
      error: null,
      loading: false,
    };
  },
  methods: {
    async login() {
      this.loading = true;
      this.error = null;

      const { signIn } = useAuth();
      const router = useRouter();

      try {
        const { data, error } = await signIn(
          this.loginData.email,
          this.loginData.password
        );

        if (error) throw error;

        // Redirect based on user role
        const role = data.session.user.user_metadata.role || "uvicSS";
        if (role === "propero") {
          router.push("/propero/dashboard");
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        this.error = error.message || "An error occurred during login";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.login-container h2 {
  text-align: center;
}

.login-container form {
  display: flex;
  flex-direction: column;
}

.login-container label {
  margin-bottom: 5px;
}

.login-container input {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.error {
  color: red;
  margin-bottom: 10px;
}
</style>
