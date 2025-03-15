<template>
  <nav v-if="user" class="main-nav">
    <div class="logo-container">
      <img src="/UVIC_Logo.png" alt="" class="logo" />
    </div>
    <div class="nav-links">
      <router-link to="/content-request">Content Request</router-link> |
      <router-link to="/dashboard">Dashboard</router-link> |
      <a href="#" @click.prevent="logout">Logout</a>
    </div>
  </nav>
  <div class="body-container">
    <router-view />
  </div>
</template>

<script>
import { useAuth } from "./stores/authStore";
import { useRouter } from "vue-router";

export default {
  setup() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    async function logout() {
      const { error } = await signOut();
      if (!error) {
        router.push("/auth");
      }
    }

    return {
      user,
      logout,
    };
  },
};
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Poppins:wght@400;700&display=swap");

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #000;
}

.main-nav {
  padding: 30px;
  text-align: center;
  background-color: #002754;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.nav-links {
  margin-top: 20px;
}

.nav-links a {
  font-weight: bold;
  color: #86819a;
  text-decoration: none;
  margin: 0 10px;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #fff;
}

.nav-links a.router-link-active {
  color: #e6eef7;
}

.body-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 150px);
  padding: 20px;
}

.logo {
  width: 125px;
}

/* Global styles for headings and paragraphs */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: "Poppins", sans-serif;
  color: #000; /* Set heading color to black */
}

p,
table,
form,
a {
  font-family: "Open Sans", sans-serif;
  color: #000; /* Set paragraph, table, form, and link color to black */
  font-size: 16px;
}

textarea {
  font-family: "Open Sans", sans-serif;
  height: 100px;
  font-size: 16px;
  line-height: 1.2;
}

table {
  text-align: left;
  width: 100%;
  border-collapse: collapse;
}

table tr:nth-child(even) {
  background-color: #fafafa;
}

table tr:nth-child(odd) {
  background-color: #ffffff;
}

table th {
  background-color: #e6e6e6; /* Set table heading background color */
}

table td,
table th {
  padding: 8px 12px; /* Add 3px padding to all sides of table cells */
}

/* Center .main-content within .body-container */
.main-content {
  width: 600px;
  padding: 50px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  word-wrap: break-word; /* Ensure long URLs wrap within the container */
  overflow-wrap: break-word; /* Ensure long URLs wrap within the container */
}

.styled-input {
  width: 100%;
  border: none;
  background-color: #f6f6f6;
  padding: 10px;
  box-sizing: border-box;
  font-size: 16px;
}

/* Add vertical spacing between form items */
form > * {
  margin-bottom: 35px;
}

button {
  padding: 15px 40px;
  border-radius: 50px;
  background-color: #002754;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 18px;
  border: none; /* Remove default border */
  outline: none; /* Remove default outline */
  box-shadow: none; /* Remove default box-shadow */
}

/* Media queries for mobile responsiveness */
@media (max-width: 768px) {
  .main-content {
    padding: 0;
    box-shadow: none;
    width: 80%;
  }

  .styled-input {
    padding: 8px;
  }

  button {
    padding: 12px 30px;
    font-size: 16px;
  }

  form > * {
    margin-bottom: 25px;
  }
}

@media (max-width: 480px) {
  .body-container {
    padding-top: 0; /* Remove padding-top on mobile devices */
  }

  .main-content {
    /* padding: 10px; */
    border-radius: 10px;
    width: 90%;
  }

  .styled-input {
    padding: 6px;
  }

  button {
    padding: 10px 20px;
    font-size: 14px;
  }

  form > * {
    margin-bottom: 20px;
  }
}
</style>
