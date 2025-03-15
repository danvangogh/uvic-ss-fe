const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");
const { PDFDocument, rgb } = require("pdf-lib");
const FormData = require("form-data");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const BASE_SERVER_URL = process.env.BASE_SERVER_URL;
const history = require("connect-history-api-fallback");
app.use(history());

app.use(
  cors({
    origin: BASE_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
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
  region: "tor1",
  endpoint: "https://tor1.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DIGITAL_OCEAN_SPACE_ACCESS_KEY,
    secretAccessKey: process.env.DIGITAL_OCEAN_SPACE_SECRET_KEY,
  },
});

// Include timestamps in all console.log statements
const originalLog = console.log;
console.log = (...args) => {
  const now = new Date();
  const formattedTimestamp = now.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  originalLog(`[${formattedTimestamp}]`, ...args);
};

// Handle image upload
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  console.log("Received image upload request:", req.file);
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("No file uploaded.");
    }
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
  console.log("Received data in /api/content-request/:", req.body);
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
      imageCredit,
    } = req.body;

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
      imageCredit: imageCredit,
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error forwarding request to Make.com:", error.message);
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

// UVIC SS API Routes
app.get("/api/records", async (req, res) => {
  console.log("Fetching records in /api/records...", req.body);
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
          : record.fields["Name (from Content type)"],
        createdTime: record.createdTime,
      }))
      .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    console.log("Sorted records in /api/records", records);
    res.json(records);
  } catch (error) {
    console.error("Error fetching records:", error.message);
    console.error(
      "Error details:",
      error.response ? error.response.data : error
    );
    res.status(500).send(error.message);
  }
});

app.get("/api/records/:id", async (req, res) => {
  console.log("Fetching record in /api/records/:id...", req.params);
  try {
    const response = await airtableApi.get(`/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching record:", error.message);
    res.status(500).send(error.message);
  }
});

app.patch("/api/records/:id", async (req, res) => {
  console.log("Updating record in /api/records/:id...", req.params);
  console.log("Received data in /api/records/:id...", req.body);
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

// UVIC PDF Parse
app.post("/api/uvic/pdf-parse", async (req, res) => {
  console.log("Received data in /api/uvic/pdf-parse:", req.body);
  try {
    // Check if the modification with the name p6_a has any text
    const p6_a_modification = req.body.modifications?.find(
      (modification) => modification.name === "p6_a"
    );

    const includePng6 =
      p6_a_modification && p6_a_modification.text.trim() !== "";

    // Assuming the relevant image URLs are stored under `image_urls` in the JSON
    let image_urls = [];
    Object.values(req.body.image_urls).forEach((url) => {
      if (url.endsWith(".png")) {
        image_urls.push(url);
      }
    });

    if (!image_urls || image_urls.length === 0) {
      return res
        .status(400)
        .send(
          "Invalid payload: image_urls is required and should be an array of URLs."
        );
    }

    // If p6_a has text, include the 6th image
    if (includePng6 && image_urls.length >= 6) {
      image_urls = image_urls.slice(0, 6);
    } else {
      image_urls = image_urls.slice(0, 5);
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Fetch each image and add it to the PDF
    for (const imageUrl of image_urls) {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const imageBytes = response.data;
      const image = await pdfDoc.embedPng(imageBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // Serialize the PDF document to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Save the PDF to a temporary file with the name based on metadata
    const pdfPath = path.join(
      __dirname,
      `${req.body.metadata}-${Date.now()}.pdf`
    );
    fs.writeFileSync(pdfPath, pdfBytes);

    // Upload the PDF using the existing /api/upload-image endpoint
    const formData = new FormData();
    formData.append("image", fs.createReadStream(pdfPath));

    const uploadResponse = await axios.post(
      `${BASE_SERVER_URL}/api/upload-image`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Delete the temporary file
    fs.unlinkSync(pdfPath);

    // Define the webhook payload
    const webhookPayload = {
      fileUrl: uploadResponse.data.url,
      fileName: req.body.metadata,
      png1: image_urls[0],
      png2: image_urls[1],
      png3: image_urls[2],
      png4: image_urls[3],
      png5: image_urls[4],
    };

    if (includePng6) {
      webhookPayload.png6 = image_urls[5];
    }

    // Send the file URL to the webhook
    const webhookUrl =
      "https://hook.us1.make.com/g3hy3xhygjk4te8qvko46q6fkq1wdo43";
    await axios.post(webhookUrl, webhookPayload);

    console.log("response from /upload-image", uploadResponse.data.url);
    console.log("fileName", req.body.metadata);

    // Send the webhook payload as a response
    res.json(webhookPayload);
  } catch (error) {
    console.error("Error processing PDF:", error.message);
    res.status(500).send("Error processing PDF");
  }
});

// End of UVIC SS API Routes

// Propero API Routes

const PROPERO_BASE_ID = process.env.PROPERO_BASE_ID;
const PROPERO_TABLE_NAME = process.env.PROPERO_TABLE_NAME;

const properoAirtableApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${PROPERO_BASE_ID}/${PROPERO_TABLE_NAME.replace(
    /_/g,
    "%20"
  )}`,
  headers: {
    Authorization: `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Propero Get - Load all records
app.get("/api/propero/records", async (req, res) => {
  console.log("Fetching records in /api/propero/records...", req.query);
  try {
    const tableId = req.query.tableId;
    let airtableApiInstance = properoAirtableApi;

    if (tableId === "tblDq8HRg6JF88OFH") {
      airtableApiInstance = axios.create({
        baseURL: `https://api.airtable.com/v0/${PROPERO_BASE_ID}/Reports`,
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
    }
    const response = await airtableApiInstance.get("/");
    let records = response.data.records;

    if (tableId !== "tblDq8HRg6JF88OFH") {
      records.sort((a, b) => {
        const dateA = new Date(a.fields["Posting_Date"]);
        const dateB = new Date(b.fields["Posting_Date"]);
        return dateA - dateB;
      });
    }

    res.json({ records });
  } catch (error) {
    console.error("Error fetching records:", error.message);
    res.status(500).send(error.message);
  }
});

// Propero Get - Load specific record
app.get("/api/propero/records/:id", async (req, res) => {
  console.log("Fetching record in /api/propero/records/:id...", req.params);
  try {
    const response = await properoAirtableApi.get(`/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching record:", error.message);
    res.status(500).send(error.message);
  }
});

// Propero Patch - Edit Record
app.patch("/api/propero/records/:id", async (req, res) => {
  console.log("Updating record in /api/propero/records/:id...", req.params);
  console.log("Received data in /api/propero/records/:id...", req.body);
  try {
    const recordId = req.params.id;
    const updateData = req.body;
    const response = await properoAirtableApi.patch(`/${recordId}`, {
      fields: updateData,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error updating record:", error.message);
    res.status(500).send(error.message);
  }
});

// Propero Post - Create new Record
app.post("/api/propero/content-request", async (req, res) => {
  console.log("Received data in /api/propero/content-request:", req.body);
  try {
    const {
      name,
      submissionType,
      url,
      notes,
      username,
      mainText,
      blogTitle,
      author,
      status,
      approvalStatus,
      imageUrl,
    } = req.body;

    // Create a new record in Airtable
    const response = await properoAirtableApi.post("/", {
      records: [
        {
          fields: {
            Name: name,
            Content_Type: submissionType,
            URL: url,
            Notes: notes,
            "Submitted By": username,
            Main_Text: mainText,
            Status: status,
            "Approval Status": approvalStatus,
            Author: author,
            Blog_Title: blogTitle,
            PDF_URL: imageUrl,
          },
        },
      ],
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error creating record in Airtable:", error.message);
    res.status(500).send(error.message);
  }
});

// Propero Post - Handle image upload
app.post(
  "/api/propero/upload-image",
  upload.single("image"),
  async (req, res) => {
    console.log("Received image upload request:", req.file); // Log the received file for debugging
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
        Key: `uploads/propero/${timestamp}_${sanitizedFileName}`,
        Body: file.buffer,
        ACL: "public-read",
      };
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      const url = `https://${process.env.DO_SPACES_BUCKET}.tor1.digitaloceanspaces.com/uploads/propero/${timestamp}_${sanitizedFileName}`;
      res.json({ url });
    } catch (error) {
      console.error("Error uploading image:", error.message);
      res.status(500).send(error.message);
    }
  }
);

// Endpoint to receive payload from BannerBear and create a PDF
app.post("/api/propero/pdf-parse", async (req, res) => {
  console.log("Received data in /api/propero/pdf-parse:", req.body);

  let image_urls = [];

  // Assuming the relevant image URLs are stored under `image_urls` in the JSON
  Object.values(req.body.image_urls).forEach((url) => {
    // Check if the URL ends with '.png' to exclude JPG files
    if (url.endsWith(".png")) {
      // Adding the URL to the array
      image_urls.push(url);
    }
  });
  console.log("Image URLs:", image_urls);

  try {
    if (!image_urls || image_urls.length === 0) {
      return res
        .status(400)
        .send(
          "Invalid payload: image_urls is required and should be an array of URLs."
        );
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Fetch each image and add it to the PDF
    for (const imageUrl of image_urls) {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const imageBytes = response.data;
      const image = await pdfDoc.embedPng(imageBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // Serialize the PDF document to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Save the PDF to a temporary file with the name based on metadata
    const pdfPath = path.join(
      __dirname,
      `${req.body.metadata}-${Date.now()}.pdf`
    );
    fs.writeFileSync(pdfPath, pdfBytes);

    // Upload the PDF using the existing /api/upload-image endpoint
    const formData = new FormData();
    formData.append("image", fs.createReadStream(pdfPath));

    const uploadResponse = await axios.post(
      // "http://localhost:3000/api/upload-image",
      `${BASE_SERVER_URL}/api/upload-image`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Delete the temporary file
    fs.unlinkSync(pdfPath);

    // Send the file URL to the webhook
    const webhookUrl =
      "https://hook.us1.make.com/i1359awa38rawdms5k9fnubih92oxxdc";
    await axios.post(webhookUrl, {
      fileUrl: uploadResponse.data.url,
      fileName: req.body.metadata,
    });

    console.log("response from /upload-image", uploadResponse.data.url);
    console.log("fileName", req.body.metadata);

    // Send the file URL as a response
    res.json({
      fileUrl: uploadResponse.data.url,
      fileName: req.body.metadata,
    });
  } catch (error) {
    console.error("Error creating PDF:", error.message);
    res.status(500).send("Error creating PDF");
  }
});
