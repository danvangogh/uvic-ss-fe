<template>
  <div class="main-content">
    <div v-if="loading">Loading...</div>
    <div v-else-if="record">
      <h2>{{ record?.fields?.Name || "Fetching article name..." }}</h2>
      <h6 v-if="record?.fields" style="font-weight: 300; margin: 0">
        Status: {{ record?.fields?.Status || "Fetching Status..." }}
      </h6>
      <h6 v-if="record?.fields" style="font-weight: 300; margin-top: 0">
        Scheduled for:
        {{ record?.fields?.Posting_Date || "Fetching Status..." }}
      </h6>
      <button
        v-if="record?.fields?.['Preview_Link']"
        class="propero-preview-button"
        @click="openPreviewLink"
      >
        Content Preview
      </button>

      <!-- Caption -->
      <div
        v-if="
          record?.fields?.Content_Type !== 'Propero Blog' &&
          record?.fields?.Content_Type !== 'Email Newsletter'
        "
      >
        <h4 style="font-weight: 300; margin-bottom: 0">
          <strong>Caption for LinkedIn: </strong>
        </h4>
        <textarea
          @input="adjustTextareaHeight($event)"
          v-model="caption"
          class="styled-input"
          placeholder=""
          ref="mainTextTextarea"
        ></textarea>
      </div>
      <!-- End Caption -->

      <!-- Text -->
      <div v-if="record?.fields?.Main_Text">
        <h4 style="font-weight: 300; margin-bottom: 0">
          <strong>Text: </strong>
        </h4>
        <textarea
          @input="adjustTextareaHeight($event)"
          v-model="mainText"
          class="styled-input"
          placeholder=""
          ref="mainTextTextarea"
        ></textarea>
      </div>
      <!-- End Text -->
       <!-- Notes/Feedback -->
      <h4 v-if="record?.fields" style="font-weight: 300; margin-bottom: 0">
        <strong>Notes/Feedback: </strong>
      </h4>
      <textarea
        @input="adjustTextareaHeight($event)"
        v-model="notes"
        class="styled-input"
        placeholder="Enter feedback"
        ref="notesTextarea"
      ></textarea>
      <!-- End Notes/Feedback -->

      <!-- Submit Button -->
      <div class="buttons">
        <button @click="submitFeedback" :disabled="loading">
          {{ loading ? "Submitting..." : "Submit Feedback" }}
        </button>
        <button @click="submitApproval" :disabled="loading">
          {{ loading ? "Submitting..." : "Approve" }}
        </button>
      </div>
      <!-- End Submit Button -->

      <div v-if="record?.fields?.['Generic_Caption']" class="captions">
        <!-- Display captions or other record details here -->
      </div>
    </div>
    <div v-else>
      <p>Error loading record. Please try again later.</p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      record: null,
      notes: "", // Initialize notes as an empty string
      mainText: "",
      caption: "",
      loading: true, // Added loading state
    };
  },
  async created() {
    try {
      const baseURL =
        process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
      const recordId = this.$route.params.id; // Assuming you're using Vue Router
      const response = await axios.get(
        `${baseURL}/api/propero/records/${recordId}`
      );
      this.record = response.data;
      this.notes = this.record.fields.Notes || ""; // Set notes to record.fields.Notes
      this.mainText = this.record.fields["Main_Text"] || ""; // Set mainText to record.fields.Main_Text
      this.caption = this.record.fields["Caption"] || ""; // Set caption to record.fields.Caption
      console.log("Fetched record:", this.record); // Console log the record data
      this.$nextTick(() => {
        this.adjustAllTextareas();
      });
    } catch (error) {
      console.error("Error fetching record:", error.message);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    openPreviewLink() {
      if (this.record?.fields?.["Preview_Link"]) {
        window.open(this.record.fields["Preview_Link"], "_blank");
      }
    },
    async submitFeedback() {
      this.$router.push({ name: "properoDashboard" }); // Navigate to the dashboard
      try {
        this.loading = true; // Set loading state to true
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const id = this.$route.params.id;
        const response = await axios.patch(
          `${baseURL}/api/propero/records/${id}`,
          {
            Status: "Pending Revision",
            Notes: this.notes,
            Main_Text: this.mainText,
            Caption: this.caption,
          }
        );
        this.record = response.data;
        this.notes = ""; // Clear the feedback form
        this.mainText = ""; // Clear the main text form
        console.log("Feedback submitted:", this.notes);
        this.$router.push({ name: "properoDashboard" }); // Navigate to the dashboard
      } catch (error) {
        console.error("Error submitting feedback:", error.message);
      } finally {
        this.loading = false; // Set loading state to false
      }
    },
    async submitApproval() {
      this.$router.push({ name: "properoDashboard" }); // Navigate to the dashboard
      try {
        this.loading = true; // Set loading state to true
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const id = this.$route.params.id;
        const response = await axios.patch(
          `${baseURL}/api/propero/records/${id}`,
          {
            Status: "Approved",
            Notes: this.notes,
            Main_Text: this.mainText,
            Caption: this.caption,
          }
        );
        this.record = response.data;
        this.notes = ""; // Clear the feedback form
        this.mainText = ""; // Clear the main text form
        console.log("Feedback submitted:", this.notes);
        this.$router.push({ name: "properoDashboard" }); // Navigate to the dashboard
      } catch (error) {
        console.error("Error submitting feedback:", error.message);
      } finally {
        this.loading = false; // Set loading state to false
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
};
</script>

<style scoped>
.buttons {
  padding: 25px 0;
}

.buttons button:first-child {
  float: right;
  background-color: #ae5c5c;
}

.propero-preview-button {
  padding: 5px 15px;
  font-size: 14px;
}

.styled-input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none; /* Prevent manual resizing */
}
</style>
