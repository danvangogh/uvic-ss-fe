-- Create research table
CREATE TABLE research (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    main_text TEXT NOT NULL,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on institution_id for faster lookups
CREATE INDEX research_institution_id_idx ON research(institution_id);

-- Create an index on user_profile_id for faster lookups
CREATE INDEX research_user_profile_id_idx ON research(user_profile_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON research
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE research ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view research from their institution
CREATE POLICY "Users can view research from their institution"
    ON research FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy to allow users to insert research for their institution
CREATE POLICY "Users can insert research for their institution"
    ON research FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT institution_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy to allow users to update their own research
CREATE POLICY "Users can update their own research"
    ON research FOR UPDATE
    USING (user_profile_id = auth.uid());

-- Policy to allow users to delete their own research
CREATE POLICY "Users can delete their own research"
    ON research FOR DELETE
    USING (user_profile_id = auth.uid()); 