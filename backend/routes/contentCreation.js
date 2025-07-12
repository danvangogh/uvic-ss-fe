const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// This assumes SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in the environment
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/create-from-text", async (req, res) => {
  try {
    const { text, fileName, userId, institutionId } = req.body;

    if (!text || !fileName || !userId || !institutionId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: text, fileName, userId, institutionId are required.",
      });
    }

    const { data, error } = await supabase
      .from("source_content")
      .insert([
        {
          source_content_type: "pdf",
          source_content_title: fileName,
          source_content_main_text: text,
          user_id: userId,
          institution_id: institutionId,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating source content from PDF:", error);
      throw error;
    }

    res.json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create content from PDF.",
    });
  }
});

// Duplicate content and all related assets
router.post("/duplicate-content", async (req, res) => {
  try {
    const { contentId, userId } = req.body;
    if (!contentId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: contentId and userId are required.",
      });
    }

    // 1. Fetch the original source_content row
    const { data: originalContent, error: fetchContentError } = await supabase
      .from("source_content")
      .select("*")
      .eq("id", contentId)
      .single();
    if (fetchContentError || !originalContent) {
      throw fetchContentError || new Error("Original content not found");
    }

    // 2. Insert a new source_content row (with new title and timestamps)
    const newContent = {
      ...originalContent,
      id: undefined, // Let Supabase generate a new ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_content_title: `${originalContent.source_content_title} (Copy)`
    };
    delete newContent.id;
    const { data: insertedContent, error: insertContentError } = await supabase
      .from("source_content")
      .insert([newContent])
      .select()
      .single();
    if (insertContentError) throw insertContentError;
    const newContentId = insertedContent.id;

    // 3. Duplicate post_text row (if any)
    const { data: postText, error: fetchPostTextError } = await supabase
      .from("post_text")
      .select("*")
      .eq("source_content_id", contentId)
      .maybeSingle();
    if (postText) {
      const newPostText = {
        ...postText,
        id: undefined,
        source_content_id: newContentId,
        user_id: userId,
        institution_id: insertedContent.institution_id,
      };
      delete newPostText.id;
      await supabase.from("post_text").insert([newPostText]);
    }

    // 4. Duplicate all images rows
    const { data: images, error: fetchImagesError } = await supabase
      .from("images")
      .select("*")
      .eq("source_content_id", contentId);
    if (images && images.length > 0) {
      const newImages = images.map(img => {
        const copy = { ...img };
        delete copy.id;
        copy.source_content_id = newContentId;
        copy.user_id = userId;
        copy.institution_id = insertedContent.institution_id;
        copy.created_at = new Date().toISOString();
        copy.updated_at = new Date().toISOString();
        return copy;
      });
      if (newImages.length > 0) {
        await supabase.from("images").insert(newImages);
      }
    }

    // 5. Duplicate created_content row (if any)
    const { data: createdContent, error: fetchCreatedContentError } = await supabase
      .from("created_content")
      .select("*")
      .eq("source_content_id", contentId)
      .maybeSingle();
    if (createdContent) {
      const newCreatedContent = {
        ...createdContent,
        id: undefined,
        source_content_id: newContentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      delete newCreatedContent.id;
      await supabase.from("created_content").insert([newCreatedContent]);
    }

    res.json({
      success: true,
      data: insertedContent,
      newContentId,
    });
  } catch (error) {
    console.error("Error duplicating content:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to duplicate content.",
    });
  }
});

module.exports = router; 