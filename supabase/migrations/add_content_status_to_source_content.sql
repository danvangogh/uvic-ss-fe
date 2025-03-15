-- Set search path
SET search_path TO public;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'source_content' 
        AND column_name = 'content_status_id'
    ) THEN
        -- Add the foreign key column
        ALTER TABLE source_content 
        ADD COLUMN content_status_id UUID REFERENCES content_status(id);

        -- Update existing rows to have 'New Submission' status
        UPDATE source_content 
        SET content_status_id = (
            SELECT id 
            FROM content_status 
            WHERE status = 'New Submission'
        )
        WHERE content_status_id IS NULL;

        -- Make the column NOT NULL after setting values for existing rows
        ALTER TABLE source_content 
        ALTER COLUMN content_status_id 
        SET NOT NULL;
    END IF;
END $$; 