/**
 * Content extraction service for long-form source content
 * Extracts key information to preserve context while reducing token count
 */

const { estimateTokenCount, TOKEN_THRESHOLDS } = require('./tokenUtils');

// Temperature settings for different tasks
const TEMPERATURES = {
  EXTRACTION: 0.2,  // Low temperature for factual extraction
  GENERATION: 0.7,  // Higher temperature for creative generation
  CAPTIONS: 0.6,    // Moderate for engaging but accurate captions
};

/**
 * System prompt for extracting key information from research papers/articles
 */
const EXTRACTION_SYSTEM_PROMPT = `You are an expert research analyst specializing in extracting and preserving key information from academic papers and articles for social media content creation.

Your task is to extract the most important information that would be needed to create engaging social media content. You must preserve factual accuracy while identifying the most compelling and shareable aspects of the content.

EXTRACTION REQUIREMENTS:

1. MAIN THESIS (2-3 sentences)
   - The primary research question, argument, or finding
   - Must be factually accurate and capture the core message

2. KEY FINDINGS (3-5 bullet points)
   - The most significant discoveries, conclusions, or arguments
   - Include specific data, statistics, or evidence when available
   - Prioritize surprising, counterintuitive, or impactful findings

3. NOTABLE QUOTES (2-3 direct quotes)
   - Compelling statements that could be used in social media
   - Include the speaker/author attribution
   - Select quotes that are accessible to general audiences

4. CONTEXT AND BACKGROUND (1-2 sentences)
   - Why this research/topic matters
   - Current relevance or timeliness

5. AUDIENCE RELEVANCE (1-2 sentences)
   - Why a general audience (not just academics) should care
   - The "so what" factor - real-world implications

IMPORTANT GUIDELINES:
- Maintain factual accuracy - do not embellish or misrepresent findings
- Preserve nuance - include caveats or limitations if they are significant
- Use accessible language - translate academic jargon into plain English
- Identify the most compelling narrative angle for social media
- Do NOT include your own opinions or analysis beyond what's in the source

Respond with a JSON object containing these fields.`;

/**
 * Extract key information from long source content
 * @param {Object} openai - OpenAI client instance
 * @param {string} sourceContent - The full source content text
 * @returns {Object} - Extracted context object
 */
async function extractKeyInformation(openai, sourceContent) {
  const startTime = Date.now();
  console.log('\n=== Starting Content Extraction ===');
  console.log('Source content length:', sourceContent.length, 'characters');
  console.log('Estimated tokens:', estimateTokenCount(sourceContent));

  const userPrompt = `Please extract the key information from the following source content and return it as a JSON object with these keys:
- main_thesis (string): 2-3 sentences capturing the core message
- key_findings (array of strings): 3-5 bullet points of significant findings
- notable_quotes (array of objects with "quote" and "attribution" keys): 2-3 compelling quotes
- context_background (string): 1-2 sentences on why this matters
- audience_relevance (string): 1-2 sentences on real-world implications

SOURCE CONTENT:
${sourceContent}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: TEMPERATURES.EXTRACTION,
      response_format: { type: 'json_object' },
    });

    const extractedContent = JSON.parse(completion.choices[0].message.content);

    // Add metadata
    extractedContent.extracted_at = new Date().toISOString();
    extractedContent.source_token_count = estimateTokenCount(sourceContent);
    extractedContent.extracted_token_count = estimateTokenCount(
      JSON.stringify(extractedContent)
    );

    const processingTime = Date.now() - startTime;
    console.log('✓ Extraction completed in', processingTime, 'ms');
    console.log('Extracted token count:', extractedContent.extracted_token_count);

    return extractedContent;
  } catch (error) {
    console.error('Error during content extraction:', error);
    throw new Error(`Content extraction failed: ${error.message}`);
  }
}

/**
 * Format extracted context for use in generation prompts
 * @param {Object} extractedContext - The extracted context object
 * @returns {string} - Formatted text for inclusion in prompts
 */
function formatExtractedContextForPrompt(extractedContext) {
  if (!extractedContext) return null;

  const parts = [];

  if (extractedContext.main_thesis) {
    parts.push(`MAIN THESIS:\n${extractedContext.main_thesis}`);
  }

  if (extractedContext.key_findings && extractedContext.key_findings.length > 0) {
    parts.push(`KEY FINDINGS:\n${extractedContext.key_findings.map(f => `• ${f}`).join('\n')}`);
  }

  if (extractedContext.notable_quotes && extractedContext.notable_quotes.length > 0) {
    const quotesText = extractedContext.notable_quotes
      .map(q => `"${q.quote}" — ${q.attribution}`)
      .join('\n');
    parts.push(`NOTABLE QUOTES:\n${quotesText}`);
  }

  if (extractedContext.context_background) {
    parts.push(`CONTEXT:\n${extractedContext.context_background}`);
  }

  if (extractedContext.audience_relevance) {
    parts.push(`WHY IT MATTERS:\n${extractedContext.audience_relevance}`);
  }

  return parts.join('\n\n');
}

/**
 * Check if extraction is needed and return existing or new extraction
 * @param {Object} openai - OpenAI client instance
 * @param {string} sourceContent - The source content text
 * @param {Object|null} existingContext - Previously extracted context if available
 * @param {boolean} forceExtract - Force new extraction even if existing context available
 * @returns {Object} - { extracted: boolean, context: Object|null, usedExisting: boolean }
 */
async function getOrExtractContext(openai, sourceContent, existingContext = null, forceExtract = false) {
  const tokenCount = estimateTokenCount(sourceContent);

  // If content is short enough, no extraction needed
  if (tokenCount <= TOKEN_THRESHOLDS.EXTRACTION_RECOMMENDED) {
    console.log('Content is short enough for direct processing, skipping extraction');
    return {
      extracted: false,
      context: null,
      usedExisting: false,
      strategy: 'direct',
    };
  }

  // If we have existing context and not forcing re-extraction, use it
  if (existingContext && !forceExtract) {
    console.log('Using existing extracted context');
    return {
      extracted: true,
      context: existingContext,
      usedExisting: true,
      strategy: 'cached',
    };
  }

  // Extract new context
  console.log('Extracting new context from long content');
  const context = await extractKeyInformation(openai, sourceContent);
  return {
    extracted: true,
    context,
    usedExisting: false,
    strategy: 'extracted',
  };
}

module.exports = {
  extractKeyInformation,
  formatExtractedContextForPrompt,
  getOrExtractContext,
  TEMPERATURES,
  EXTRACTION_SYSTEM_PROMPT,
};
