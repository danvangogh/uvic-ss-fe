<template>
  <div class="body-container">
    <div class="main-content">
      <a v-if="record" :href="record['Dropbox Folder URL']" target="_blank">
        <h3>{{ record.Name }} - {{ contentType }}</h3>
      </a>
      <h3 v-if="record" style="font-weight: 300">
        <strong>Status:</strong> {{ userFriendlyStatus }}
      </h3>
      <h3 v-if="record" style="font-weight: 300">
        <strong>Original Article URL:</strong> {{ record["Article URL"] }}
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
      feedback: "", // Added feedback data property
      message: "", // Added message data property
    };
  },
  computed: {
    contentType() {
      return Array.isArray(this.record["Name (from Content type)"])
        ? this.record["Name (from Content type)"][0]
        : this.record["Name (from Content type)"];
    },
    userFriendlyStatus() {
      if (!this.record) return "";
      switch (this.record.Status) {
        case "Uploaded to Dropbox":
          return "Ready";
        case "Approved":
          return "Approved";
        default:
          return "Processing";
      }
    },
  },
  async created() {
    try {
      console.log("Fetching record...", this.$route.params.id);
      const id = this.$route.params.id;
      const response = await axios.get(
        `http://localhost:3000/api/records/${id}`
      );
      this.record = response.data.fields; // Assuming the record data is in the 'fields' property
      console.log("Fetched record:", this.record); // Console log the record data
    } catch (error) {
      console.error("Error fetching record:", error.message);
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
      try {
        const id = this.$route.params.id;
        const response = await axios.patch(
          `http://localhost:3000/api/records/${id}`,
          { Status: "Regenerate", Revisions: this.feedback }
        );
        this.record = response.data.fields;
        this.feedback = ""; // Clear the feedback form
        this.message =
          "Thanks for the feedback - you'll be notified soon with the new version";
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
