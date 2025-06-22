-- Set search path
SET search_path TO public;

DO $$ 
BEGIN 
    -- Add minimum_images column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'content_templates' 
        AND column_name = 'minimum_images'
    ) THEN
        -- Add the new column with a default value of 0
        ALTER TABLE content_templates 
        ADD COLUMN minimum_images INTEGER DEFAULT 0 NOT NULL;
        
        -- Migrate existing data: if requires_image was true, set minimum_images to 1
        UPDATE content_templates 
        SET minimum_images = 1 
        WHERE requires_image = true;
        
        -- Add a comment to document the migration
        COMMENT ON COLUMN content_templates.minimum_images IS 'Minimum number of images required for this template. 0 means no images required.';
    END IF;
END $$; 