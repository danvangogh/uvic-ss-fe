-- Create user_prompts table
CREATE TABLE IF NOT EXISTS user_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    blog_prompt TEXT,
    interview_prompt TEXT,
    summary_prompt TEXT,
    question_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts"
    ON user_prompts FOR SELECT
    USING (auth.uid() = user_profile_id);

CREATE POLICY "Users can insert their own prompts"
    ON user_prompts FOR INSERT
    WITH CHECK (auth.uid() = user_profile_id);

CREATE POLICY "Users can update their own prompts"
    ON user_prompts FOR UPDATE
    USING (auth.uid() = user_profile_id)
    WITH CHECK (auth.uid() = user_profile_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_prompts_updated_at
    BEFORE UPDATE ON user_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 