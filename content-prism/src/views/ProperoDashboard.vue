<template>
  <div class="main-content">
    <h1>Approval Dashboard</h1>
    <div v-if="loading">
      <p>Content is loading...</p>
    </div>
    <table v-else-if="records.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Posting Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <router-link :to="`/propero/record/${record.id}`">
            <td>
              <strong>{{ record.fields.Content_Type }}:</strong>
              {{ record.fields.Name }}
            </td>
          </router-link>
          <td>{{ record.fields.Posting_Date }}</td>
          <td>{{ record.fields.Status }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else>No records found.</p>
  </div>
</template>

<script>
import axios from "axios";
// import Cookies from "js-cookie"; // Import Cookies

export default {
  data() {
    return {
      records: [],
      loading: true, // Added loading state
    };
  },
  async created() {
    try {
      const baseURL =
        process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
      const response = await axios.get(`${baseURL}/api/propero/records`);
      this.records = response.data.records;
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      this.loading = false;
    }
  },
  methods: {},
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
