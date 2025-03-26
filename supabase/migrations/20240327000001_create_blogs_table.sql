-- Create blogs table
CREATE TABLE blogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept TEXT NOT NULL,
    title TEXT NOT NULL,
    main_text TEXT NOT NULL,
    image_url TEXT,
    research_id UUID REFERENCES research(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an index on research_id for faster lookups
CREATE INDEX blogs_research_id_idx ON blogs(research_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view blogs from their institution's research
CREATE POLICY "Users can view blogs from their institution's research"
    ON blogs FOR SELECT
    USING (
        research_id IN (
            SELECT r.id 
            FROM research r
            JOIN user_profiles up ON r.user_profile_id = up.id
            WHERE up.institution_id IN (
                SELECT institution_id 
                FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy to allow users to insert blogs for their institution's research
CREATE POLICY "Users can insert blogs for their institution's research"
    ON blogs FOR INSERT
    WITH CHECK (
        research_id IN (
            SELECT r.id 
            FROM research r
            JOIN user_profiles up ON r.user_profile_id = up.id
            WHERE up.institution_id IN (
                SELECT institution_id 
                FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy to allow users to update blogs from their institution's research
CREATE POLICY "Users can update blogs from their institution's research"
    ON blogs FOR UPDATE
    USING (
        research_id IN (
            SELECT r.id 
            FROM research r
            JOIN user_profiles up ON r.user_profile_id = up.id
            WHERE up.institution_id IN (
                SELECT institution_id 
                FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        research_id IN (
            SELECT r.id 
            FROM research r
            JOIN user_profiles up ON r.user_profile_id = up.id
            WHERE up.institution_id IN (
                SELECT institution_id 
                FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy to allow users to delete blogs from their institution's research
CREATE POLICY "Users can delete blogs from their institution's research"
    ON blogs FOR DELETE
    USING (
        research_id IN (
            SELECT r.id 
            FROM research r
            JOIN user_profiles up ON r.user_profile_id = up.id
            WHERE up.institution_id IN (
                SELECT institution_id 
                FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    ); 