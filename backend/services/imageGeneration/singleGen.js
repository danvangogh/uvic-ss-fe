const axios = require("axios");

class SingleImageGenerator {
  async generate(content, generationUrl) {
    try {
      // Extract the necessary fields from content and post_text
      const {
        post_text,
        source_content_main_text,
        source_content_title,
        template,
      } = content;

      if (!template?.template_id_p1) {
        throw new Error("Template ID (P1) not found in content template");
      }

      // Structure the payload according to Bannerbear image requirements
      const payload = {
        template: template.template_id_p1, // Get template ID from the template
        modifications: [
          {
            name: "title",
            text: post_text.p1a,
          },
          {
            name: "subtitle",
            text: post_text.p1b,
          },
          {
            name: "source_text",
            text: source_content_main_text.substring(0, 500), // Limit text length if needed
          },
        ],
        metadata: source_content_title, // Store the content title as metadata
        webhook_url: process.env.BANNERBEAR_WEBHOOK_URL, // Optional: for async processing
      };

      // Make the API call to Bannerbear images endpoint
      const response = await axios.post(
        "https://api.bannerbear.com/v2/images",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}`,
          },
        }
      );

      // Since Bannerbear returns 202 Accepted for async processing,
      // we need to handle both sync and async responses
      if (response.status === 202) {
        // For async processing, return the image UID for status checking
        return {
          success: true,
          status: "processing",
          imageUid: response.data.uid,
          message: "Image generation in progress",
        };
      }

      // For sync processing (immediate completion)
      return {
        success: true,
        status: "completed",
        image: response.data.image_url,
        metadata: {
          created_at: response.data.created_at,
          width: response.data.width,
          height: response.data.height,
          ...response.data.metadata,
        },
      };
    } catch (error) {
      console.error("Error in single image generation:", error);

      // Handle specific Bannerbear error responses
      if (error.response) {
        const { status, data } = error.response;
        switch (status) {
          case 400:
            throw new Error(`Invalid request: ${data.message}`);
          case 401:
            throw new Error("Invalid API key");
          case 404:
            throw new Error("Template not found");
          case 429:
            throw new Error("Rate limit exceeded");
          default:
            throw new Error(
              `Image generation failed: ${data.message || error.message}`
            );
        }
      }

      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  // Helper method to check image status
  async checkStatus(imageUid) {
    try {
      const response = await axios.get(
        `https://api.bannerbear.com/v2/images/${imageUid}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}`,
          },
        }
      );

      return {
        status: response.data.status,
        image: response.data.image_url,
        metadata: {
          created_at: response.data.created_at,
          width: response.data.width,
          height: response.data.height,
          ...response.data.metadata,
        },
      };
    } catch (error) {
      console.error("Error checking image status:", error);
      throw new Error(`Failed to check image status: ${error.message}`);
    }
  }
}

module.exports = new SingleImageGenerator();
