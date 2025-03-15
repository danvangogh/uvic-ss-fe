-- Set search path
SET search_path TO public;

DO $$ 
BEGIN 
    -- Add requires_image column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'content_templates' 
        AND column_name = 'requires_image'
    ) THEN
        -- Add the column with a default value of false
        ALTER TABLE content_templates 
        ADD COLUMN requires_image BOOLEAN DEFAULT false NOT NULL;
    END IF;
END $$; 