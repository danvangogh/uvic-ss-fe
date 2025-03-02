<template>
  <div v-if="record && record.fields" class="main-content">
    <div class="table-captions-container">
      <div class="table-container">
        <h2>Post Info</h2>
        <table v-if="record && record.fields" class="styled-table">
          <thead>
            <tr>
              <td>Name</td>
              <a
                v-if="
                  record && record.fields && record.fields['Dropbox Folder URL']
                "
                :href="record.fields['Dropbox Folder URL']"
                target="_blank"
                rel="noopener noreferrer"
              >
                <td v-if="record && record.fields">
                  {{ record.fields.Name || "Fetching article name..." }}
                </td>
              </a>
            </tr>
            <tr>
              <td>Content Format</td>
              <td v-if="record && record.fields">
                {{ formattedContentType || "Fetching content type..." }}
              </td>
            </tr>
            <tr v-if="record.fields['Article URL']">
              <td>Source Content</td>
              <a
                :href="record.fields['Article URL']"
                target="_blank"
                rel="noopener noreferrer"
              >
                <td v-if="record && record.fields">
                  {{
                    record.fields["Article URL"] || "Fetching article source..."
                  }}
                </td>
              </a>
            </tr>
            <tr>
              <td>Status</td>
              <td v-if="record && record.fields">
                {{ userFriendlyStatus || "Fetching Status..." }}
              </td>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <!-- Captions -->
      <div class="captions-container" v-if="record && record.fields">
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

    <!-- Edit text fields -->
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

    <div v-if="record" style="margin-top: 25px">
      <textarea
        v-model="feedback"
        class="styled-input"
        placeholder="General feedback"
      ></textarea>
      <div class="buttons">
        <button
          v-if="record && record.fields"
          @click="submitFeedback"
          :disabled="loading"
        >
          {{ loading ? "Submitting..." : "Submit Feedback" }}
        </button>
      </div>
    </div>
    <p v-if="message">{{ message }}</p>
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
        "Summary Carousel": {
          P1_A: true,
          P1_B: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        TextOnImage: {
          P1_A: true,
        },
        QuoteOverImage: {
          P1_A: true,
          P1_B: true,
        },
        QA: {
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
        ImageFeature: {
          P1_A: true,
          P2_A: true,
          P3_A: true,
          P4_A: true,
          P5_A: true,
        },
        GenericVideoFeature: {
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
      this.$router.push({ name: "dashboard" }); // Navigate to the dashboard

      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const id = this.$route.params.id;
        const response = await axios.patch(`${baseURL}/api/records/${id}`, {
          Status: "Regenerate",
          Revisions: this.feedback,
        });
        this.record = response.data.fields;
        this.feedback = ""; // Clear the feedback form
        console.log("Feedback submitted:", this.feedback);
      } catch (error) {
        console.error("Error submitting feedback:", error.message);
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
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

.table-captions-container {
  display: flex;
  justify-content: space-between;
}

.captions-container {
  width: 80%;
  background-color: #f7f7f7;
  padding: 25px;
}

.captions-container h2 {
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
  padding: 10px;
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
</style>
