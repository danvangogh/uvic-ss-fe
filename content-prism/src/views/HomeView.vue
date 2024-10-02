<template>
  <div class="home-container">
    <h1>Welcome to the Prism of Content</h1>
    <p>Make a content request to get started.</p>
  </div>
</template>

<script>
export default {
  name: "HomeView",
};
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* Align content towards the top */
  align-items: center;
  height: 100vh;
  text-align: center;
  padding-top: 20vh; /* Add padding to position the content lower */
}

h1 {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}

p {
  font-size: 1.2em;
}
</style>
