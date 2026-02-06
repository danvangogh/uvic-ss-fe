/**
 * Post text generation service
 * Handles generation of social media post text from source content
 */

const { formatExtractedContextForPrompt, TEMPERATURES } = require('./contentExtractor');
const { estimateTokenCount, TOKEN_THRESHOLDS } = require('./tokenUtils');

/**
 * Build the system prompt for post text generation
 * Separates concerns for better context management
 */
function buildGenerationSystemPrompt({
  brandVoiceDescription,
  positioningSection,
  creatorNotesSection,
  templateDescription,
  templateSchema,
}) {
  return `You are a professional social media content writer creating engaging posts for academic research and institutional content.

ROLE AND CONSTRAINTS:
- You write accessible content for a mix of academics and general public
- You are a reporter/communicator, not a marketer
- You maintain factual accuracy while making content engaging
- You prioritize creator notes when provided

RESPONSE FORMAT:
Your response MUST be valid JSON matching the template schema structure exactly.
Each key in the schema represents a text field to fill.

For example, if schema has keys "p1a" and "p1b":
{
  "p1a": "Your generated text for p1a",
  "p1b": "Your generated text for p1b"
}

TEMPLATE DETAILS:
Description: ${templateDescription}

Schema:
${templateSchema}`;
}

/**
 * Build the user messages for post generation
 * Uses multiple messages to separate concerns and improve context handling
 */
function buildGenerationMessages({
  systemPrompt,
  sourceContent,
  extractedContext,
  brandVoiceDescription,
  positioningSection,
  creatorNotesSection,
}) {
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add brand voice as separate context
  if (brandVoiceDescription) {
    messages.push({
      role: 'user',
      content: `BRAND VOICE GUIDELINES:\n${brandVoiceDescription}`,
    });
    messages.push({
      role: 'assistant',
      content: 'I understand the brand voice guidelines. I will write in this voice.',
    });
  }

  // Add emotional positioning if specified
  if (positioningSection) {
    messages.push({
      role: 'user',
      content: positioningSection,
    });
    messages.push({
      role: 'assistant',
      content: 'I understand the emotional positioning. The first panel will have the strongest emotional impact as the hook.',
    });
  }

  // Add creator notes if specified (highest priority)
  if (creatorNotesSection) {
    messages.push({
      role: 'user',
      content: `CREATOR NOTES (PRIORITY INSTRUCTIONS):\n${creatorNotesSection}`,
    });
    messages.push({
      role: 'assistant',
      content: 'I understand and will prioritize these creator notes in my generation.',
    });
  }

  // Add the source content - either extracted or full
  let contentPrompt;
  if (extractedContext) {
    const formattedContext = formatExtractedContextForPrompt(extractedContext);
    contentPrompt = `Based on the following extracted key information from the source content, generate the post text according to the template schema.

EXTRACTED KEY INFORMATION:
${formattedContext}

Please generate the post text now, formatted as a valid JSON object matching the template schema.`;
  } else {
    contentPrompt = `Based on the following source content, generate the post text according to the template schema.

SOURCE CONTENT:
${sourceContent}

Please generate the post text now, formatted as a valid JSON object matching the template schema.`;
  }

  messages.push({ role: 'user', content: contentPrompt });

  return messages;
}

/**
 * Generate post text from source content
 * @param {Object} options - Generation options
 * @param {Object} options.openai - OpenAI client
 * @param {string} options.sourceContent - Full source content text
 * @param {Object|null} options.extractedContext - Pre-extracted context if available
 * @param {string} options.brandVoiceDescription - Brand voice text
 * @param {string} options.positioningSection - Emotional positioning text
 * @param {string} options.creatorNotesSection - Creator notes text
 * @param {string} options.templateDescription - Template description
 * @param {string} options.templateSchema - Template schema JSON string
 * @returns {Object} - { success: boolean, text: string, tokensUsed: Object }
 */
async function generatePostText({
  openai,
  sourceContent,
  extractedContext,
  brandVoiceDescription,
  positioningSection,
  creatorNotesSection,
  templateDescription,
  templateSchema,
}) {
  const startTime = Date.now();
  console.log('\n=== Starting Post Text Generation ===');

  // Build the system prompt
  const systemPrompt = buildGenerationSystemPrompt({
    brandVoiceDescription,
    positioningSection,
    creatorNotesSection,
    templateDescription,
    templateSchema,
  });

  // Build the messages
  const messages = buildGenerationMessages({
    systemPrompt,
    sourceContent,
    extractedContext,
    brandVoiceDescription,
    positioningSection,
    creatorNotesSection,
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
      temperature: TEMPERATURES.GENERATION,
      response_format: { type: 'json_object' },
    });

    const generatedText = completion.choices[0].message.content;

    // Validate JSON
    const parsedJson = JSON.parse(generatedText);
    console.log('✓ Successfully generated and parsed JSON response');

    const processingTime = Date.now() - startTime;
    console.log('Generation completed in', processingTime, 'ms');

    return {
      success: true,
      text: generatedText,
      parsed: parsedJson,
      usage: completion.usage,
    };
  } catch (error) {
    console.error('Error during post text generation:', error);

    if (error instanceof SyntaxError) {
      throw new Error('Generated text is not valid JSON');
    }

    throw error;
  }
}

module.exports = {
  generatePostText,
  buildGenerationSystemPrompt,
  buildGenerationMessages,
};
