<template>
  <div class="main-content">
    <h1>Content Request Form</h1>
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
        <br>
<!-- Report -->
        <input
          type="radio"
          id="Report"
          value="Report"
          v-model="formData.submissionType"
        />
        <label for="Report">Report</label>
        <br>
<!-- Propero Blog -->
        <input
          type="radio"
          id="Propero Blog"
          value="Propero Blog"
          v-model="formData.submissionType"
        />
        <label for="Propero Blog">Propero Blog</label>
        <br>
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
<h5 v-if="formData.submissionType === 'News Article'">Enter the URL of a news article or blog to share on LinkedIn.</h5>
<h5 v-if="formData.submissionType === 'Report'">Upload a report via a URL or directly via a PDF file.</h5>
<h5 v-if="formData.submissionType === 'Propero Blog'">Upload the text for a Propero Blog (to publish on propero.ca).</h5>
<h5 v-if="formData.submissionType === 'LinkedIn Post'">Upload the URL of someone's LinkedIn post to share on Propero's LinkedIn page.</h5>

<!-- Begin submission elements -->
<!-- URL -->
      <div v-if="
        formData.submissionType === 'News Article' || 
        formData.submissionType === 'Report' || 
        formData.submissionType === 'LinkedIn Post'">
        <input
          v-model="formData.url"
          placeholder="URL"
          class="styled-input"
        />
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
      
      <button type="submit">Submit</button>
    </form>
    <p v-if="successMessage">{{ successMessage }}</p>
  </div>
</template>

<script>
import axios from "axios";
import Cookies from "js-cookie";

export default {
  data() {
    return {
      isLoggedIn: false,
      loginData: {
        username: "",
        password: "",
      },
      formData: {
        submissionType: "News Article", // Default to Article submission
        url: "",
        blog: "",
        blogTitle: "",
        notes: "",
        author: "",
        pdf: null,
      },
      successMessage: "",
    };
  },
  computed: {
  },
  methods: {
    handleFileUpload(event) {
      this.formData.pdf = event.target.files[0];
      console.log("PDF file selected:", this.formData.pdf);
    },
    async submitContent() {
      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

        // Get the username from the cookie
        const username = Cookies.get("username");
        
        // Prepare JSON data
        const data = {
          submissionType: this.formData.submissionType,
          url: this.formData.url,
          notes: this.formData.notes,
          username: username,
          blog: this.formData.blog,
          blogTitle: this.formData.blogTitle,
          author: this.formData.author,
          status: "New Submission",
        };
        // console.log("Submitting Data object:", data);

        await axios.post(`${baseURL}/api/propero/content-request`, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });

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
          submissionType: "News Article",
          url: "",
          instructions: "",
          scraperPromptID: "",
          notes: "",
          pdf: null,
          blog: "",
          blogTitle: "",
          author: "",
        };
        
    },
    checkLogin() {
      const username = Cookies.get("username");
      if (!username) {
        this.$router.push("/login"); // Redirect to login page if not logged in
      } else {
        this.isLoggedIn = true;
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
</style>
