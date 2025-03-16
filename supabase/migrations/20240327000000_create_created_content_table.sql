-- Set search path
SET search_path TO public;

-- Create created_content table
CREATE TABLE IF NOT EXISTS public.created_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_content_id UUID NOT NULL REFERENCES source_content(id) ON DELETE CASCADE,
    url_object JSONB NOT NULL,
    pdf_url TEXT,
    video_url TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_created_content_source_content ON created_content(source_content_id);
CREATE INDEX IF NOT EXISTS idx_created_content_user ON created_content(user_id);
CREATE INDEX IF NOT EXISTS idx_created_content_institution ON created_content(institution_id);

-- Create trigger for updating updated_at timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_created_content_updated_at'
        AND tgrelid = 'created_content'::regclass
    ) THEN
        CREATE TRIGGER update_created_content_updated_at
            BEFORE UPDATE ON created_content
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE created_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view created_content they have access to" ON created_content
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = created_content.institution_id
        )
    );

CREATE POLICY "Users can insert created_content for their institution" ON created_content
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = created_content.institution_id
        )
    );

CREATE POLICY "Users can update created_content they have access to" ON created_content
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = created_content.institution_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = created_content.institution_id
        )
    );

CREATE POLICY "Users can delete created_content they have access to" ON created_content
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.institution_id = created_content.institution_id
        )
    ); 