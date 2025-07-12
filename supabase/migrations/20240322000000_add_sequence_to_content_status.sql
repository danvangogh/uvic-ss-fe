-- Set search path
SET search_path TO public;

-- Add sequence column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'content_status' 
        AND column_name = 'sequence'
    ) THEN
        -- Add the sequence column
        ALTER TABLE content_status 
        ADD COLUMN sequence INTEGER;

        -- Update existing status values with their sequence numbers
        UPDATE content_status 
        SET sequence = CASE status
            WHEN 'New Submission' THEN 1
            WHEN 'Capturing Source Text' THEN 2
            WHEN 'Source Text Captured' THEN 3
            WHEN 'Template Selected' THEN 4
            WHEN 'Generating Post Text' THEN 5
            WHEN 'Post Text Generated' THEN 6
            WHEN 'Generating Imagery' THEN 7
            WHEN 'Imagery Generated' THEN 8
        END;

        -- Make the column NOT NULL after setting values
        ALTER TABLE content_status 
        ALTER COLUMN sequence SET NOT NULL;

        -- Add a unique constraint to ensure no duplicate sequences
        ALTER TABLE content_status
        ADD CONSTRAINT unique_status_sequence UNIQUE (sequence);
    END IF;
END $$; 