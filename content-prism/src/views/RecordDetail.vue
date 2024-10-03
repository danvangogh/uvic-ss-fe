<template>
  <div class="body-container">
    <div class="main-content">
      <a
        v-if="record"
        :href="record.fields['Dropbox Folder URL']"
        target="_blank"
      >
        <h3>{{ record.fields.Name }} - {{ formattedContentType }}</h3>
      </a>
      <h3 v-if="record" style="font-weight: 300">
        <strong>Status:</strong> {{ userFriendlyStatus }}
      </h3>
      <h3 v-if="record" style="font-weight: 300">
        <strong>Original Article URL: </strong>
        <span style="font-size: 12px">{{ record.fields["Article URL"] }}</span>
      </h3>
      <div v-if="record">
        <textarea
          v-model="feedback"
          class="styled-input"
          placeholder="Enter feedback"
        ></textarea>
        <div class="buttons">
          <button @click="approveRecord">Approve</button>
          <button @click="submitFeedback">Submit Feedback</button>
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
    async approveRecord() {
      try {
        const id = this.$route.params.id;
        const response = await axios.patch(
          `http://localhost:3000/api/records/${id}`,
          { Status: "Approved" }
        );
        this.record = response.data.fields;
        console.log("Approved:", this.record);
      } catch (error) {
        console.error("Error approving record:", error.message);
      }
    },
    async submitFeedback() {
      this.$router.push({ name: "dashboard" }); // Navigate to the dashboard

      try {
        const id = this.$route.params.id;
        const response = await axios.patch(
          `http://localhost:3000/api/records/${id}`,
          { Status: "Regenerate", Revisions: this.feedback }
        );
        this.record = response.data.fields;
        this.feedback = ""; // Clear the feedback form
        console.log("Feedback submitted:", this.feedback);
      } catch (error) {
        console.error("Error submitting feedback:", error.message);
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
</style>
