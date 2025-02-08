<template>
  <div class="main-content-wrapper">
    <div class="main-content">
      <h1>Reports</h1>
      <table>
        <thead>
          <tr>
            <th>Report Name</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id">
            <td>
              <a :href="report.url" target="_blank" style="color: #204780;">{{ report.name }}</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "ProperoReports",
  data() {
    return {
      reports: [],
    };
  },
  methods: {
    async loadReports() {
      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const response = await axios.get(`${baseURL}/api/propero/records`, {
          params: {
            tableId: 'tblDq8HRg6JF88OFH'
          }
        });
        this.reports = response.data.records.map(record => ({
          id: record.id,
          name: record.fields.Name,
          url: record.fields.URL
        }));
      } catch (error) {
        console.error("Error loading reports:", error);
      }
    }
  },
  created() {
    this.loadReports();
  },
};
</script>

<style scoped>
.main-content-wrapper {
  padding: 20px;
}

.main-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #f4f4f4;
}

a {
  color: #007bff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>