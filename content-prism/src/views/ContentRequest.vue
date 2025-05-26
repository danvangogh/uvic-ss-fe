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
        <label for="image">Upload Image:</label>
        <input
          type="file"
          @change="handleImageUpload"
          id="image"
          ref="imageInput"
        />
      </div>
      <div v-if="formData.image">
        <label for="imageCredit">Image Credit (name only):</label>
        <input
          type="text"
          v-model="formData.imageCredit"
          id="imageCredit"
          class="styled-input"
        />
      </div>
      <div>
        <label>Template:</label>
        <div v-if="loadingTemplates" class="loading-message">
          Loading templates...
        </div>
        <div v-else-if="templateError" class="error-message">
          {{ templateError }}
        </div>
        <div v-else class="thumbnail-container">
          <div
            v-for="template in dbTemplates"
            :key="template.id"
            class="thumbnail"
            :class="{ selected: formData.template === template.id }"
            @click="selectTemplate(template.id)"
          >
            <img
              :src="template.template_thumbnail_url || '/default-template.png'"
              :alt="template.template_name"
            />
            <p>{{ template.template_name }}</p>
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
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { supabase } from "../supabase";

export default {
  data() {
    return {
      isLoggedIn: false,
      loginData: {
        username: "",
        password: "",
      },
      formData: {
        submissionType: "article",
        url: "",
        pdf: null,
        instructions: "",
        platforms: [],
        template: "",
        scraperPromptID: "",
        image: null,
        imageCredit: "",
      },
      dbTemplates: [],
      loadingTemplates: false,
      templateError: null,
      successMessage: "",
    };
  },
  methods: {
    handleFileUpload(event) {
      this.formData.pdf = event.target.files[0];
      console.log("PDF file selected:", this.formData.pdf);
    },
    handleImageUpload(event) {
      this.formData.image = event.target.files[0];
      console.log("Image selected:", this.formData.image);
    },
    async uploadImage() {
      if (this.formData.image) {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const imageData = new FormData();
        imageData.append("image", this.formData.image);
        const response = await axios.post(
          `${baseURL}/api/upload-image`,
          imageData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return response.data.url;
      }
      return "";
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

        const username = Cookies.get("username");
        const externalSource = !this.formData.url.includes("uvic.ca");
        const imageUrl = await this.uploadImage();

        const data = {
          submissionType: this.formData.submissionType,
          url: this.formData.url,
          instructions: this.formData.instructions,
          platforms: this.formData.platforms,
          template: this.formData.template,
          scraperPromptID: this.formData.scraperPromptID,
          username: username,
          externalSource: externalSource.toString(),
          imageUrl: imageUrl,
          imageCredit: this.formData.imageCredit,
        };

        await axios.post(`${baseURL}/api/content-request`, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        this.resetForm();
        this.showSuccessMessage("Article submitted successfully!");
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

        const pdfText = await this.extractTextFromPDF(this.formData.pdf);
        const truncatedPdfText =
          pdfText.length > 100000 ? pdfText.substring(0, 100000) : pdfText;

        const username = Cookies.get("username");
        const imageUrl = await this.uploadImage();

        const data = {
          submissionType: this.formData.submissionType,
          instructions: this.formData.instructions,
          platforms: this.formData.platforms,
          template: this.formData.template,
          pdfText: truncatedPdfText,
          username: username,
          externalSource: "true",
          imageUrl: imageUrl,
          imageCredit: this.formData.imageCredit,
        };

        await axios.post(`${baseURL}/api/content-request`, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        this.resetForm();
        this.showSuccessMessage("PDF submitted successfully!");
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
        this.$router.push("/auth");
      } else {
        this.isLoggedIn = true;
      }
    },
    async fetchTemplates() {
      try {
        this.loadingTemplates = true;
        const { data, error } = await supabase.from("content_templates")
          .select(`
            id,
            template_name,
            template_thumbnail_url,
            template_content_description,
            post_type_id,
            content_template_post_types (
              content_template_post_type_name
            )
          `);

        if (error) throw error;
        this.dbTemplates = data;
      } catch (error) {
        console.error("Error fetching templates:", error);
        this.templateError = "Failed to load templates";
      } finally {
        this.loadingTemplates = false;
      }
    },
    resetForm() {
      this.formData = {
        submissionType: "article",
        url: "",
        pdf: null,
        instructions: "",
        platforms: [],
        template: "",
        scraperPromptID: "",
        image: null,
        imageCredit: "",
      };
      if (this.$refs.imageInput) {
        this.$refs.imageInput.value = "";
      }
    },
    showSuccessMessage(message) {
      this.successMessage = message;
      setTimeout(() => {
        this.successMessage = "";
      }, 3000);
    },
  },
  mounted() {
    this.checkLogin();
    this.fetchTemplates();
  },
};
</script>

<style scoped>
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
.thumbnail-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: flex-start;
  padding: 10px;
}
.thumbnail {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  cursor: pointer;
  text-align: center;
  width: 125px;
  box-sizing: border-box;
}
.thumbnail.selected {
  border-color: blue;
}
.thumbnail img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
.thumbnail p {
  font-size: 8px;
  margin: 5px 0;
  word-wrap: break-word;
}
.loading-message {
  color: #666;
  padding: 1rem;
  text-align: center;
}
.error-message {
  color: red;
  padding: 1rem;
  text-align: center;
}
.thumbnail small {
  display: block;
  font-size: 0.7em;
  color: #666;
  margin-top: 0.25rem;
  word-wrap: break-word;
}
</style>
