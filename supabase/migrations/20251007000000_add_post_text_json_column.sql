-- Set search path
SET search_path TO public;

-- Add post_text_json column to store template-specific text in JSON format
-- This is a non-destructive migration - all existing columns remain intact
-- JSON structure: { "template_id": { "p1a": "text", "p1b": "text", ... }, ... }

ALTER TABLE post_text
ADD COLUMN IF NOT EXISTS post_text_json JSONB DEFAULT '{}'::jsonb;

-- Add index on post_text_json for better query performance
CREATE INDEX IF NOT EXISTS idx_post_text_json ON post_text USING GIN (post_text_json);

-- Add a comment to explain the column structure
COMMENT ON COLUMN post_text.post_text_json IS 'Stores template-specific text content. Structure: { "template_id": { "p1a": "text", "p1b": "text", ... } }';

-- Update the updated_at timestamp trigger to include post_text_json changes
-- (If the trigger doesn't exist, this will be skipped)
DO $$ 
BEGIN
  -- Check if trigger exists and recreate if needed
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_text_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_post_text_updated_at ON post_text;
  END IF;
END $$;

-- Create or replace the update trigger
CREATE OR REPLACE FUNCTION update_post_text_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_text_updated_at
  BEFORE UPDATE ON post_text
  FOR EACH ROW
  EXECUTE FUNCTION update_post_text_timestamp();


