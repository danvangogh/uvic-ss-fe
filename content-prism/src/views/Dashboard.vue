<template>
  <div class="body-container">
    <div class="main-content">
      <h1>Dashboard</h1>
      <div v-if="loading">
        <p>Content is loading...</p>
      </div>
      <div v-else-if="records.length">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Content Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in records" :key="record.id">
              <td>
                <template
                  v-if="getUserFriendlyStatus(record.status) === 'Ready'"
                >
                  <router-link :to="`/record/${record.id}`">{{
                    record.name
                  }}</router-link>
                </template>
                <template v-else>
                  {{ record.name }}
                </template>
              </td>
              <td>{{ record.contentType }}</td>
              <td>{{ getUserFriendlyStatus(record.status) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>No records found.</p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      records: [],
      loading: true, // Added loading state
    };
  },
  async created() {
    try {
      console.log("Fetching records...", process.env.VUE_APP_API_BASE_URL);
      const baseURL =
        process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
      const response = await axios.get(`/api/records`);
      this.records = response.data;
      console.log("Fetched records:", this.records); // Console log the records data
    } catch (error) {
      console.error("Error fetching records:", error.message);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    getUserFriendlyStatus(status) {
      switch (status) {
        case "Uploaded to Dropbox":
          return "Ready";
        case "Approved":
          return "Approved";
        default:
          return "Processing";
      }
    },
  },
};
</script>

<style scoped>
.main-content {
  width: 80%;
}
</style>
