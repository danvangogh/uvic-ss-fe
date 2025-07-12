-- Set search path
SET search_path TO public;

-- First, remove the foreign key constraint from source_content
ALTER TABLE source_content
DROP CONSTRAINT IF EXISTS source_content_content_status_id_fkey;

-- Add the new boolean status columns to source_content
ALTER TABLE source_content
ADD COLUMN IF NOT EXISTS is_new_submission BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_capturing_source_text BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_source_text_captured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template_selected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_generating_post_text BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_post_text_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_generating_imagery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_imagery_generated BOOLEAN DEFAULT false;

-- Migrate existing status data to the new boolean columns
DO $$
BEGIN
    -- Set appropriate boolean flags based on current content_status_id
    UPDATE source_content
    SET 
        is_new_submission = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'New Submission') 
            THEN true ELSE false END,
        is_capturing_source_text = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Capturing Source Text') 
            THEN true ELSE false END,
        is_source_text_captured = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Source Text Captured') 
            THEN true ELSE false END,
        is_template_selected = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Template Selected') 
            THEN true ELSE false END,
        is_generating_post_text = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Generating Post Text') 
            THEN true ELSE false END,
        is_post_text_generated = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Post Text Generated') 
            THEN true ELSE false END,
        is_generating_imagery = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Generating Imagery') 
            THEN true ELSE false END,
        is_imagery_generated = CASE 
            WHEN content_status_id IN (SELECT id FROM content_status WHERE status = 'Imagery Generated') 
            THEN true ELSE false END;
END $$;

-- Drop the content_status_id column from source_content
ALTER TABLE source_content
DROP COLUMN IF EXISTS content_status_id;

-- Drop the content_status table as it's no longer needed
DROP TABLE IF EXISTS content_status; 