<template>
  <div class="main-content">
    <h1>Dashboard</h1>
    <div v-if="loading">
      <p>Content is loading...</p>
    </div>
    <table v-else-if="records.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Content Type</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <td>
            <template
              v-if="
                getUserFriendlyStatus(record.status) === 'Ready' ||
                getUserFriendlyStatus(record.status) === 'Approved'
              "
            >
              <router-link :to="`/record/${record.id}`">
                {{ record.name || "Fetching article name..." }}
              </router-link>
            </template>
            <template v-else>
              {{ record.name || "Fetching article name..." }}
            </template>
          </td>
          <td>{{ record.contentType }}</td>
          <td>{{ getUserFriendlyStatus(record.status) }}</td>
          <td style="font-size: 8px">{{ formatDate(record.createdTime) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No records found.</p>
  </div>
</template>

<script>
import axios from "axios";
import Cookies from "js-cookie"; // Import Cookies

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

      // Get the username from the cookie
      const username = Cookies.get("username");
      if (!username) {
        this.$router.push("/login"); // Redirect to login page if not logged in
        return;
      }

      // Fetch records with the username in the request headers
      const response = await axios.get(`${baseURL}/api/records`, {
        headers: {
          "X-Username": username,
        },
      });
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
    formatDate(dateString) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, options);
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

/* Apply .main-content styles on smaller screens */
@media (max-width: 1023px) {
  td,
  a,
  p {
    font-size: 12px;
  }
}
</style>
