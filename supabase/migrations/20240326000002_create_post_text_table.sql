-- Set search path
SET search_path TO public;

-- Create post_text table
CREATE TABLE IF NOT EXISTS post_text (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_content_id UUID NOT NULL UNIQUE REFERENCES source_content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    p1a TEXT,
    p1b TEXT,
    p2a TEXT,
    p2b TEXT,
    p3a TEXT,
    p3b TEXT,
    p4a TEXT,
    p4b TEXT,
    p5a TEXT,
    p5b TEXT,
    p6a TEXT,
    p6b TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_post_text_source_content_id ON post_text(source_content_id);
CREATE INDEX IF NOT EXISTS idx_post_text_user_id ON post_text(user_id);
CREATE INDEX IF NOT EXISTS idx_post_text_institution_id ON post_text(institution_id);

-- Enable Row Level Security
ALTER TABLE post_text ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view post_text they have access to" ON post_text
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = post_text.institution_id
        )
    );

CREATE POLICY "Users can insert post_text for their institution" ON post_text
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = post_text.institution_id
        )
    );

CREATE POLICY "Users can update post_text they have access to" ON post_text
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = post_text.institution_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = post_text.institution_id
        )
    );

CREATE POLICY "Users can delete post_text they have access to" ON post_text
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = post_text.institution_id
        )
    );

-- Create trigger for updating updated_at timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_post_text_updated_at'
        AND tgrelid = 'post_text'::regclass
    ) THEN
        CREATE TRIGGER update_post_text_updated_at
            BEFORE UPDATE ON post_text
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 