const axios = require("axios");

class VideoGenerator {
  async generate(content, generationUrl) {
    try {
      // Extract the necessary fields from content and post_text
      const {
        post_text,
        source_content_main_text,
        source_content_title,
        template,
      } = content;

      if (!template?.template_id_video) {
        throw new Error("Video template ID not found in content template");
      }

      // Structure the payload according to Creatomate's REST API requirements
      const payload = {
        template_id: template.template_id_video,
        modifications: {
          // Text modifications for each scene
          scene1_text: post_text.p1a,
          scene1_caption: post_text.p1b,
          scene2_text: post_text.p2a,
          scene2_caption: post_text.p2b,
          scene3_text: post_text.p3a,
          scene3_caption: post_text.p3b,
          source_text: source_content_main_text.substring(0, 500), // Limit text length if needed
        },
      };

      // Make the API call to Creatomate's renders endpoint
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

      // Return the response with video generation status
      return {
        success: true,
        status: response.data.status,
        renderId: response.data.id,
        message: "Video generation in progress",
      };
    } catch (error) {
      console.error("Error in video generation:", error);

      // Handle Creatomate error responses
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(
          `Video generation failed: ${data.message || error.message}`
        );
      }

      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  // Helper method to check render status
  async checkStatus(renderId) {
    try {
      const response = await axios.get(
        `https://api.creatomate.com/v1/renders/${renderId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
          },
        }
      );

      return {
        status: response.data.status,
        url: response.data.url,
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
      console.error("Error checking render status:", error);
      throw new Error(`Failed to check render status: ${error.message}`);
    }
  }
}

module.exports = new VideoGenerator();
