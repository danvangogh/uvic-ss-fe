const express = require("express");
const router = express.Router();
const imageGenerationService = require("../services/imageGeneration");

// Route to generate imagery
router.post("/generate", async (req, res) => {
  try {
    const { contentId, templateId } = req.body;

    if (!contentId || !templateId) {
      return res.status(400).json({
        success: false,
        error: "Content ID and template ID are required",
      });
    }

    const result = await imageGenerationService.generateImagery(
      contentId,
      templateId
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in generate imagery route:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate imagery",
    });
  }
});

module.exports = router;
