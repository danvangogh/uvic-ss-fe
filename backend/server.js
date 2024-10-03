require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const history = require("connect-history-api-fallback");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(
  cors({
    origin: BASE_URL, // Allow requests from this origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow cookies to be sent
  })
);

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "../content-prism/dist")));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const MAKE_WEBHOOK_SCRAPEURLADDRECORD =
  process.env.MAKE_WEBHOOK_SCRAPEURLADDRECORD;

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

// API Routes

app.get("/api/records", async (req, res) => {
  console.log("Fetching records...", req.body);
  try {
    let allRecords = [];
    let offset = null;

    do {
      const response = await airtableApi.get("", {
        params: {
          offset: offset,
        },
      });
      allRecords = allRecords.concat(response.data.records);
      offset = response.data.offset;
    } while (offset);

    const records = allRecords
      .filter((record) => record.fields.Status !== "Archived") // Filter out archived records
      .map((record) => ({
        id: record.id,
        name: record.fields.Name,
        status: record.fields.Status,
        contentType: Array.isArray(record.fields["Name (from Content type)"])
          ? record.fields["Name (from Content type)"][0]
          : record.fields["Name (from Content type)"], // Ensure contentType is a string
        createdTime: record.createdTime, // Include createdTime for sorting
      }))
      .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime)); // Sort by most recent

    res.json(records);
  } catch (error) {
    console.error("Error fetching records:", error.message); // Log the error message
    console.error(
      "Error details:",
      error.response ? error.response.data : error
    ); // Log detailed error information
    res.status(500).send(error.message);
  }
});

app.get("/api/records/:id", async (req, res) => {
  try {
    const response = await airtableApi.get(`/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching record:", error.message);
    res.status(500).send(error.message);
  }
});

app.patch("/api/records/:id", async (req, res) => {
  try {
    const recordId = req.params.id;
    const updateData = req.body;
    const response = await airtableApi.patch(`/${recordId}`, {
      fields: updateData,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error updating record:", error.message);
    res.status(500).send(error.message);
  }
});

app.post("/api/content-request", async (req, res) => {
  try {
    const { url, instructions, platforms, template } = req.body;
    console.log("Received data:", req.body); // Log the received data for debugging
    const response = await axios.post(MAKE_WEBHOOK_SCRAPEURLADDRECORD, {
      URL: url,
      Instructions: instructions,
      Platforms: platforms,
      Template: template,
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error forwarding request to Make.com:", error.message); // Log the error for debugging
    res.status(500).send(error.message);
  }
});

app.use(history());
