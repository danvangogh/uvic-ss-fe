-- Set search path
SET search_path TO public;

-- Add extracted_context column to store AI-extracted key information from long source content
-- This preserves context across regenerations and prevents re-processing

ALTER TABLE source_content
ADD COLUMN IF NOT EXISTS extracted_context JSONB DEFAULT NULL;

-- Add index for querying extracted context
CREATE INDEX IF NOT EXISTS idx_source_content_extracted_context ON source_content USING GIN (extracted_context);

-- Add a comment to explain the column structure
COMMENT ON COLUMN source_content.extracted_context IS 'AI-extracted key information from source content. Structure: { "main_thesis": "...", "key_findings": [...], "notable_quotes": [...], "audience_relevance": "...", "extracted_at": "timestamp", "source_token_count": number }';
