<template>
  <div class="main-content">
    <h1>Content Request</h1>
    <form @submit.prevent="submitRequest">
      <div>
        <input
          type="radio"
          id="article"
          value="article"
          v-model="formData.submissionType"
        />
        <label for="article">Article</label>
        <input
          type="radio"
          id="pdf"
          value="pdf"
          v-model="formData.submissionType"
        />
        <label for="pdf">PDF</label>
      </div>
      <div v-if="formData.submissionType === 'article'">
        <input
          v-model="formData.url"
          placeholder="Article URL"
          required
          class="styled-input"
        />
      </div>
      <div v-if="formData.submissionType === 'pdf'">
        <label for="pdf">Upload PDF:</label>
        <input type="file" @change="handleFileUpload" id="pdf" />
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
            v-for="type in filteredContentTypes"
            :key="type.recordId"
            :value="type.recordId"
          >
            {{ type.name }}
          </option>
        </select>
      </div>
      <button type="submit">Submit</button>
    </form>
    <p v-if="successMessage">{{ successMessage }}</p>
  </div>
</template>

<script>
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/webpack";

export default {
  data() {
    return {
      formData: {
        submissionType: "article", // Default to Article submission
        url: "",
        pdf: null,
        instructions: "",
        platforms: [],
        template: "",
      },
      contentTypes: [
        { name: "Listicle Carousel", recordId: "recXXGDxTqF6YirP7" },
        { name: "Generic Question Carousel", recordId: "recAj9nl0R6Vk01zW" },
        { name: "Summary Carousel", recordId: "recbGyg2IBcrXzwOh" },
        { name: "Text-on-image", recordId: "recFzYcIIG6yyQGPK" },
        { name: "Quote over image (text left)", recordId: "recVzxgN0BGBeLjUm" },
        {
          name: "Quote over image (text right)",
          recordId: "recQDBzsUDjEqwIhW",
        },
        { name: "Question and Answer", recordId: "recT5iP1egEwH5z5O" },
        { name: "Image Feature", recordId: "rechcwCYlQzarNwVB" },
      ],
      successMessage: "",
    };
  },
  computed: {
    filteredContentTypes() {
      if (this.formData.submissionType === "pdf") {
        return this.contentTypes.filter(
          (type) => type.name === "Listicle Carousel"
        );
      }
      return this.contentTypes;
    },
  },
  methods: {
    handleFileUpload(event) {
      this.formData.pdf = event.target.files[0];
      console.log("PDF file selected:", this.formData.pdf);
    },
    async submitRequest() {
      if (this.formData.submissionType === "article") {
        await this.submitArticle();
      } else if (this.formData.submissionType === "pdf") {
        await this.submitPDF();
      }
    },
    async submitArticle() {
      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        await axios.post(`${baseURL}/api/content-request`, this.formData, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        // Clear the form data
        this.formData = {
          submissionType: "article",
          url: "",
          pdf: null,
          instructions: "",
          platforms: [],
          template: "",
        };
        // Set the success message
        this.successMessage = "Article submitted successfully!";
      } catch (error) {
        console.error("Error submitting article:", error);
      }
    },
    async submitPDF() {
      try {
        if (!this.formData.pdf) {
          throw new Error("No PDF file selected");
        }

        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

        // Extract text from the PDF
        const pdfText = await this.extractTextFromPDF(this.formData.pdf);

        const data = {
          submissionType: this.formData.submissionType,
          instructions: this.formData.instructions,
          platforms: this.formData.platforms,
          template: this.formData.template,
          pdfText: pdfText,
        };

        console.log("Data before Axios.post", data);

        await axios.post(`${baseURL}/api/content-request`, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        // Clear the form data
        this.formData = {
          submissionType: "article",
          url: "",
          pdf: null,
          instructions: "",
          platforms: [],
          template: "",
        };
        // Set the success message
        this.successMessage = "PDF submitted successfully!";
      } catch (error) {
        console.error("Error submitting PDF:", error);
      }
    },
    async extractTextFromPDF(file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          text += strings.join(" ");
        }

        return text;
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Invalid PDF structure");
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
