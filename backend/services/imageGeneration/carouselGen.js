const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate environment variables first
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase credentials are missing. Please check your .env file."
  );
}

if (
  !process.env.DIGITAL_OCEAN_SPACE_ACCESS_KEY ||
  !process.env.DIGITAL_OCEAN_SPACE_SECRET_KEY
) {
  throw new Error(
    "DigitalOcean Space credentials are missing. Please check your .env file."
  );
}

if (!process.env.DO_SPACES_BUCKET) {
  throw new Error(
    "DigitalOcean Space bucket name is missing. Please check your .env file."
  );
}

if (!process.env.BANNERBEAR_API_KEY) {
  throw new Error(
    "Bannerbear API key is missing. Please check your .env file."
  );
}

// Initialize clients after validation
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

// Log successful initialization
console.log(
  "CarouselGenerator: Successfully initialized with required credentials"
);

class CarouselGenerator {
  async uploadToDigitalOcean(imageUrl, index, sourceContentId) {
    try {
      console.log(`Downloading image ${index} from Bannerbear...`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(response.data);

      const timestamp = Date.now();
      const key = `uploads/carousel/${sourceContentId}/${timestamp}_image_${index}.png`;

      console.log(`Uploading image ${index} to DigitalOcean Space...`);
      const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: buffer,
        ACL: "public-read",
        ContentType: "image/png",
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      return `https://${process.env.DO_SPACES_BUCKET}.tor1.digitaloceanspaces.com/${key}`;
    } catch (error) {
      console.error(`Error uploading image ${index} to DigitalOcean:`, error);
      throw error;
    }
  }

  async generatePDF(urls) {
    try {
      console.log("Generating PDF from carousel images...");
      const pdfDoc = await PDFDocument.create();

      // Fetch each image and add it to the PDF
      for (const url of urls) {
        const response = await axios.get(url, {
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

      // Serialize the PDF document to bytes
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }

  async uploadPDFToDigitalOcean(pdfBuffer, sourceContentId) {
    try {
      console.log("Uploading PDF to DigitalOcean Space...");
      const timestamp = Date.now();
      const key = `uploads/carousel/${sourceContentId}/${timestamp}_carousel.pdf`;

      const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: pdfBuffer,
        ACL: "public-read",
        ContentType: "application/pdf",
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      return `https://${process.env.DO_SPACES_BUCKET}.tor1.digitaloceanspaces.com/${key}`;
    } catch (error) {
      console.error("Error uploading PDF to DigitalOcean:", error);
      throw error;
    }
  }

  async saveToDatabase(sourceContentId, urls, content) {
    try {
      console.log("Saving URLs to database...");
      const urlObject = urls.reduce((acc, url, index) => {
        acc[`png${index + 1}`] = url;
        return acc;
      }, {});

      // Generate and upload PDF
      const pdfBuffer = await this.generatePDF(urls);
      const pdfUrl = await this.uploadPDFToDigitalOcean(
        pdfBuffer,
        sourceContentId
      );

      const { data, error } = await supabase.from("created_content").insert([
        {
          source_content_id: sourceContentId,
          url_object: urlObject,
          user_id: content.user_id,
          institution_id: content.institution_id,
          pdf_url: pdfUrl,
        },
      ]);

      if (error) throw error;
      console.log("Successfully saved to database:", data);
      return data;
    } catch (error) {
      console.error("Error saving to database:", error);
      throw error;
    }
  }

  async generate(content) {
    try {
      console.log("Starting carousel generation process...");
      console.log("Received content:", JSON.stringify(content, null, 2));

      // Extract the necessary fields from content
      const { post_text, template } = content;

      if (!template?.template_set_id) {
        console.error("Template validation failed: Missing template_set_id");
        throw new Error("Template set ID not found in content template");
      }
      console.log("Using template set ID:", template.template_set_id);

      // Structure the payload according to Bannerbear collection requirements
      const payload = {
        template_set: template.template_set_id,
        modifications: [
          // First slide
          {
            name: "title_1",
            text: post_text.p1a,
          },
          {
            name: "subtitle_1",
            text: post_text.p1b,
          },
          // Second slide
          {
            name: "title_2",
            text: post_text.p2a,
          },
          {
            name: "subtitle_2",
            text: post_text.p2b,
          },
          // Third slide
          {
            name: "title_3",
            text: post_text.p3a,
          },
          {
            name: "subtitle_3",
            text: post_text.p3b,
          },
        ],
      };

      console.log(
        "Prepared payload for Bannerbear:",
        JSON.stringify(payload, null, 2)
      );

      // Make the API call to Bannerbear collections endpoint
      console.log("Making API call to Bannerbear collections endpoint...");
      const response = await axios.post(
        "https://api.bannerbear.com/v2/collections",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}`,
          },
        }
      );

      console.log("Received response from Bannerbear:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      // Since Bannerbear returns 202 Accepted for async processing,
      // we need to handle both sync and async responses
      if (response.status === 202) {
        // For async processing, return the collection UID for status checking
        console.log(
          "Async processing initiated, collection UID:",
          response.data.uid
        );
        return {
          success: true,
          status: "processing",
          collectionUid: response.data.uid,
          message: "Carousel generation in progress",
          content: content, // Pass content object for later use
        };
      }

      // For sync processing (immediate completion)
      console.log(
        "Sync processing completed, received images:",
        response.data.images
      );

      // Upload images to DigitalOcean Space
      const digitalOceanUrls = await Promise.all(
        response.data.images.map((image, index) =>
          this.uploadToDigitalOcean(image.image_url, index + 1, content.id)
        )
      );

      // Save URLs to database
      await this.saveToDatabase(content.id, digitalOceanUrls, content);

      return {
        success: true,
        status: "completed",
        images: digitalOceanUrls,
        metadata: response.data.metadata,
      };
    } catch (error) {
      console.error("Error in carousel generation:", {
        message: error.message,
        stack: error.stack,
        response: error.response
          ? {
              status: error.response.status,
              data: error.response.data,
            }
          : "No response data",
      });

      // Handle specific Bannerbear error responses
      if (error.response) {
        const { status, data } = error.response;
        console.error("Bannerbear API error:", { status, data });
        switch (status) {
          case 400:
            throw new Error(`Invalid request: ${data.message}`);
          case 401:
            throw new Error("Invalid API key");
          case 404:
            throw new Error("Template set not found");
          case 429:
            throw new Error("Rate limit exceeded");
          default:
            throw new Error(
              `Carousel generation failed: ${data.message || error.message}`
            );
        }
      }

      throw new Error(`Carousel generation failed: ${error.message}`);
    }
  }

  // Helper method to check collection status
  async checkStatus(collectionUid, content) {
    try {
      console.log("Checking collection status for UID:", collectionUid);
      const response = await axios.get(
        `https://api.bannerbear.com/v2/collections/${collectionUid}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}`,
          },
        }
      );

      console.log("Collection status response:", {
        status: response.data.status,
        imagesCount: response.data.images?.length || 0,
        metadata: response.data.metadata,
      });

      // If the collection is complete, upload to DigitalOcean and save to database
      if (response.data.status === "completed") {
        // Upload images to DigitalOcean Space
        const digitalOceanUrls = await Promise.all(
          response.data.images.map((image, index) =>
            this.uploadToDigitalOcean(image.image_url, index + 1, content.id)
          )
        );

        // Save URLs to database
        await this.saveToDatabase(content.id, digitalOceanUrls, content);

        return {
          status: response.data.status,
          images: digitalOceanUrls,
          metadata: response.data.metadata,
        };
      }

      return {
        status: response.data.status,
        images: response.data.images,
        metadata: response.data.metadata,
      };
    } catch (error) {
      console.error("Error checking collection status:", {
        collectionUid,
        error: {
          message: error.message,
          stack: error.stack,
          response: error.response
            ? {
                status: error.response.status,
                data: error.response.data,
              }
            : "No response data",
        },
      });
      throw new Error(`Failed to check collection status: ${error.message}`);
    }
  }
}

module.exports = new CarouselGenerator();
