/**
 * Text Generation Service
 *
 * Provides a two-phase approach for generating social media content:
 * 1. Extraction Phase: For long content, extract key information to preserve context
 * 2. Generation Phase: Generate post text and captions using extracted or direct content
 *
 * Key features:
 * - Token counting and content length management
 * - Extracted context caching in database
 * - Improved prompt structure with separated concerns
 * - Temperature control for different generation tasks
 */

const { estimateTokenCount, determineProcessingStrategy, TOKEN_THRESHOLDS } = require('./tokenUtils');
const { extractKeyInformation, getOrExtractContext, formatExtractedContextForPrompt, TEMPERATURES } = require('./contentExtractor');
const { generatePostText } = require('./postGenerator');
const { generateCaptions } = require('./captionGenerator');

/**
 * Complete text generation pipeline
 * Handles extraction (if needed) and generation in a single call
 *
 * @param {Object} options - Pipeline options
 * @param {Object} options.openai - OpenAI client
 * @param {Object} options.supabase - Supabase client
 * @param {string} options.contentId - Source content ID
 * @param {string} options.sourceContent - Full source content text
 * @param {Object|null} options.existingExtractedContext - Previously extracted context
 * @param {string} options.brandVoiceDescription - Brand voice text
 * @param {string} options.positioningSection - Emotional positioning text
 * @param {string} options.creatorNotesSection - Creator notes text
 * @param {string} options.templateDescription - Template description
 * @param {string} options.templateSchema - Template schema JSON string
 * @param {boolean} options.forceReextract - Force new extraction even if cached
 * @returns {Object} - { success, text, extractedContext, strategy }
 */
async function runTextGenerationPipeline({
  openai,
  supabase,
  contentId,
  sourceContent,
  existingExtractedContext,
  brandVoiceDescription,
  positioningSection,
  creatorNotesSection,
  templateDescription,
  templateSchema,
  forceReextract = false,
}) {
  const startTime = Date.now();
  console.log('\n========================================');
  console.log('=== TEXT GENERATION PIPELINE START ===');
  console.log('========================================');

  // Step 1: Determine processing strategy
  const strategyResult = determineProcessingStrategy(sourceContent);
  console.log('\nProcessing strategy:', strategyResult.strategy);
  console.log('Reason:', strategyResult.reason);
  console.log('Estimated tokens:', strategyResult.tokenCount);

  // Step 2: Extract context if needed
  let extractedContext = null;
  let extractionResult = null;

  if (strategyResult.strategy === 'extract' || strategyResult.strategy === 'extract_required') {
    extractionResult = await getOrExtractContext(
      openai,
      sourceContent,
      existingExtractedContext,
      forceReextract
    );

    extractedContext = extractionResult.context;

    // Save extracted context to database if newly extracted
    if (extractionResult.extracted && !extractionResult.usedExisting && supabase && contentId) {
      console.log('Saving extracted context to database...');
      const { error: updateError } = await supabase
        .from('source_content')
        .update({ extracted_context: extractedContext })
        .eq('id', contentId);

      if (updateError) {
        console.error('Warning: Failed to save extracted context:', updateError);
      } else {
        console.log('✓ Extracted context saved to database');
      }
    }
  }

  // Step 3: Generate post text
  const generationResult = await generatePostText({
    openai,
    sourceContent,
    extractedContext,
    brandVoiceDescription,
    positioningSection,
    creatorNotesSection,
    templateDescription,
    templateSchema,
  });

  const totalTime = Date.now() - startTime;
  console.log('\n========================================');
  console.log('=== TEXT GENERATION PIPELINE COMPLETE ===');
  console.log('Total time:', totalTime, 'ms');
  console.log('Strategy used:', extractionResult?.strategy || 'direct');
  console.log('========================================\n');

  return {
    success: true,
    text: generationResult.text,
    parsed: generationResult.parsed,
    extractedContext,
    strategy: extractionResult?.strategy || 'direct',
    usage: generationResult.usage,
    processingTime: totalTime,
  };
}

module.exports = {
  // Main pipeline
  runTextGenerationPipeline,

  // Individual components for direct use
  generatePostText,
  generateCaptions,
  extractKeyInformation,
  getOrExtractContext,
  formatExtractedContextForPrompt,

  // Utilities
  estimateTokenCount,
  determineProcessingStrategy,
  TOKEN_THRESHOLDS,
  TEMPERATURES,
};
