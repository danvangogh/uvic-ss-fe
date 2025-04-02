const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get user prompts
router.get('/prompts', async (req, res) => {
  try {
    const { user_profile_id } = req.query;
    if (!user_profile_id) {
      return res.status(400).json({ error: 'User Profile ID is required' });
    }

    const { data: prompts, error } = await supabase
      .from('user_prompts')
      .select('*')
      .eq('user_profile_id', user_profile_id)
      .single();

    if (error) throw error;
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user prompts
router.put('/prompts', async (req, res) => {
  try {
    const { blog_prompt, interview_prompt, summary_prompt, question_prompt, user_profile_id } = req.body;
    
    if (!user_profile_id) {
      return res.status(400).json({ error: 'User Profile ID is required' });
    }
    
    const { data, error } = await supabase
      .from('user_prompts')
      .upsert({
        user_profile_id,
        blog_prompt,
        interview_prompt,
        summary_prompt,
        question_prompt
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate blog ideas
router.post('/generate', async (req, res) => {
  try {
    const { research_title, research_text, user_id, research_id } = req.body;
    
    if (!user_id || !research_id) {
      return res.status(400).json({ error: 'User ID and Research ID are required' });
    }

    // First get the user's institution_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.institution_id) {
      return res.status(400).json({ error: 'User has no associated institution' });
    }
    
    // Get institution's brand voice
    const { data: brandAssets, error: brandError } = await supabase
      .from('brand_assets')
      .select('brand_voice_description')
      .eq('institution_id', profile.institution_id)
      .single();

    if (brandError) throw brandError;

    // Get user's custom prompt
    const { data: userPrompts, error: promptError } = await supabase
      .from('user_prompts')
      .select('blog_prompt')
      .eq('user_profile_id', user_id)
      .single();

    if (promptError) throw promptError;

    console.log('User custom prompt:', userPrompts?.blog_prompt);
    console.log('Using custom prompt:', !!userPrompts?.blog_prompt);

    // Prepare the messages for OpenAI
    const systemPrompt = userPrompts?.blog_prompt || `You are a content strategist helping to generate blog ideas based on research and brand voice. 
    The institution's brand voice is: ${brandAssets.brand_voice_description}
    
    Generate 5 unique blog ideas that align with the brand voice and are based on the research.
    Format each idea as a clear, concise concept that could be developed into a full blog post.
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - Return ONLY a JSON array of strings
    - Each string should be a complete blog idea
    - Do not include any additional text or explanation
    - The response should be valid JSON that can be parsed
    
    Example format:
    ["Exploring the impact of climate change on coastal communities", "The role of technology in modern education", "Sustainable practices in urban development"]`;

    console.log('Final system prompt being used:', systemPrompt);

    const userMessage = `Using the following research:
    Title: ${research_title}
    Content: ${research_text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      functions: [
        {
          name: "generate_blog_ideas",
          description: "Generate blog ideas based on research",
          parameters: {
            type: "object",
            properties: {
              ideas: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of blog ideas"
              }
            },
            required: ["ideas"]
          }
        }
      ],
      function_call: { name: "generate_blog_ideas" },
      temperature: 0.7,
      max_tokens: 1000
    });

    // Parse the function call response and validate
    let ideas;
    try {
      const functionCall = completion.choices[0].message.function_call;
      if (!functionCall || functionCall.name !== "generate_blog_ideas") {
        throw new Error('Invalid function call response');
      }
      const args = JSON.parse(functionCall.arguments);
      ideas = args.ideas;
      if (!Array.isArray(ideas)) {
        throw new Error('Response is not an array');
      }
      ideas = ideas.map(idea => idea.trim()).filter(idea => idea.length > 0);
    } catch (error) {
      console.error('Error parsing blog ideas:', error);
      throw new Error('Failed to parse blog ideas response');
    }

    if (ideas.length === 0) {
      throw new Error('No valid blog ideas were generated');
    }

    // Save each idea to the blogs table
    const blogPromises = ideas.map(idea => 
      supabase
        .from('blogs')
        .insert([
          {
            concept: idea,
            title: '', // These will be filled in later when the blog is developed
            main_text: '',
            research_id: research_id
          }
        ])
        .select()
    );

    const results = await Promise.all(blogPromises);
    
    // Check for any errors in the insert operations
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      throw new Error('Failed to save some blog ideas');
    }

    res.json({ 
      message: 'Blog ideas generated and saved successfully',
      count: ideas.length
    });
  } catch (error) {
    console.error('Error generating blog ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 