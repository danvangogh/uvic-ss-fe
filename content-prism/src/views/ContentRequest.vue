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
        <div class="thumbnail-container">
          <div
            v-for="type in filteredContentTypes"
            :key="type.recordId"
            class="thumbnail"
            :class="{ selected: formData.template === type.recordId }"
            @click="selectTemplate(type.recordId)"
          >
            <img :src="type.thumbnail" :alt="type.name" />
            <p>{{ type.name }}</p>
          </div>
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
    <p v-if="successMessage">{{ successMessage }}</p>
  </div>
</template>

<script>
import axios from "axios";
import Cookies from "js-cookie";
import * as pdfjsLib from "pdfjs-dist/webpack";

export default {
  data() {
    return {
      isLoggedIn: false,
      loginData: {
        username: "",
        password: "",
      },
      formData: {
        submissionType: "article", // Default to Article submission
        url: "",
        pdf: null,
        instructions: "",
        platforms: [],
        template: "",
        scraperPromptID: "",
        images: [],
      },
      contentTypes: [
        {
          name: "Listicle Carousel",
          recordId: "recXXGDxTqF6YirP7",
          thumbnail: "/listicle-carousel.png",
        },
        {
          name: "Generic Question Carousel",
          recordId: "recAj9nl0R6Vk01zW",
          thumbnail: "/generic_question_carousel.png",
        },
        {
          name: "Summary Carousel",
          recordId: "recbGyg2IBcrXzwOh",
          thumbnail: "/assets/summary-carousel.png",
        },
        {
          name: "Text-on-image",
          recordId: "recFzYcIIG6yyQGPK",
          thumbnail: "/assets/text-on-image.png",
        },
        {
          name: "Quote over image (text left)",
          recordId: "recVzxgN0BGBeLjUm",
          thumbnail: "/assets/quote-left.png",
        },
        {
          name: "Quote over image (text right)",
          recordId: "recQDBzsUDjEqwIhW",
          thumbnail: "/assets/quote-right.png",
        },
        {
          name: "Question and Answer",
          recordId: "recT5iP1egEwH5z5O",
          thumbnail: "/assets/question-answer.png",
        },
        {
          name: "Image Feature",
          recordId: "rechcwCYlQzarNwVB",
          thumbnail: "/assets/image-feature.png",
        },
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
    handleImageUpload(event) {
      this.formData.images = Array.from(event.target.files).slice(0, 3);
      console.log("Images selected:", this.formData.images);
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
        // Parse the URL and set scraperPromptID
        if (this.formData.url.includes("uvic.ca/news")) {
          this.formData.scraperPromptID = "recSH64cWbZaNErDL";
        } else if (this.formData.url.includes("uvic.ca/socialsciences")) {
          this.formData.scraperPromptID = "recIDNSSIzy70FRqt";
        } else {
          this.formData.scraperPromptID = "recitrUQgnCBlvLQd";
        }

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
          scraperPromptID: "",
          images: [],
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
          scraperPromptID: "",
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
    selectTemplate(recordId) {
      this.formData.template = recordId;
    },
    checkLogin() {
      const username = Cookies.get("username");
      if (!username) {
        this.$router.push("/login"); // Redirect to login page if not logged in
      } else {
        this.isLoggedIn = true;
      }
    },
  },
  mounted() {
    this.checkLogin();
  },
};
</script>

<style scoped>
.main-content {
  padding: 20px;
}

.styled-input {
  width: 100%;
  border: none;
  background-color: #f6f6f6;
  padding: 10px;
  margin-bottom: 10px;
}

.thumbnail-container {
  display: flex;
  flex-wrap: wrap;
}

.thumbnail {
  margin: 10px;
  cursor: pointer;
  text-align: center;
}

.thumbnail img {
  width: 100px;
  height: 100px;
  object-fit: cover;
}

.thumbnail.selected {
  border: 2px solid #007bff;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.success-message {
  color: green;
  margin-top: 10px;
}

select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>
