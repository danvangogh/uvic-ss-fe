-- Set search path
SET search_path TO public;

DO $$ 
BEGIN 
    -- Remove requires_image column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'content_templates' 
        AND column_name = 'requires_image'
    ) THEN
        -- Drop the old column
        ALTER TABLE content_templates 
        DROP COLUMN requires_image;
        
        RAISE NOTICE 'Successfully removed requires_image column from content_templates table';
    ELSE
        RAISE NOTICE 'requires_image column does not exist in content_templates table';
    END IF;
END $$; 