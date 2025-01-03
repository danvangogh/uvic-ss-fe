<template>
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <div>
        <label for="username">Username:</label>
        <input type="text" v-model="loginData.username" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" v-model="loginData.password" required />
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script>
import axios from "axios";
import Cookies from "js-cookie";

export default {
  data() {
    return {
      loginData: {
        username: "",
        password: "",
      },
    };
  },
  methods: {
    async login() {
      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const response = await axios.post(
          `${baseURL}/api/login`,
          this.loginData
        );
        if (response.data.success) {
          Cookies.set("username", response.data.username, { expires: 30 });
          Cookies.set("role", response.data.role, { expires: 30 }); // Store role in a cookie
          this.$root.username = response.data.username; // Update the username in App.vue
          this.$root.role = response.data.role; // Update the role in App.vue
          console.log("Logged in as:", response.data.username); // Log to verify username
          this.$router.push("/"); // Redirect to the home page or dashboard after login
        } else {
          alert("Invalid username or password");
        }
      } catch (error) {
        console.error("Error logging in:", error);
        alert("An error occurred during login. Please try again.");
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
</style>
