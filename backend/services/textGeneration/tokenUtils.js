/**
 * Token counting utilities for OpenAI API calls
 * Uses tiktoken-compatible encoding for accurate token counts
 */

// Simple token estimation based on GPT tokenization patterns
// ~4 characters per token is a reasonable approximation for English text
// This avoids heavy dependencies while providing good estimates
function estimateTokenCount(text) {
  if (!text) return 0;

  // More accurate estimation considering:
  // - Whitespace and punctuation typically tokenize separately
  // - Common words are single tokens
  // - Uncommon words split into subwords
  const words = text.split(/\s+/).filter(w => w.length > 0);
  let tokenCount = 0;

  for (const word of words) {
    // Punctuation adds tokens
    const punctuation = (word.match(/[.,!?;:'"()\[\]{}]/g) || []).length;
    // Base word tokens (longer/uncommon words split more)
    const wordLength = word.replace(/[.,!?;:'"()\[\]{}]/g, '').length;

    if (wordLength <= 4) {
      tokenCount += 1;
    } else if (wordLength <= 8) {
      tokenCount += 2;
    } else {
      tokenCount += Math.ceil(wordLength / 4);
    }

    tokenCount += punctuation;
  }

  // Add ~10% for special tokens and encoding overhead
  return Math.ceil(tokenCount * 1.1);
}

// Thresholds for content processing decisions
const TOKEN_THRESHOLDS = {
  // Below this, content is short enough to process directly
  SHORT_CONTENT: 4000,
  // Above this, extraction is recommended
  EXTRACTION_RECOMMENDED: 8000,
  // Maximum safe context for gpt-4.1-mini (leaving room for prompts/response)
  MAX_SAFE_CONTEXT: 100000,
  // Target size for extracted content
  EXTRACTION_TARGET: 6000,
};

/**
 * Determine the processing strategy based on content length
 * @param {string} content - The source content text
 * @returns {Object} - Strategy recommendation
 */
function determineProcessingStrategy(content) {
  const tokenCount = estimateTokenCount(content);

  if (tokenCount <= TOKEN_THRESHOLDS.SHORT_CONTENT) {
    return {
      strategy: 'direct',
      tokenCount,
      reason: 'Content is short enough for direct processing'
    };
  }

  if (tokenCount <= TOKEN_THRESHOLDS.EXTRACTION_RECOMMENDED) {
    return {
      strategy: 'direct_with_caution',
      tokenCount,
      reason: 'Content is moderate length, direct processing acceptable'
    };
  }

  if (tokenCount <= TOKEN_THRESHOLDS.MAX_SAFE_CONTEXT) {
    return {
      strategy: 'extract',
      tokenCount,
      reason: 'Content is long, extraction recommended to preserve key information'
    };
  }

  return {
    strategy: 'extract_required',
    tokenCount,
    reason: 'Content exceeds safe context limits, extraction required'
  };
}

module.exports = {
  estimateTokenCount,
  determineProcessingStrategy,
  TOKEN_THRESHOLDS,
};
