const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
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

if (!process.env.CREATOMATE_API_KEY) {
  throw new Error(
    "Creatomate API key is missing. Please check your .env file."
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
  "VideoGenerator: Successfully initialized with required credentials"
);

class VideoGenerator {
  async uploadVideoToDigitalOcean(videoUrl, sourceContentId) {
    try {
      console.log("VIDEO: Downloading from Creatomate...");
      const response = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(response.data);
      const timestamp = Date.now();
      const key = `uploads/videos/${sourceContentId}/${timestamp}_video.mp4`;

      console.log("VIDEO: Uploading to DigitalOcean...");
      const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: buffer,
        ACL: "public-read",
        ContentType: "video/mp4",
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      const finalUrl = `https://${process.env.DO_SPACES_BUCKET}.tor1.digitaloceanspaces.com/${key}`;
      console.log("VIDEO: Upload complete:", finalUrl);

      return finalUrl;
    } catch (error) {
      console.error("VIDEO: Upload error:", error.message);
      throw error;
    }
  }

  async saveVideoToDatabase(sourceContentId, videoUrl, content) {
    try {
      console.log("VIDEO: Saving to database for content", sourceContentId);

      // Create url_object for video (similar to how carousel handles images)
      const urlObject = {
        video: videoUrl,
      };

      // Check if record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from("created_content")
        .select("id")
        .eq("source_content_id", sourceContentId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingRecord) {
        console.log("VIDEO: Updating existing record");
        const { error: updateError } = await supabase
          .from("created_content")
          .update({
            url_object: urlObject,
            video_url: videoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("source_content_id", sourceContentId);

        if (updateError) throw updateError;
      } else {
        console.log("VIDEO: Creating new record");
        const { error: insertError } = await supabase
          .from("created_content")
          .insert([
            {
              source_content_id: sourceContentId,
              url_object: urlObject,
              video_url: videoUrl,
              user_id: content.user_id,
              institution_id: content.institution_id,
            },
          ]);

        if (insertError) throw insertError;
      }

      console.log("VIDEO: Database save complete");
      return { success: true };
    } catch (error) {
      console.error("VIDEO: Database error:", error.message);
      throw error;
    }
  }

  async generate(content, images = []) {
    try {
      console.log("VIDEO: Starting generation for content", content.id);

      // Extract the necessary fields from content and post_text
      const {
        post_text,
        source_content_main_text,
        source_content_title,
        template,
      } = content;

      console.log("VIDEO: Using template", template?.video_template_id);

      if (!template?.video_template_id) {
        throw new Error("Video template ID not found in content template");
      }

      // Check if we have images to use
      if (!images || images.length === 0) {
        throw new Error("No images provided for video generation");
      }

      // Structure the payload according to Creatomate's REST API requirements
      const payload = {
        template_id: template.video_template_id,
        modifications: {
          p1_a: post_text.p1a,
          p2_a: post_text.p2a,
          p3_a: post_text.p3a,
          bg_img: images[0].image_url, // Use image_url instead of url
        },
      };

      console.log("VIDEO: Calling Creatomate API...");

      const response = await axios.post(
        "https://api.creatomate.com/v1/renders",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
          },
        }
      );

      console.log(
        "VIDEO: Full API response:",
        JSON.stringify(response.data, null, 2)
      );

      // Creatomate returns an array of render objects
      const render = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      // Check if we have the expected fields
      if (!render.status || !render.id) {
        console.error("VIDEO: Invalid API response - missing status or id");
        throw new Error(
          `Invalid API response: ${JSON.stringify(response.data)}`
        );
      }

      console.log(
        "VIDEO: API response - status:",
        render.status,
        "renderId:",
        render.id
      );

      // Return the response with video generation status
      const result = {
        success: true,
        status: render.status,
        renderId: render.id,
        message: "Video generation in progress",
        content: content, // Pass content object for later use
      };

      console.log("VIDEO: Returning result with status:", result.status);

      return result;
    } catch (error) {
      console.error("=== Error in video generation ===");
      console.error("Error details:", error);
      console.error("Error message:", error.message);

      // Handle Creatomate error responses
      if (error.response) {
        const { status, data } = error.response;
        console.error("API Error Response:", {
          status: status,
          statusText: error.response.statusText,
          data: data,
        });
        throw new Error(
          `Video generation failed: ${data.message || error.message}`
        );
      }

      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  // Helper method to check render status
  async checkStatus(renderId, content) {
    try {
      console.log("VIDEO: Checking status for render", renderId);

      const response = await axios.get(
        `https://api.creatomate.com/v1/renders/${renderId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
          },
        }
      );

      const status = response.data.status;
      const videoUrl = response.data.url;

      console.log(
        "VIDEO: Status check - status:",
        status,
        "has URL:",
        !!videoUrl
      );

      // Map Creatomate status to polling-compatible status
      let mappedStatus = status;
      if (status === "succeeded") {
        mappedStatus = "completed";
      } else if (status === "failed") {
        mappedStatus = "failed";
      }

      // If video is completed and we have a URL, upload to DigitalOcean and save to database
      if (mappedStatus === "completed" && videoUrl) {
        console.log("VIDEO: Generation completed, starting upload...");

        // Upload video to DigitalOcean
        const digitalOceanUrl = await this.uploadVideoToDigitalOcean(
          videoUrl,
          content.id
        );
        console.log("VIDEO: Uploaded to DigitalOcean:", digitalOceanUrl);

        // Save video URL to database
        await this.saveVideoToDatabase(content.id, digitalOceanUrl, content);
        console.log("VIDEO: Saved to database");

        return {
          status: "completed",
          url: digitalOceanUrl,
          preview_url: response.data.preview_url,
          metadata: {
            created_at: response.data.created_at,
            duration: response.data.duration,
            width: response.data.width,
            height: response.data.height,
            ...response.data.metadata,
          },
        };
      }

      return {
        status: mappedStatus,
        url: videoUrl,
        preview_url: response.data.preview_url,
        metadata: {
          created_at: response.data.created_at,
          duration: response.data.duration,
          width: response.data.width,
          height: response.data.height,
          ...response.data.metadata,
        },
      };
    } catch (error) {
      console.error("VIDEO: Error checking status:", error.message);
      throw new Error(`Failed to check render status: ${error.message}`);
    }
  }
}

module.exports = new VideoGenerator();
