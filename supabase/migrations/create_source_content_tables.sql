-- Set search path
SET search_path TO public;

-- Verify tables exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        RAISE EXCEPTION 'Table user_profiles does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'institutions'
    ) THEN
        RAISE EXCEPTION 'Table institutions does not exist';
    END IF;
END $$;

-- Create source_content table
CREATE TABLE IF NOT EXISTS public.source_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_content_title TEXT NOT NULL,
    source_content_main_text TEXT,
    source_content_url TEXT,
    source_content_pdf TEXT,
    source_content_type TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES public.institutions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create images table
CREATE TABLE IF NOT EXISTS public.images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_credit TEXT,
    source_content_id UUID NOT NULL REFERENCES public.source_content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES public.institutions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_source_content_user ON source_content(user_id);
CREATE INDEX IF NOT EXISTS idx_source_content_institution ON source_content(institution_id);
CREATE INDEX IF NOT EXISTS idx_images_source_content ON images(source_content_id);
CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_institution ON images(institution_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_source_content_updated_at
    BEFORE UPDATE ON source_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE source_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own source content" ON source_content;
DROP POLICY IF EXISTS "Users can insert their own source content" ON source_content;
DROP POLICY IF EXISTS "Users can update their own source content" ON source_content;
DROP POLICY IF EXISTS "Users can delete their own source content" ON source_content;
DROP POLICY IF EXISTS "Users can view their own images" ON images;
DROP POLICY IF EXISTS "Users can insert their own images" ON images;
DROP POLICY IF EXISTS "Users can update images for their source content" ON images;
DROP POLICY IF EXISTS "Users can delete their own images" ON images;

-- Create RLS policies for source_content
CREATE POLICY "Users can view their own source content"
    ON source_content FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = source_content.institution_id
        )
    );

CREATE POLICY "Users can insert their own source content"
    ON source_content FOR INSERT
    TO authenticated
    WITH CHECK (
        source_content.user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = source_content.institution_id
        )
    );

CREATE POLICY "Users can update their own source content"
    ON source_content FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = source_content.institution_id
        )
    )
    WITH CHECK (
        source_content.user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = source_content.institution_id
        )
    );

CREATE POLICY "Users can delete their own source content"
    ON source_content FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = source_content.institution_id
        )
    );

-- Create RLS policies for images
CREATE POLICY "Users can view their own images"
    ON images FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = images.institution_id
        )
    );

CREATE POLICY "Users can insert their own images"
    ON images FOR INSERT
    TO authenticated
    WITH CHECK (
        images.user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = images.institution_id
        )
    );

CREATE POLICY "Users can update their own images"
    ON images FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = images.institution_id
        )
    )
    WITH CHECK (
        images.user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = images.institution_id
        )
    );

CREATE POLICY "Users can delete their own images"
    ON images FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = images.institution_id
        )
    ); 