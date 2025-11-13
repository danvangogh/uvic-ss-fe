const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class SingleImageGenerator {
  async generate(content, images = []) {
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

      const modifications = [
        {
          name: "p1_a",
          text: post_text.p1a,
        },
        {
          name: "p1_b",
          text: post_text.p1b,
        },
      ];

      const researcherInfo =
        typeof content.researcher_info === "string"
          ? content.researcher_info.trim()
          : "";

      if (researcherInfo) {
        modifications.push({
          name: "researcher_info",
          text: researcherInfo,
        });
      }

      if (images && images.length > 0) {
        modifications.push(...images);
      }

      // Structure the payload according to Bannerbear image requirements
      const payload = {
        template: template.template_id_p1, // Get template ID from the template
        modifications,
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

  // Helper method to save single image to database
  async saveToDatabase(sourceContentId, imageUrl, content) {
    try {
      console.log("SINGLE IMAGE: Saving to database for content", sourceContentId);

      // Create url_object for single image (similar to how carousel handles images)
      const urlObject = {
        png1: imageUrl, // Use png1 key to match carousel format
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
        console.log("SINGLE IMAGE: Updating existing record");
        const { error: updateError } = await supabase
          .from("created_content")
          .update({
            url_object: urlObject,
            updated_at: new Date().toISOString(),
          })
          .eq("source_content_id", sourceContentId);

        if (updateError) throw updateError;
      } else {
        console.log("SINGLE IMAGE: Creating new record");
        const { error: insertError } = await supabase
          .from("created_content")
          .insert([
            {
              source_content_id: sourceContentId,
              url_object: urlObject,
              user_id: content.user_id,
              institution_id: content.institution_id,
            },
          ]);

        if (insertError) throw insertError;
      }

      console.log("SINGLE IMAGE: Database save complete");
      return { success: true };
    } catch (error) {
      console.error("SINGLE IMAGE: Database error:", error.message);
      throw error;
    }
  }

  // Helper method to check image status
  async checkStatus(imageUid, content) {
    try {
      const response = await axios.get(
        `https://api.bannerbear.com/v2/images/${imageUid}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}`,
          },
        }
      );

      const status = response.data.status;
      const imageUrl = response.data.image_url;

      console.log(
        `SINGLE IMAGE: Status check - status: ${status}, has URL: ${!!imageUrl}`
      );

      // If image is completed and we have a URL, save to database
      if (status === "completed" && imageUrl) {
        console.log("SINGLE IMAGE: Generation completed, saving to database...");

        // Save image URL to database
        await this.saveToDatabase(content.id, imageUrl, content);
        console.log("SINGLE IMAGE: Saved to database");

        return {
          status: "completed",
          image: imageUrl,
          metadata: {
            created_at: response.data.created_at,
            width: response.data.width,
            height: response.data.height,
            ...response.data.metadata,
          },
        };
      }

      return {
        status: status,
        image: imageUrl,
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
