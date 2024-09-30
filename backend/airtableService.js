require("dotenv").config();
const axios = require("axios");

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_PERSONAL_ACCESS_TOKEN =
  process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

const airtableApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME.replace(
    /_/g,
    "%20"
  )}`,
  headers: {
    Authorization: `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

const airtableService = {
  async getAllRecords() {
    const response = await airtableApi.get();
    return response.data.records;
  },

  async getRecordById(id) {
    const response = await airtableApi.get(`/${id}`);
    return response.data;
  },

  async createRecord(fields) {
    const response = await airtableApi.post("", { fields });
    return response.data;
  },
};

module.exports = airtableService;
