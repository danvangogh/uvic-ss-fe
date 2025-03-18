const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate environment variables first
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase configuration missing. Please check your .env file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

// Initialize Supabase client after validation
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Log successful initialization
console.log("ImageGenerationService: Successfully initialized Supabase client");

// Import generators after environment variables are loaded
const carouselGen = require("./carouselGen");
const singleGen = require("./singleGen");
const videoGen = require("./videoGen");

// Helper function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ImageGenerationService {
  constructor() {
    this.generators = {
      carousel: carouselGen,
      single_image: singleGen,
      video: videoGen,
    };
  }

  async pollForCompletion(
    generator,
    uid,
    contentId,
    maxAttempts = 30,
    interval = 2000
  ) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Fetch the content data since we need it for the carousel generator
        const { data: content, error: contentError } = await supabase
          .from("source_content")
          .select(
            `
            *,
            post_text (*),
            template:template_id (
              *,
              post_type:post_type_id (
                content_template_post_type_name
              )
            )
          `
          )
          .eq("id", contentId)
          .single();

        if (contentError) throw contentError;
        if (!content) throw new Error("Content not found");

        const status = await generator.checkStatus(uid, content);
        console.log(`Polling attempt ${attempt + 1}, status:`, status);

        if (status.status === "completed") {
          // Only update is_imagery_generated to true, keep is_generating_imagery true
          // The frontend will handle setting is_generating_imagery to false when appropriate
          await supabase
            .from("source_content")
            .update({
              is_imagery_generated: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contentId);

          return status;
        } else if (status.status === "failed") {
          // On failure, set both flags to indicate the process is done
          await supabase
            .from("source_content")
            .update({
              is_generating_imagery: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contentId);
          throw new Error("Generation failed");
        }

        // Wait before next attempt
        await delay(interval);
      } catch (error) {
        console.error("Error during polling:", error);
        throw error;
      }
    }
    throw new Error("Polling timeout: Generation took too long");
  }

  async generateImagery(contentId, templateId) {
    try {
      // Set is_generating_imagery to true at the start
      await supabase
        .from("source_content")
        .update({
          is_generating_imagery: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contentId);

      // Fetch the content and template details
      const { data: content, error: contentError } = await supabase
        .from("source_content")
        .select(
          `
          *,
          post_text (*),
          template:template_id (
            *,
            post_type:post_type_id (
              content_template_post_type_name
            )
          )
        `
        )
        .eq("id", contentId)
        .single();

      if (contentError) throw contentError;
      if (!content) throw new Error("Content not found");

      const postType =
        content.template?.post_type?.content_template_post_type_name;

      if (!postType) {
        throw new Error("Template post type not found");
      }

      // Get the appropriate generator
      const generator = this.generators[postType];
      if (!generator) {
        throw new Error(`No generator found for post type: ${postType}`);
      }

      // Generate the imagery using the appropriate generator
      const initialResult = await generator.generate(content);

      // If the generation is async (status is 'processing'), start polling
      if (initialResult.status === "processing") {
        console.log("Generation is async, starting polling...");
        const uid =
          initialResult.collectionUid ||
          initialResult.imageUid ||
          initialResult.renderId;
        return await this.pollForCompletion(generator, uid, contentId);
      }

      // If it's synchronous (completed immediately), update both flags
      await supabase
        .from("source_content")
        .update({
          is_imagery_generated: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contentId);

      return initialResult;
    } catch (error) {
      console.error("Error in generateImagery:", error);
      throw error;
    }
  }
}

module.exports = new ImageGenerationService();
