const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const history = require("connect-history-api-fallback");
app.use(history());

app.use(
  cors({
    origin: BASE_URL, // Allow requests from this origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow cookies to be sent
  })
);

// Increase payload size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(express.json());
app.use(express.static(path.join(__dirname, "../content-prism/dist")));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure AWS SDK for DigitalOcean Spaces
const s3Client = new S3Client({
  region: "tor1", // DigitalOcean Spaces uses 'us-east-1' as the region
  endpoint: "https://tor1.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DIGITAL_OCEAN_SPACE_ACCESS_KEY,
    secretAccessKey: process.env.DIGITAL_OCEAN_SPACE_SECRET_KEY,
  },
});

// Handle image upload
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("No file uploaded.");
    }
    // Replace spaces with underscores in the original name
    const sanitizedFileName = file.originalname.replace(/\s+/g, "_");
    const timestamp = Date.now();
    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: `uploads/${timestamp}_${sanitizedFileName}`,
      Body: file.buffer,
      ACL: "public-read",
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const url = `https://${process.env.DO_SPACES_BUCKET}.tor1.digitaloceanspaces.com/uploads/${timestamp}_${sanitizedFileName}`;
    res.json({ url });
  } catch (error) {
    console.error("Error uploading image:", error.message);
    res.status(500).send(error.message);
  }
});

// Handle content request
app.post("/api/content-request", async (req, res) => {
  console.log("Received data:", req.body); // Log the received data for debugging
  try {
    const {
      url,
      instructions,
      platforms,
      template,
      submissionType,
      pdfText,
      scraperPromptID,
      username,
      externalSource,
      imageUrl,
    } = req.body;
    console.log("Received data:", req.body); // Log the received data for debugging
    const response = await axios.post(MAKE_WEBHOOK_SCRAPEURLADDRECORD, {
      URL: url,
      ScraperPromptID: scraperPromptID,
      Instructions: instructions,
      Platforms: platforms,
      Template: template,
      submissionType: submissionType,
      pdfText: pdfText,
      username: username,
      externalSource: externalSource,
      imageUrl: imageUrl,
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error forwarding request to Make.com:", error.message); // Log the error for debugging
    res.status(500).send(error.message);
  }
});

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
    // Extract the username from the request headers
    const username = req.headers["x-username"];
    if (!username) {
      return res.status(401).send("Unauthorized: No username provided");
    }

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
      .filter((record) => {
        // If the username is "Daniel", load all records
        if (username === "Daniel") {
          return record.fields.Status !== "Archived";
        }
        // Otherwise, filter by username
        return (
          record.fields.Status !== "Archived" && record.fields.User === username
        );
      })
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
