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
    const { data: prompts, error } = await supabase
      .from('user_prompts')
      .select('*')
      .eq('user_profile_id', req.user.id)
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
    const { blog_prompt, interview_prompt, summary_prompt, question_prompt } = req.body;
    
    const { data, error } = await supabase
      .from('user_prompts')
      .upsert({
        user_profile_id: req.user.id,
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

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are a content strategist helping to generate blog ideas based on research and brand voice. 
    The institution's brand voice is: ${brandAssets.brand_voice_description}
    
    Using the following research:
    Title: ${research_title}
    Content: ${research_text}
    
    Generate 5 unique blog ideas that align with the brand voice and are based on the research.
    Format each idea as a clear, concise concept that could be developed into a full blog post.
    Return ONLY the two ideas, one per line, without any additional text or numbering.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Split the response into individual ideas
    const ideas = completion.choices[0].message.content
      .split('\n')
      .map(idea => idea.trim())
      .filter(idea => idea.length > 0);

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