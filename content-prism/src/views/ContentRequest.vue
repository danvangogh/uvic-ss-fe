<template>
  <div class="body-container">
    <div class="main-content">
      <h1>Content Request</h1>
      <form @submit.prevent="submitRequest">
        <div>
          <input
            v-model="formData.url"
            placeholder="URL"
            required
            class="styled-input"
          />
        </div>
        <div>
          <textarea
            v-model="formData.instructions"
            placeholder="Specific Instructions"
            class="styled-input"
          ></textarea>
        </div>
        <div>
          <label>Social Media Platforms:</label>
          <select v-model="formData.platforms" multiple required>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Twitter">Twitter</option>
            <option value="LinkedIn">LinkedIn</option>
          </select>
        </div>
        <div>
          <label>Template:</label>
          <select v-model="formData.template" required>
            <option
              v-for="type in contentTypes"
              :key="type.recordId"
              :value="type.recordId"
            >
              {{ type.name }}
            </option>
          </select>
        </div>
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      formData: {
        url: "",
        instructions: "",
        platforms: [],
        template: "",
      },
      contentTypes: [
        { name: "Listicle Carousel", recordId: "recXXGDxTqF6YirP7" },
        {
          name: "Generic Question Carousel Horizontal",
          recordId: "recAj9nl0R6Vk01zW",
        },
        {
          name: "Generic Question Carousel Vertical",
          recordId: "rec5CqtUYhrajZkMX",
        },
        { name: "Summary Carousel (formatted)", recordId: "recagh8RonbQnfGmF" },
        { name: "Summary Carousel (generic)", recordId: "recbGyg2IBcrXzwOh" },
        { name: "Text-on-image Single", recordId: "recFzYcIIG6yyQGPK" },
        { name: "Quote over image (text left)", recordId: "recVzxgN0BGBeLjUm" },
        {
          name: "Quote over image (text right)",
          recordId: "recQDBzsUDjEqwIhW",
        },
      ],
      successMessage: "",
    };
  },
  methods: {
    async submitRequest() {
      try {
        console.log("Before axios post: ", this.formData);
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        await axios.post(`${baseURL}/api/content-request`, this.formData);
        // Clear the form data
        this.formData = {
          url: "",
          instructions: "",
          platforms: [],
          template: "",
        };
        // Set the success message
        this.successMessage = "Content request submitted successfully!";
      } catch (error) {
        // Handle error
      }
    },
  },
};
</script>

<style>
.success-message {
  color: green;
  margin-top: 10px;
}
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f6f6f6;
  font-family: "Open Sans", sans-serif;
  font-size: 16px;
  color: #333;
}
</style>
