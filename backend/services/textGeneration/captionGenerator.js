/**
 * Social media caption generation service
 * Generates platform-specific captions from source content and post text
 */

const { formatExtractedContextForPrompt, TEMPERATURES } = require('./contentExtractor');
const { estimateTokenCount } = require('./tokenUtils');

/**
 * System prompt for caption generation
 */
const CAPTION_SYSTEM_PROMPT = `You are an expert social media copywriter who excels at writing engaging, curiosity-filled hooks and content.

ROLE:
- You write captions for Bluesky, LinkedIn, Instagram, and Facebook
- You write on behalf of an academic institution
- Your audience is a mix of academics and general public
- Your language must be widely accessible, not designed for academics
- You are a reporter, not a marketer

GOALS:
- Create engaging captions that drive clicks to the original content
- Capture the essence and most compelling aspect of the content
- Match the tone and style appropriate for each platform`;

/**
 * Rules and constraints for caption generation
 */
const CAPTION_RULES_PROMPT = `IMPORTANT RULES FOR ALL CAPTIONS:

PLATFORM-SPECIFIC:
- Bluesky: MUST be under 300 characters. Be concise but impactful.
- LinkedIn: Professional but accessible. Can be longer (up to 3000 chars recommended).
- Instagram: Visual-first mindset. Engaging but not overly long.
- Facebook: Conversational and shareable.

CONTENT RULES:
- Do NOT include any emojis
- Do NOT include calls to action like "read more" or "learn more"
- Avoid generic phrases like "Explore how..." or "Discover what..."
- Don't just ask a question like "How effective was it?"
  Instead: "Researchers X and Y explore..." or "This study answers the question..."
- Frame questions properly with context, don't leave them hanging
- Be specific, not vague or clickbaity
- Lead with the most interesting finding or angle

QUALITY STANDARDS:
- Each caption should be able to stand alone
- Provide enough context for the reader to understand the topic
- Be accurate to the source material
- Make the reader curious enough to want more`;

/**
 * Build messages for caption generation
 */
function buildCaptionMessages({
  sourceContent,
  extractedContext,
  postText,
}) {
  const messages = [
    { role: 'system', content: CAPTION_SYSTEM_PROMPT },
    { role: 'system', content: CAPTION_RULES_PROMPT },
  ];

  // Build the content context
  let contentSection;
  if (extractedContext) {
    const formattedContext = formatExtractedContextForPrompt(extractedContext);
    contentSection = `SOURCE CONTENT SUMMARY:\n${formattedContext}`;
  } else {
    contentSection = `SOURCE CONTENT:\n${sourceContent}`;
  }

  // Build the user prompt
  const userPrompt = `${contentSection}

POST TEXT (the social media post these captions will accompany):
${JSON.stringify(postText, null, 2)}

Please generate captions for each platform. Return a JSON object with these keys:
- bluesky_caption (MUST be under 300 characters)
- linkedin_caption
- facebook_caption
- instagram_caption`;

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

/**
 * Generate social media captions
 * @param {Object} options - Generation options
 * @param {Object} options.openai - OpenAI client
 * @param {string} options.sourceContent - Full source content
 * @param {Object|null} options.extractedContext - Pre-extracted context if available
 * @param {Object} options.postText - Generated post text fields
 * @returns {Object} - Generated captions
 */
async function generateCaptions({
  openai,
  sourceContent,
  extractedContext,
  postText,
}) {
  const startTime = Date.now();
  console.log('\n=== Starting Caption Generation ===');

  const messages = buildCaptionMessages({
    sourceContent,
    extractedContext,
    postText,
  });

  // Log token estimates
  const totalPromptTokens = messages.reduce(
    (sum, m) => sum + estimateTokenCount(m.content),
    0
  );
  console.log('Total prompt tokens (estimated):', totalPromptTokens);
  console.log('Using extracted context:', !!extractedContext);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
      temperature: TEMPERATURES.CAPTIONS,
      response_format: { type: 'json_object' },
    });

    const generatedText = completion.choices[0].message.content;
    const captions = JSON.parse(generatedText);

    // Validate Bluesky character limit
    if (captions.bluesky_caption && captions.bluesky_caption.length > 300) {
      console.warn('Bluesky caption exceeds 300 chars, truncating...');
      captions.bluesky_caption = captions.bluesky_caption.substring(0, 297) + '...';
    }

    const processingTime = Date.now() - startTime;
    console.log('✓ Caption generation completed in', processingTime, 'ms');

    return {
      success: true,
      captions,
      usage: completion.usage,
    };
  } catch (error) {
    console.error('Error during caption generation:', error);

    if (error instanceof SyntaxError) {
      throw new Error('Generated captions are not valid JSON');
    }

    throw error;
  }
}

module.exports = {
  generateCaptions,
  buildCaptionMessages,
  CAPTION_SYSTEM_PROMPT,
  CAPTION_RULES_PROMPT,
};
