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
    login() {
      const hardcodedUsers = [
        { username: "Daniel", password: "123" },
        { username: "Anne", password: "uvic" },
      ];

      const user = hardcodedUsers.find(
        (u) =>
          u.username === this.loginData.username &&
          u.password === this.loginData.password
      );

      if (user) {
        Cookies.set("username", user.username, { expires: 30 });
        this.$router.push("/"); // Redirect to the home page or dashboard after login
      } else {
        alert("Invalid username or password");
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
