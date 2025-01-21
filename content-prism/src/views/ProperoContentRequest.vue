<template>
  <div class="main-content">
    <h1>Content Submission Form</h1>
    <form @submit.prevent="submitContent">
      <div>
        <!-- News Article -->
        <input
          type="radio"
          id="News Article"
          value="News Article"
          v-model="formData.submissionType"
        />
        <label for="News Article">News Article/Blog</label>
        <br />
        <!-- Report -->
        <input
          type="radio"
          id="Report"
          value="Report"
          v-model="formData.submissionType"
        />
        <label for="Report">Report</label>
        <br />
        <!-- Propero Blog -->
        <input
          type="radio"
          id="Propero Blog"
          value="Propero Blog"
          v-model="formData.submissionType"
        />
        <label for="Propero Blog">Propero Blog</label>
        <br />
        <!-- LinkedIn Post -->
        <input
          type="radio"
          id="LinkedIn Post"
          value="LinkedIn Post"
          v-model="formData.submissionType"
        />
        <label for="LinkedIn Post">LinkedIn Post</label>
      </div>
      <!-- End radio buttons -->

      <!-- Conditional submission instructions -->
      <h5 v-if="formData.submissionType === 'News Article'">
        Enter the URL of a news article or blog to share on LinkedIn.
      </h5>
      <h5 v-if="formData.submissionType === 'Report'">
        Upload a report via a URL or directly via a PDF file.
      </h5>
      <h5 v-if="formData.submissionType === 'Propero Blog'">
        Upload the text for a Propero Blog (to publish on propero.ca).
      </h5>
      <h5 v-if="formData.submissionType === 'LinkedIn Post'">
        Upload the URL of someone's LinkedIn post to share on Propero's LinkedIn
        page.
      </h5>

      <!-- Begin submission elements -->
      <!-- URL -->
      <div
        v-if="
          formData.submissionType === 'News Article' ||
          formData.submissionType === 'Report' ||
          formData.submissionType === 'LinkedIn Post'
        "
      >
        <input v-model="formData.url" placeholder="URL" class="styled-input" />
      </div>

      <!-- PDF -->
      <div v-if="formData.submissionType === 'Report'">
        <label for="pdf">Upload PDF:</label>
        <input type="file" @change="handleFileUpload" id="pdf" />
      </div>

      <!-- Blog Author -->
      <div v-if="formData.submissionType === 'Propero Blog'">
        <input
          v-model="formData.author"
          placeholder="Blog Author"
          class="styled-input"
        />
      </div>

      <!-- Blog Title -->
      <div v-if="formData.submissionType === 'Propero Blog'">
        <textarea
          @input="adjustTextareaHeight($event)"
          v-model="formData.blogTitle"
          class="styled-input"
          placeholder="Blog Title"
        ></textarea>
      </div>

      <!-- Blog Text -->
      <div v-if="formData.submissionType === 'Propero Blog'">
        <textarea
          @input="adjustTextareaHeight($event)"
          v-model="formData.blog"
          class="styled-input"
          placeholder="Blog Text"
        ></textarea>
      </div>

      <!-- Notes -->
      <div>
        <textarea
          @input="adjustTextareaHeight($event)"
          v-model="formData.notes"
          placeholder="Notes (Optional)"
          class="styled-input"
        ></textarea>
      </div>

      <!-- Loading Animation -->
      <div v-if="loading" class="loading-animation">
        <div class="spinner"></div>
      </div>

      <!-- Success Message -->
      <p v-if="successMessage">{{ successMessage }}</p>

      <!-- Submit Button -->
      <button @click="submitContent" :disabled="loading">
        {{ loading ? "Submitting..." : "Submit" }}
      </button>
    </form>
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
        name: "",
        submissionType: "News Article", // Default to Article submission
        url: "",
        blog: "",
        blogTitle: "",
        notes: "",
        author: "",
        pdf: null,
        mainText: "",
      },
      successMessage: "",
      loading: false,
    };
  },
  computed: {},
  methods: {
    handleFileUpload(event) {
      this.formData.pdf = event.target.files[0];
      console.log("PDF file selected:", this.formData.pdf);
    },
    async extractTextFromPDF(file) {
      console.log("Extracting text from PDF...");
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

        // Truncate text to 99,999 characters if it exceeds 100,000 characters
        if (text.length > 100000) {
          text = text.substring(0, 99999);
        }

        return text;
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Invalid PDF structure");
      }
    },
    async uploadPDF() {
      console.log("Uploading image...");
      if (this.formData.pdf) {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const imageData = new FormData();
        imageData.append("image", this.formData.pdf);
        const response = await axios.post(
          `${baseURL}/api/propero/upload-image`,
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
    async submitContent() {
      try {
        this.loading = true; // Set loading state to true
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

        // Get the username from the cookie
        const username = Cookies.get("username");

        // Assign mainText by checking if a PDF has been uploaded and extract text, otherwise blog text is assigned
        if (this.formData.pdf) {
          console.log("Calling extraction function...");
          this.mainText = await this.extractTextFromPDF(this.formData.pdf);
        } else if (this.formData.blog) {
          this.mainText = this.formData.blog;
          this.name = this.formData.blogTitle;
        }

        // Upload image and get the URL
        const imageUrl = await this.uploadPDF();

        // Prepare JSON data
        const data = {
          name: this.name,
          submissionType: this.formData.submissionType,
          url: this.formData.url,
          notes: this.formData.notes,
          username: username,
          blogTitle: this.formData.blogTitle,
          author: this.formData.author,
          status: "New Submission",
          imageUrl: imageUrl,
          mainText: this.mainText,
        };
        // console.log("Submitting Data object:", data);

        await axios.post(`${baseURL}/api/propero/content-request`, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Set loading state to false
        this.loading = false;

        // Set the success message
        this.successMessage = `${this.formData.submissionType} submitted successfully!`;
        // Clear the success message after 3000ms
        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
      } catch (error) {
        console.error("Error submitting article:", error);
      }

      // Clear the form data
      this.formData = {
        name: "",
        submissionType: "News Article",
        url: "",
        instructions: "",
        scraperPromptID: "",
        notes: "",
        pdf: null,
        blog: "",
        mainText: "",
        blogTitle: "",
        author: "",
      };
    },
    checkLogin() {
      const username = Cookies.get("username");
      const userRole = Cookies.get("role"); // Assuming role is stored in a cookie
      if (!username) {
        this.$router.push("/login"); // Redirect to login page if not logged in
      } else {
        this.isLoggedIn = true;
        this.userRole = userRole; // Set the user role
        this.checkAccess(); // Check access based on role
      }
    },
    checkAccess() {
      // Define access rules
      const accessRules = {
        propero: ["/propero/content-request", "/propero/dashboard"],
        uvicSS: ["/content-request", "/dashboard"],
      };

      const currentPath = this.$route.path;
      const allowedPaths = accessRules[this.userRole] || [];

      if (!allowedPaths.includes(currentPath)) {
        this.$router.push("/login"); // Redirect to unauthorized page if access is denied
      }
    },
    adjustTextareaHeight(event) {
      const textarea = event.target;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    },
    adjustAllTextareas() {
      this.$nextTick(() => {
        if (this.$refs.notesTextarea) {
          this.adjustTextareaHeight({ target: this.$refs.notesTextarea });
        }
        if (this.$refs.mainTextTextarea) {
          this.adjustTextareaHeight({ target: this.$refs.mainTextTextarea });
        }
      });
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
/* Spinner Animation */
.loading-animation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #000;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
  /* End Spinner Animation */
}
</style>
