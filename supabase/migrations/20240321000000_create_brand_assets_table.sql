-- Set search path
SET search_path TO public;

-- Create brand_assets table
CREATE TABLE IF NOT EXISTS public.brand_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL,
    logo TEXT,
    primary_colour TEXT,
    secondary_colour TEXT,
    brand_voice_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_institution FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT unique_institution UNIQUE (institution_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_assets_institution ON brand_assets (institution_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_assets_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brand_assets_updated_at') THEN
        CREATE TRIGGER update_brand_assets_updated_at
            BEFORE UPDATE ON brand_assets
            FOR EACH ROW
            EXECUTE FUNCTION update_brand_assets_updated_at_column();
    END IF;
END$$;

-- Enable RLS
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view brand assets from their institution') THEN
        CREATE POLICY "Users can view brand assets from their institution"
            ON brand_assets FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.user_profiles up
                    WHERE up.id = auth.uid()
                    AND up.institution_id = brand_assets.institution_id
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update brand assets from their institution') THEN
        CREATE POLICY "Users can update brand assets from their institution"
            ON brand_assets FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.user_profiles up
                    WHERE up.id = auth.uid()
                    AND up.institution_id = brand_assets.institution_id
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert brand assets for their institution') THEN
        CREATE POLICY "Users can insert brand assets for their institution"
            ON brand_assets FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.user_profiles up
                    WHERE up.id = auth.uid()
                    AND up.institution_id = brand_assets.institution_id
                )
            );
    END IF;
END$$; 