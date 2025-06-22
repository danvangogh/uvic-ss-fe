const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");
const { PDFDocument, rgb } = require("pdf-lib");
const FormData = require("form-data");
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const history = require("connect-history-api-fallback");

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Log the current working directory and .env file path for debugging
console.log("Current working directory:", process.cwd());
console.log("Loading .env file from:", path.resolve(__dirname, ".env"));

// Validate critical environment variables
const requiredEnvVars = [
  "DIGITAL_OCEAN_SPACE_ACCESS_KEY",
  "DIGITAL_OCEAN_SPACE_SECRET_KEY",
  "DO_SPACES_BUCKET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BANNERBEAR_API_KEY",
  "OPENAI_API_KEY",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  console.error(
    "Please check your .env file at:",
    path.resolve(__dirname, ".env")
  );
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// Log successful environment variable loading
console.log("Successfully loaded all required environment variables");

// Initialize all clients after environment validation
const s3Client = new S3Client({
  region: "tor1",
  endpoint: "https://tor1.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DIGITAL_OCEAN_SPACE_ACCESS_KEY,
    secretAccessKey: process.env.DIGITAL_OCEAN_SPACE_SECRET_KEY,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add debug logging for initialized clients
console.log("Supabase client initialized with URL:", process.env.SUPABASE_URL);
console.log("S3 client initialized for DigitalOcean Spaces");
console.log("OpenAI client initialized");

// Import routes after environment variables are loaded
const imageGenerationRoutes = require("./routes/imageGeneration");

// Initialize Express app and configure middleware
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const BASE_SERVER_URL = process.env.BASE_SERVER_URL;

app.use(history());
app.use(
  cors({
    origin: BASE_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// Configure Express middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "../content-prism/dist")));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure console.log with timestamps
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

// Handle image deletion
app.post("/api/delete-image", async (req, res) => {
  console.log("Received image delete request for URL:", req.body.imageUrl);
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).send("No image URL provided.");
    }

    // Extract the key from the URL
    const key = imageUrl.split(".com/")[1];

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    console.log(`Successfully deleted image from DigitalOcean: ${key}`);
    res.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("Error deleting image from DigitalOcean:", error.message);
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

// Web scraping endpoint
app.post("/api/scrape-content", async (req, res) => {
  try {
    const { sourceContentId, url, accessToken } = req.body;
    console.log("=== Starting content scraping ===");
    console.log("Source Content ID:", sourceContentId);
    console.log("URL to scrape:", url);

    if (!sourceContentId || !url || !accessToken) {
      console.log("Missing required parameters");
      return res.status(400).json({
        error:
          "Missing required parameters: sourceContentId, url, and accessToken",
      });
    }

    // Create a new Supabase client with the user's access token
    const authenticatedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    console.log("Created authenticated Supabase client");

    console.log("Fetching webpage content...");
    const response = await axios.get(url);
    console.log(
      "Webpage fetched successfully, content length:",
      response.data.length
    );

    const $ = cheerio.load(response.data);
    console.log("HTML parsed with cheerio");

    // Initialize variables for content
    let title = "";
    let mainText = "";

    // Extract title - try different common selectors
    console.log("Attempting to extract title...");
    const titleSelectors = [
      "h1",
      "article h1",
      "main h1",
      ".article-title",
      ".post-title",
      "title",
    ];

    for (const selector of titleSelectors) {
      const titleText = $(selector).first().text().trim();
      if (titleText) {
        title = titleText;
        console.log(`Found title using selector "${selector}":`, title);
        break;
      }
    }

    if (!title) {
      console.log("Warning: No title found with any selector");
    }

    // Extract main content - try different common selectors
    console.log("Attempting to extract main content...");
    const contentSelectors = [
      "article",
      "main",
      ".article-content",
      ".post-content",
      "#content",
      ".content",
    ];

    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        console.log(`Found content using selector "${selector}"`);
        // Remove unwanted elements
        element
          .find(
            "script, style, nav, header, footer, .social-share, .advertisement"
          )
          .remove();
        mainText = element.text().trim();
        if (mainText) {
          console.log("Content length before cleanup:", mainText.length);
          break;
        }
      }
    }

    // If no content found, try paragraphs
    if (!mainText) {
      console.log("No content found with main selectors, trying paragraphs...");
      const paragraphs = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((text) => text.length > 50);

      console.log("Found", paragraphs.length, "paragraphs with length > 50");
      mainText = paragraphs.join("\n\n");
    }

    // Clean up the text
    if (mainText) {
      console.log("Content length before final cleanup:", mainText.length);
      mainText = mainText
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();
      console.log("Content length after cleanup:", mainText.length);
    } else {
      console.log("Warning: No main content found");
    }

    if (!title && !mainText) {
      console.log("Error: Could not extract any content");
      throw new Error("Could not extract content from the webpage");
    }

    // Prepare update data
    const updateData = {
      source_content_title: title || "Untitled Article",
      source_content_main_text: mainText || null,
      updated_at: new Date().toISOString(),
    };
    console.log("Preparing to update Supabase with data:", {
      title: updateData.source_content_title,
      textLength: updateData.source_content_main_text?.length || 0,
      id: sourceContentId,
    });

    // First verify the row exists
    console.log("Verifying source_content row exists...");

    // First check if we can access the table at all
    const { count: totalCount, error: countError } = await authenticatedSupabase
      .from("source_content")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error accessing source_content table:", countError);
      throw new Error(
        `Cannot access source_content table: ${countError.message}`
      );
    }

    console.log("Total rows in source_content table:", totalCount);

    // Now try to get the specific row
    const { data: existingRow, error: fetchError } = await authenticatedSupabase
      .from("source_content")
      .select("*")
      .eq("id", sourceContentId)
      .single();

    if (fetchError) {
      console.error("Error fetching source_content row:", fetchError);
      // Log more details about the error
      console.error("Full error details:", {
        error: fetchError,
        sourceContentId,
        errorCode: fetchError.code,
        errorMessage: fetchError.message,
        errorDetails: fetchError.details,
        hint: fetchError.hint,
      });

      throw new Error(`Failed to find source_content row with id ${sourceContentId}. 
        Table has ${totalCount} total rows.
        This could be because: 
        1. The row wasn't created successfully
        2. The row ID is incorrect
        3. RLS policies are preventing access
        Please check the logs for more details.`);
    }

    console.log("Found existing row:", {
      id: existingRow.id,
      url: existingRow.url,
      created_at: existingRow.created_at,
      user_id: existingRow.user_id,
      institution_id: existingRow.institution_id,
    });

    // Update the source_content record in Supabase
    console.log("Updating Supabase record with ID:", sourceContentId);
    const { data, error: updateError } = await authenticatedSupabase
      .from("source_content")
      .update(updateData)
      .eq("id", sourceContentId)
      .select("id, source_content_title, source_content_main_text");

    if (updateError) {
      console.error("Supabase update error:", updateError);
      throw updateError;
    }

    if (!data || data.length === 0) {
      console.error("Update succeeded but no data returned");
      throw new Error("Update succeeded but no data returned");
    }

    console.log("Supabase update successful. Updated row data:", data[0]);

    res.json({
      success: true,
      data: {
        title,
        mainText,
        sourceContent: data[0],
      },
    });
    console.log("=== Scraping process completed successfully ===");
  } catch (error) {
    console.error("=== Error in scraping process ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("HTTP Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    res.status(500).json({
      error: "Failed to scrape content",
      details: error.message,
    });
  }
});

// Text Generation Endpoint
app.post("/api/generate-text", async (req, res) => {
  const startTime = Date.now();
  console.log("\n=== Starting Text Generation Process ===");
  console.log("Request received at:", new Date().toISOString());
  console.log("Request payload:", {
    contentId: req.body.contentId,
    templateId: req.body.templateId,
    institutionId: req.body.institutionId,
  });

  try {
    const { contentId, templateId, institutionId } = req.body;

    // Fetch brand voice description
    console.log("\n[1/3] Fetching brand voice description...");
    const { data: brandData, error: brandError } = await supabase
      .from("brand_assets")
      .select("brand_voice_description")
      .eq("institution_id", institutionId)
      .single();

    if (brandError) {
      console.error("Error fetching brand voice:", brandError);
      throw brandError;
    }
    console.log("✓ Brand voice fetched successfully");

    // Fetch template details
    console.log("\n[2/3] Fetching template details...");
    const { data: templateData, error: templateError } = await supabase
      .from("content_templates")
      .select("template_content_description, template_content_schema")
      .eq("id", templateId)
      .single();

    if (templateError) {
      console.error("Error fetching template:", templateError);
      throw templateError;
    }
    console.log("✓ Template details fetched successfully");
    console.log("Template schema:", templateData.template_content_schema);

    // Fetch source content
    console.log("\n[3/3] Fetching source content...");
    const { data: sourceData, error: sourceError } = await supabase
      .from("source_content")
      .select("source_content_main_text")
      .eq("id", contentId)
      .single();

    if (sourceError) {
      console.error("Error fetching source content:", sourceError);
      throw sourceError;
    }
    console.log("✓ Source content fetched successfully");
    console.log(
      "Source content length:",
      sourceData.source_content_main_text?.length || 0,
      "characters"
    );

    // Construct the prompt
    console.log("\nConstructing OpenAI prompt...");
    const systemPrompt = `You are a professional social media content writer. Your task is to generate engaging social media post text based on the provided source content, template requirements, and brand voice.

Brand Voice Description:
${brandData.brand_voice_description}

Template Description:
${templateData.template_content_description}

Template Schema:
${templateData.template_content_schema}

IMPORTANT: Your response MUST be valid JSON that matches the template schema structure. Each key in the schema represents a text field that needs to be filled. Format your response as a JSON object with the exact same keys as the schema.

For example, if the schema has keys "p1a" and "p1b", your response should look like:
{
  "p1a": "Your generated text for p1a",
  "p1b": "Your generated text for p1b"
}`;

    const userPrompt = `Please generate text based on the following source content. Remember to format your entire response as a valid JSON object that matches the template schema structure:

${sourceData.source_content_main_text}`;

    console.log("System prompt length:", systemPrompt.length);
    console.log("User prompt length:", userPrompt.length);

    // Call OpenAI API
    console.log("\nCalling OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }, // Force JSON response
    });

    // Parse the response
    console.log("\nProcessing OpenAI response...");
    const generatedText = completion.choices[0].message.content;
    console.log("Generated text:", generatedText); // Log the actual response

    // Validate JSON before sending
    try {
      const parsedJson = JSON.parse(generatedText);
      console.log("Successfully parsed JSON response");

      // Send the response
      res.json({ success: true, text: generatedText });
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      throw new Error("Generated text is not valid JSON");
    }
  } catch (error) {
    console.error("\n=== Error in Text Generation Process ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Log API-specific errors if available
    if (error.response) {
      console.error("API Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(`Failed after ${processingTime}ms`);

    res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
    });
  }
});

// Use routes
app.use("/api/generate-imagery", imageGenerationRoutes);

// Add get-signed-url endpoint
app.post("/api/get-signed-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Extract the key (path) from the URL
    // Example URL: https://bucket.tor1.digitaloceanspaces.com/path/to/file.png
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Remove leading slash

    // Create a GetObject command
    const command = new GetObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    });

    // Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // URL expires in 1 hour

    res.json({ signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

// Add download-file endpoint to proxy requests to DigitalOcean Spaces
app.post("/api/download-file", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Extract the key from the URL
    const key = url.split("uvicss.tor1.digitaloceanspaces.com/")[1];
    if (!key) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Get the object from DigitalOcean Spaces
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(getObjectCommand);

    // Set appropriate headers
    res.setHeader("Content-Type", response.ContentType);
    if (response.ContentLength) {
      res.setHeader("Content-Length", response.ContentLength);
    }

    // Stream the file directly to the response
    response.Body.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});
