<template>
  <div class="main-content">
    <a
      v-if="record && record.fields && record.fields['Dropbox Folder URL']"
      :href="record.fields['Dropbox Folder URL']"
      target="_blank"
      rel="noopener noreferrer"
    >
      <h3>
        {{ record.fields.Name || "Fetching article name..." }} -
        {{ formattedContentType }}
      </h3>
    </a>
    <h3 v-if="record && record.fields" style="font-weight: 300">
      <strong>Status:</strong> {{ userFriendlyStatus }}
    </h3>
    <h3 v-if="record && record.fields" style="font-weight: 300">
      <strong>Original Article URL: </strong>
      <a
        v-if="record.fields['Article URL']"
        :href="record.fields['Article URL']"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span style="font-size: 12px; display: block; line-height: 1.5">
          {{ record.fields["Article URL"] || "Fetching article name..." }}
        </span>
      </a>
    </h3>
    <div v-if="record">
      <textarea
        v-model="feedback"
        class="styled-input"
        placeholder="Enter feedback"
      ></textarea>
      <div class="buttons">
        <!-- <button @click="approveRecord" :disabled="loading">
          {{ loading ? "Approving..." : "Approve" }}
        </button> -->
        <button @click="submitFeedback" :disabled="loading">
          {{ loading ? "Submitting..." : "Submit Feedback" }}
        </button>
      </div>
    </div>
    <div
      v-if="record && record.fields && record.fields['Generic_Caption']"
      class="captions"
    >
      <h2>Sample Captions</h2>
      <h4 class="caption-platfom-title" style="margin-top: 25px">Instagram</h4>
      <p class="caption-text instagram-caption">
        {{ record && record.fields ? record.fields["Generic_Caption"] : "" }}
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
        style="
          font-style: italic;
          font-weight: 300;
          font-size: 8px;
          cursor: pointer;
        "
      >
        Copy to Clipboard
      </p>
      <h4 class="caption-platfom-title" style="margin-top: 25px">Facebook</h4>
      <p class="caption-text facebook-caption">
        {{
          record && record.fields && record.fields["Generic_Caption"]
            ? record.fields["Generic_Caption"]
            : ""
        }}
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
        style="
          font-style: italic;
          font-weight: 300;
          font-size: 8px;
          cursor: pointer;
        "
      >
        Copy to Clipboard
      </p>
      <h4 class="caption-platfom-title" style="margin-top: 25px">LinkedIn</h4>
      <p class="caption-text linkedin-caption">
        {{
          record && record.fields && record.fields["Generic_Caption"]
            ? record.fields["Generic_Caption"]
            : ""
        }}
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
        style="
          font-style: italic;
          font-weight: 300;
          font-size: 8px;
          cursor: pointer;
        "
      >
        Copy to Clipboard
      </p>
      <h4 class="caption-platfom-title" style="margin-top: 25px">X</h4>
      <p class="caption-text x-caption">
        {{
          record && record.fields && record.fields["X_Caption"]
            ? record.fields["X_Caption"]
            : ""
        }}
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
    // async approveRecord() {
    //   try {
    //     const baseURL =
    //       process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
    //     const id = this.$route.params.id;
    //     const response = await axios.patch(`${baseURL}/api/records/${id}`, {
    //       Status: "Approved",
    //     });
    //     this.record = response.data.fields;
    //     window.location.reload(); // Refresh the page after the request is made
    //   } catch (error) {
    //     console.error("Error approving record:", error.message);
    //   }
    // },
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
</style>
