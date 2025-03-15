-- Set search path
SET search_path TO public;

-- Create content_status table
CREATE TABLE IF NOT EXISTS content_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert predefined status values
INSERT INTO content_status (status) VALUES
    ('New Submission'),
    ('Capturing Source Text'),
    ('Source Text Captured'),
    ('Template Selected'),
    ('Generating Post Text'),
    ('Post Text Generated'),
    ('Generating Imagery'),
    ('Imagery Generated')
ON CONFLICT (status) DO NOTHING;

-- Enable RLS
ALTER TABLE content_status ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read the status values
CREATE POLICY "Allow authenticated users to read content status"
    ON content_status FOR SELECT
    TO authenticated
    USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 