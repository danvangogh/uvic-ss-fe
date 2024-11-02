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
        image: null,
      },
      contentTypes: [
        {
          name: "Listicle Carousel",
          recordId: "recXXGDxTqF6YirP7",
          thumbnail: "/Listicle_Carousel.png",
        },
        {
          name: "Generic Question Carousel",
          recordId: "recAj9nl0R6Vk01zW",
          thumbnail: "/Generic_Question_Carousel.png",
        },
        {
          name: "Summary Carousel",
          recordId: "recbGyg2IBcrXzwOh",
          thumbnail: "/Summary_Carousel.png",
        },
        {
          name: "Text-on-image",
          recordId: "recFzYcIIG6yyQGPK",
          thumbnail: "/Text_on_image.png",
        },
        {
          name: "Quote over image (text left)",
          recordId: "recVzxgN0BGBeLjUm",
          thumbnail: "/Quote_over_Image_text_Left.png",
        },
        {
          name: "Quote over image (text right)",
          recordId: "recQDBzsUDjEqwIhW",
          thumbnail: "/Quote_over_Image_Text_Right.png",
        },
        {
          name: "Question and Answer",
          recordId: "recT5iP1egEwH5z5O",
          thumbnail: "/Q&A.png",
        },
        {
          name: "Image Feature",
          recordId: "rechcwCYlQzarNwVB",
          thumbnail: "/Image_Feature.png",
        },
      ],
      successMessage: "",
    };
  },
  computed: {
    filteredContentTypes() {
      if (
        (this.formData.submissionType === "pdf" && !this.formData.image) ||
        (this.formData.submissionType === "article" &&
          !this.formData.url.includes("uvic.ca") &&
          !this.formData.image)
      ) {
        return this.contentTypes.filter(
          (type) =>
            type.name === "Listicle Carousel" ||
            type.name === "Summary Carousel"
        );
      } else if (
        (this.formData.submissionType === "pdf" && this.formData.image) ||
        (this.formData.submissionType === "article" &&
          !this.formData.url.includes("uvic.ca"))
      ) {
        return this.contentTypes.filter(
          (type) =>
            type.name === "Listicle Carousel" ||
            type.name === "Summary Carousel" ||
            type.name === "Generic Question Carousel" ||
            type.name === "Text-on-image" ||
            type.name === "Quote over image (text left)" ||
            type.name === "Quote over image (text right)"
        );
      } else {
        return this.contentTypes;
      }
    },
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

        // Get the username from the cookie
        const username = Cookies.get("username");

        // Determine if the source is external
        const externalSource = !this.formData.url.includes("uvic.ca");

        // Upload image and get the URL
        const imageUrl = await this.uploadImage();

        // Prepare JSON data
        const data = {
          submissionType: this.formData.submissionType,
          url: this.formData.url,
          instructions: this.formData.instructions,
          platforms: this.formData.platforms,
          template: this.formData.template,
          scraperPromptID: this.formData.scraperPromptID,
          username: username, // Add the username to the JSON package
          externalSource: externalSource.toString(), // Set externalSource based on URL
          imageUrl: imageUrl, // Add the image URL to the JSON package
        };

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
          image: null,
        };
        // Clear the file input value
        this.$refs.imageInput.value = "";
        // Set the success message
        this.successMessage = "Article submitted successfully!";
        // Clear the success message after 3000ms
        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
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

        // Truncate pdfText if it exceeds 100,000 characters
        const truncatedPdfText =
          pdfText.length > 100000 ? pdfText.substring(0, 100000) : pdfText;

        // Get the username from the cookie
        const username = Cookies.get("username");

        // Upload image and get the URL
        const imageUrl = await this.uploadImage();

        const data = {
          submissionType: this.formData.submissionType,
          instructions: this.formData.instructions,
          platforms: this.formData.platforms,
          template: this.formData.template,
          pdfText: truncatedPdfText,
          username: username, // Add the username to the JSON package
          externalSource: "true",
          imageUrl: imageUrl, // Add the image URL to the JSON package
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
          image: null,
        };
        // Clear the file input value
        this.$refs.imageInput.value = "";
        // Set the success message
        this.successMessage = "PDF submitted successfully!";
        // Clear the success message after 3000ms
        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
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
}
.thumbnail {
  border: 1px solid #ccc;
  border-radius: 5px;
  margin: 5px;
  padding: 10px;
  cursor: pointer;
  text-align: center;
}
.thumbnail.selected {
  border-color: blue;
}
.thumbnail img {
  width: 100px;
}
.thumbnail p {
  font-size: 8px;
}
</style>
