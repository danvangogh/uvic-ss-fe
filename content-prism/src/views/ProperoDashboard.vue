<template>
  <div class="main-content-wrapper">
    <div class="main-content">
      <h1>Dashboard</h1>
      <div v-if="loading">
        <p>Content is loading...</p>
      </div>
      <div v-else>
        <div class="filter-buttons">
          <button
            @click="setFilter('Pending Approval')"
            :class="{ active: filter === 'Pending Approval' }"
          >
            Pending Approval
          </button>
          <button
            @click="setFilter('Scheduled')"
            :class="{ active: filter === 'Scheduled' }"
          >
            Approved & Scheduled
          </button>
          <button
            @click="setFilter('In Progress')"
            :class="{ active: filter === 'In Progress' }"
          >
            In Progress
          </button>
          <button
            @click="setFilter('Archived')"
            :class="{ active: filter === 'Archived' }"
          >
            Archived
          </button>
        </div>
        <table v-if="filteredRecords.length">
          <thead>
            <tr>
              <th>Title</th>
              <th>Posting Date</th>
              <th>Working Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- <tr v-for="record in filteredRecords" :key="record.id">
            <router-link :to="`/propero/record/${record.id}`">
              <td>
                <strong>{{ record.fields.Content_Type }}:</strong>
                {{ record.fields.Name }}
              </td>
            </router-link>
            <td>{{ record.fields.Posting_Date }}</td>
            <td>{{ record.fields.Status }}</td>
          </tr> -->
            <tr v-for="record in filteredRecords" :key="record.id">
              <td>
                <strong>{{ record.fields.Content_Type }}: </strong>
                <span v-if="filter === 'In Progress'">
                  {{ record.fields.Name || "Fetching article name..." }}
                </span>
                <router-link v-else :to="`/propero/record/${record.id}`">
                  {{ record.fields.Name }}
                </router-link>
              </td>
              <td>{{ record.fields.Posting_Date || "TBD" }}</td>
              <td>{{ record.fields["Approval Status"] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>No records found.</p>
      </div>
    </div>
    <div
      v-if="filter === 'Pending Approval' || filter === 'Scheduled'"
      class="main-content airtable-calendar"
    >
      <h1>Posting Calendar</h1>
      <div>
        <iframe
          class="airtable-embed"
          src="https://airtable.com/embed/appHhE7IIvFQ5G3XT/shrN3WjkohJImYMLz?viewControls=off"
          frameborder="0"
          onmousewheel=""
          width="100%"
          height="533"
          style="background: transparent; border: 1px solid #ccc"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      records: [],
      loading: true,
      filter: "Pending Approval", // Default filter
    };
  },
  computed: {
    filteredRecords() {
      if (this.filter === "In Progress") {
        return this.records.filter(
          (record) => record.fields["Approval Status"] === "In Progress"
        );
      } else if (this.filter === "Pending Approval") {
        return this.records.filter(
          (record) => record.fields["Approval Status"] === "Pending Approval"
        );
      } else if (this.filter === "Scheduled") {
        return this.records.filter(
          (record) =>
            record.fields.Status === "Scheduled" &&
            record.fields["Approval Status"] === "Approved"
        );
      } else if (this.filter === "Archived") {
        return this.records.filter(
          (record) =>
            record.fields.Status === "Posted" ||
            record.fields.Status === "Archived"
        );
      } else {
        return this.records; // Default return value
      }
    },
  },
  methods: {
    setFilter(filter) {
      this.filter = filter;
      console.log("Filter set to:", filter);
    },
    async fetchRecords() {
      this.loading = true;
      try {
        const baseURL =
          process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
        const response = await axios.get(`${baseURL}/api/propero/records`);
        this.records = response.data.records;
      } catch (error) {
        console.error("Error fetching records:", error);
      } finally {
        this.loading = false;
      }
    },
  },
  created() {
    this.fetchRecords();
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

.main-content {
  padding: 20px;
  margin-bottom: 5%;
}

.filter-buttons {
  margin-bottom: 20px;
}

.filter-buttons button {
  margin-right: 10px;
  background-color: #ffffff;
  border: 1px solid #333;
  padding: 5px 10px;
  border-radius: 3px;
  color: #333;
  font-size: 12px;
  font-weight: 400;
}

.filter-buttons button.active {
  background-color: #f3f3f3;
}

.filter-buttons button:hover {
  background-color: #f3f3f3;
}

.main-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
</style>
