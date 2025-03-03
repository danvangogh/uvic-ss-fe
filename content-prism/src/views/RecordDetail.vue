<template>
  <div v-if="loading" class="loading-container">
    <div class="spinner"></div>
  </div>
  <div v-else-if="record && record.fields" class="main-content">
    <!-- ImageryContent Preview -->
    <div v-if="isGeneratingImagery" class="generating-message">
      Imagery is generating. This will take less than a minute for images, and
      less than 5 minutes for video. Please come back soon and refresh the page.
    </div>
    <div v-else>
      <div class="imagery-container">
        <div class="imagery-preview">
          <img
            v-for="(src, index) in pngUrls"
            :key="index"
            :src="src"
            alt="Thumbnail"
            class="thumbnail"
            @click="openLightbox(index)"
          />
        </div>
        <a
          :href="record.fields['Dropbox Folder URL']"
          target="_blank"
          rel="noopener noreferrer"
          ><span class="cta-span">Go to Dropbox</span></a
        >
      </div>

      <!-- Lightbox -->
      <div v-if="isLightboxOpen" class="lightbox" @click="closeLightbox">
        <template v-if="record.fields.Video">
          <video controls class="lightbox-video" @click.stop>
            <source :src="record.fields.Video" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </template>
        <template v-else>
          <img
            :src="lightboxImage"
            alt="Full-size image"
            class="lightbox-image"
          />
        </template>
      </div>
      <!-- End Lightbox -->

      <!-- Container for Post Info & Captions -->
      <div class="table-captions-container">
        <!-- Post Info -->
        <div class="info-table-container section-card">
          <h2>Post Info</h2>
          <table
            v-if="record && record.fields"
            class="styled-table table-row-small-font"
          >
            <tr>
              <td>Name</td>
              <td v-if="record && record.fields">
                <a
                  v-if="record.fields['Dropbox Folder URL']"
                  :href="record.fields['Dropbox Folder URL']"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ record.fields.Name || "Fetching article name..." }}
                </a>
              </td>
            </tr>
            <tr>
              <td>Template</td>
              <td v-if="record && record.fields">
                {{ formattedContentType || "Fetching content type..." }}
              </td>
            </tr>
            <tr v-if="record.fields['Article URL']">
              <td>Source</td>
              <td v-if="record && record.fields">
                <a
                  :href="record.fields['Article URL']"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{
                    record.fields["Article URL"] || "Fetching article source..."
                  }}
                </a>
              </td>
            </tr>
            <tr>
              <td>Status</td>
              <td v-if="record && record.fields">
                {{ userFriendlyStatus || "Fetching Status..." }}
              </td>
            </tr>
            <tbody></tbody>
          </table>
        </div>

        <!-- Captions -->
        <div
          class="captions-container section-card"
          v-if="record && record.fields"
        >
          <h2>Post Captions</h2>
          <div class="caption-platform-selection">
            <h4
              class="caption-platform"
              @click="selectedPlatform = 'Instagram'"
              :class="{ active: selectedPlatform === 'Instagram' }"
            >
              Instagram
            </h4>
            <h4
              class="caption-platform"
              @click="selectedPlatform = 'Facebook'"
              :class="{ active: selectedPlatform === 'Facebook' }"
            >
              Facebook
            </h4>
            <h4
              class="caption-platform"
              @click="selectedPlatform = 'LinkedIn'"
              :class="{ active: selectedPlatform === 'LinkedIn' }"
            >
              LinkedIn
            </h4>
            <h4
              class="caption-platform"
              @click="selectedPlatform = 'X'"
              :class="{ active: selectedPlatform === 'X' }"
            >
              X
            </h4>
          </div>

          <p
            v-if="record && record.fields && selectedPlatform === 'Instagram'"
            class="caption-text instagram-caption"
          >
            {{ record.fields["Generic_Caption"] || "" }}
            <span
              v-if="
                record.fields['Featured Image'] && record.fields['Image_Credit']
              "
            >
              <br />
              Image Credit: {{ record.fields["Image_Credit"] }}
            </span>
            <br />
            <span
              v-if="
                record.fields['Origin Content Type'] === 'article' &&
                record.fields['Article URL']
              "
            >
              Read the full article at our link in bio.
            </span>
          </p>
          <p
            @click="copyToClipboard('instagram-caption')"
            v-if="selectedPlatform === 'Instagram'"
            style="
              font-style: italic;
              font-weight: 300;
              font-size: 8px;
              cursor: pointer;
            "
          >
            Copy to Clipboard
          </p>

          <p
            v-if="record && record.fields && selectedPlatform === 'Facebook'"
            class="caption-text facebook-caption"
          >
            {{ record.fields["Generic_Caption"] || "" }}
            <span
              v-if="
                record.fields['Featured Image'] && record.fields['Image_Credit']
              "
            >
              <br />
              Image Credit: {{ record.fields["Image_Credit"] }}
            </span>
            <br />
            <span
              v-if="
                record.fields['Origin Content Type'] === 'article' &&
                record.fields['Article URL']
              "
            >
              Read the full article at
              {{ record.fields["Article URL"] }}
            </span>
          </p>
          <p
            @click="copyToClipboard('facebook-caption')"
            v-if="selectedPlatform === 'Facebook'"
            style="
              font-style: italic;
              font-weight: 300;
              font-size: 8px;
              cursor: pointer;
            "
          >
            Copy to Clipboard
          </p>

          <p
            v-if="record && record.fields && selectedPlatform === 'LinkedIn'"
            class="caption-text linkedin-caption"
          >
            {{ record.fields["Generic_Caption"] || "" }}
            <span
              v-if="
                record.fields['Featured Image'] && record.fields['Image_Credit']
              "
            >
              <br />
              Image Credit: {{ record.fields["Image_Credit"] }}
            </span>
            <br />
            <span
              v-if="
                record.fields['Origin Content Type'] === 'article' &&
                record.fields['Article URL']
              "
            >
              Read the full article at
              {{ record.fields["Article URL"] }}
            </span>
          </p>
          <p
            @click="copyToClipboard('linkedin-caption')"
            v-if="selectedPlatform === 'LinkedIn'"
            style="
              font-style: italic;
              font-weight: 300;
              font-size: 8px;
              cursor: pointer;
            "
          >
            Copy to Clipboard
          </p>

          <p
            v-if="record && record.fields && selectedPlatform === 'X'"
            class="caption-text x-caption"
          >
            {{ record.fields["X_Caption"] || "" }}
            <span
              v-if="
                record.fields['Featured Image'] && record.fields['Image_Credit']
              "
            >
              <br />
              Image Credit: {{ record.fields["Image_Credit"] }}
            </span>
            <span
              v-if="
                record.fields['Origin Content Type'] === 'article' &&
                record.fields['Article URL']
              "
              >. Full article:
              {{ record.fields["Article URL"] }}
            </span>
          </p>
          <p
            @click="copyToClipboard('x-caption')"
            v-if="selectedPlatform === 'X'"
            style="
              font-style: italic;
              font-weight: 300;
              font-size: 8px;
              cursor: pointer;
            "
          >
            Copy to Clipboard
          </p>
        </div>
      </div>
      <!-- End Captions -->

      <!-- Edit Template text fields -->
      <div class="section-card">
        <h2>Template Text</h2>
        <div class="edit-text-field-container" v-if="record && record.fields">
          <div
            v-for="(fields, key) in templateSchema[
              record.fields['Name (from Content type)'][0]
            ]"
            :key="key"
            class="edit-text-field"
          >
            <h5>{{ key }}</h5>
            <textarea
              :name="key"
              :id="key"
              v-model="record.fields[key]"
              class="styled-input"
            ></textarea>
          </div>
        </div>
      </div>

      <div v-if="record" style="margin-top: 25px">
        <!-- Feedback removed -->
        <!-- <textarea
          v-model="feedback"
          class="styled-input"
          placeholder="General feedback"
        ></textarea> -->
        <div class="buttons">
          <button
            v-if="record && record.fields"
            @click="submitFeedback"
            :disabled="loading"
          >
            {{ loading ? "Submitting..." : "Save & Re-Generate Imagery" }}
          </button>
        </div>
      </div>
      <p v-if="message">{{ message }}</p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      record: null,
      feedback: "",
      message: "",
      loading: true, // Added loading state
      selectedPlatform: "Instagram", // Default selected platform
      isLightboxOpen: false,
      lightboxImage: "",
      lightboxIndex: 0,
      templateSchema: {
        "Listicle Carousel": {
          P1_A: true,
          P1_B: true,
          P2_A: true,
          P2_B: true,
          P3_A: true,
          P3_B: true,
          P4_A: true,
          P4_B: true,
          P5_A: true,
          P5_B: true,
        },
        "Generic Question Carousel": {
          P1_A: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        "Question Carousel (no page count)": {
          P1_A: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        "Summary Carousel": {
          P1_A: true,
          P1_B: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        "Text-on-image": {
          P1_A: true,
        },
        "Quote over image (text left)": {
          P1_A: true,
          P1_B: true,
        },
        "Quote over image (text right)": {
          P1_A: true,
          P1_B: true,
        },
        "Question and Answer": {
          P1_A: true,
          P1_B: true,
          P2_A: true,
          P3_A: true,
          P3_B: true,
          P4_A: true,
          P4_B: true,
          P5_A: true,
          P5_B: true,
        },
        "Image Feature": {
          P1_A: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        "Generic Video Feature (1 image)": {
          P1_A: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
        },
      },
    };
  },
  computed: {
    userFriendlyStatus() {
      if (!this.record) return "";
      switch (this.record.fields.Status) {
        case "Uploaded to Dropbox":
          return "Ready";
        case "Approved":
          return "Approved";
        case "Generating Imagery":
        case "Imagery Generated":
        case "Uploading to Dropbox":
          return "Generating Imagery";
        default:
          return "Processing";
      }
    },
    formattedContentType() {
      if (this.record && this.record.fields["Name (from Content type)"]) {
        return this.record.fields["Name (from Content type)"].join(", ");
      }
      return "";
    },
    pngUrls() {
      if (!this.record || !this.record.fields) return [];
      return Array.from(
        { length: 6 },
        (_, i) => this.record.fields[`PNG${i + 1}`]
      ).filter(Boolean);
    },
    isGeneratingImagery() {
      return (
        this.record &&
        this.record.fields &&
        [
          "Generating Imagery",
          "Imagery Generated",
          "Uploading to Dropbox",
        ].includes(this.record.fields.Status)
      );
    },
  },
  async created() {
    try {
      const baseURL =
        process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
      const recordId = this.$route.params.id; // Assuming you're using Vue Router
      const response = await axios.get(`${baseURL}/api/records/${recordId}`);
      this.record = response.data;
      console.log("Fetched record:", this.record); // Console log the record data
    } catch (error) {
      console.error("Error fetching record:", error.message);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async submitFeedback() {
      // Navigate to the dashboard
      this.$router.push({ name: "dashboard" });

      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const id = this.$route.params.id;

        // Send request to the specified URL
        console.log("Sending Generate Imagery to Make.com");
        await axios.post(
          "https://hook.us1.make.com/nhtd989jky96b5e08ke64rv5po657e8m",
          {
            recordId: id,
          }
        );

        // Construct the payload with hard-coded values
        const payload = {
          P1_A: this.record.fields.P1_A,
          P1_B: this.record.fields.P1_B,
          P2_A: this.record.fields.P2_A,
          P2_B: this.record.fields.P2_B,
          P3_A: this.record.fields.P3_A,
          P3_B: this.record.fields.P3_B,
          P4_A: this.record.fields.P4_A,
          P4_B: this.record.fields.P4_B,
          P5_A: this.record.fields.P5_A,
          P5_B: this.record.fields.P5_B,
        };
        console.log("Payload:", payload);
        const response = await axios.patch(
          `${baseURL}/api/records/${id}`,
          payload
        );
        this.record = response.data.fields;
        // this.feedback = ""; // Clear the feedback form
      } catch (error) {
        console.error("Error saving:", error.message);
      }
    },
    copyToClipboard(className) {
      const element = document.querySelector(`.${className}`);
      if (element) {
        const text = element.innerText;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            this.message = "Text copied to clipboard!";
            setTimeout(() => {
              this.message = "";
            }, 1000); // Clear the message after 3 seconds
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
            this.message = "Failed to copy text.";
            setTimeout(() => {
              this.message = "";
            }, 1000); // Clear the message after 3 seconds
          });
      } else {
        console.error(`Element with class '${className}' not found.`);
        this.message = "Failed to copy text.";
        setTimeout(() => {
          this.message = "";
        }, 1000); // Clear the message after 3 seconds
      }
    },
    openLightbox(index) {
      this.lightboxIndex = index;
      this.lightboxImage = this.pngUrls[index];
      this.isLightboxOpen = true;
      window.addEventListener("keydown", this.handleKeydown);
    },
    closeLightbox() {
      this.isLightboxOpen = false;
      this.lightboxImage = "";
      window.removeEventListener("keydown", this.handleKeydown);
    },
    handleKeydown(event) {
      if (event.key === "ArrowRight") {
        this.nextImage();
      } else if (event.key === "ArrowLeft") {
        this.prevImage();
      } else if (event.key === "Escape") {
        this.closeLightbox();
      }
    },
    nextImage() {
      if (this.lightboxIndex < this.pngUrls.length - 1) {
        this.lightboxIndex++;
      } else {
        this.lightboxIndex = 0; // Loop back to the first image
      }
      this.lightboxImage = this.pngUrls[this.lightboxIndex];
    },
    prevImage() {
      if (this.lightboxIndex > 0) {
        this.lightboxIndex--;
      } else {
        this.lightboxIndex = this.pngUrls.length - 1; // Loop back to the last image
      }
      this.lightboxImage = this.pngUrls[this.lightboxIndex];
    },
  },
};
</script>

<style scoped>
/* Apply .main-content styles only on desktop screens */
@media (min-width: 1024px) {
  .main-content {
    width: 80%;
    max-width: 1200px;
  }
}

.section-card {
  margin-top: 25px;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  word-wrap: break-word; /* Ensure long URLs wrap within the container */
  overflow-wrap: break-word; /* Ensure long URLs wrap within the container */
}

.buttons {
  padding: 25px 0;
}

.buttons button:first-child {
  margin-right: 25px;
}

.caption-platfom-title {
  line-height: 1.2;
  margin: 0;
  padding: 0;
}

.caption-text {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

.table-captions-container {
  display: flex;
  gap: 25px;
}

.info-table-container,
.captions-container {
  flex: 1; /* Ensure equal width */
  overflow: hidden;
}

td a {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
  word-break: break-all;
}

.table-row-small-font a,
tr {
  font-size: 14px;
}

table {
  width: 20px !important;
}

h2 {
  margin: 0;
  padding: 0;
  line-height: 1;
}

.caption-platform-selection {
  display: flex;
  gap: 25px;
}

.caption-platform {
  cursor: pointer;
  opacity: 0.7;
  font-weight: 400;
}

.caption-platform:hover {
  font-weight: bold;
  text-decoration: underline;
  opacity: 1;
}

.caption-platform.active {
  font-weight: bold;
  text-decoration: underline;
  opacity: 1;
}

.edit-text-field-container {
  margin-top: 25px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.edit-text-field {
  flex: 1 1 calc(50% - 20px); /* Two columns with a gap */
  display: flex;
  flex-direction: column;
}

.edit-text-field textarea {
  margin-top: 5px;
  padding: 5px;
  resize: none;
  font-size: 12px;
  line-height: 1.3;
  height: 50px;
}

.edit-text-field h5 {
  margin: 0;
  padding: 0;
  line-height: 1;
}

.imagery-container {
  border-bottom: #afafaf 1px solid;
  padding-bottom: 15px;
}

.imagery-preview {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.thumbnail {
  width: 75px;
  height: auto;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4); /* Subtle box shadow */
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
}

.lightbox-video {
  max-width: 80%;
  max-height: 650px;
  height: 80%;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
