-- Set search path and verify schema
SET search_path TO public;

-- Verify institutions table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'institutions'
    ) THEN
        RAISE EXCEPTION 'Table institutions does not exist';
    END IF;
END $$;

-- Create content_template_post_types table first (for referential integrity)
CREATE TABLE IF NOT EXISTS public.content_template_post_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_template_post_type_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert the three predefined post types
INSERT INTO public.content_template_post_types (content_template_post_type_name) VALUES
    ('carousel'),
    ('single_image'),
    ('video')
ON CONFLICT (content_template_post_type_name) DO NOTHING;

-- Create content_templates table
CREATE TABLE IF NOT EXISTS public.content_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL,
    template_name TEXT NOT NULL,
    template_thumbnail_url TEXT,
    template_content_description TEXT,
    template_content_schema TEXT,
    template_set_id TEXT,
    video_template_id TEXT,
    template_id_p1 TEXT,
    template_id_p2 TEXT,
    template_id_p3 TEXT,
    template_id_p4 TEXT,
    template_id_p5 TEXT,
    template_id_p6 TEXT,
    post_type_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_institution FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT fk_post_type FOREIGN KEY (post_type_id) REFERENCES public.content_template_post_types(id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_content_templates_name ON content_templates (template_name);
CREATE INDEX IF NOT EXISTS idx_content_templates_post_type ON content_templates (post_type_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_institution ON content_templates (institution_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_templates_updated_at') THEN
        CREATE TRIGGER update_content_templates_updated_at
            BEFORE UPDATE ON content_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_templates_updated_at_column();
    END IF;
END$$;

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'content_template_post_types' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE content_template_post_types ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'content_templates' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
    END IF;
END$$;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view post types') THEN
        CREATE POLICY "Authenticated users can view post types"
            ON content_template_post_types FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view templates from their institution') THEN
        CREATE POLICY "Users can view templates from their institution"
            ON content_templates FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.user_profiles up
                    WHERE up.id = auth.uid()
                    AND up.institution_id = content_templates.institution_id
                )
            );
    END IF;
END$$; 