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

module.exports = router; 