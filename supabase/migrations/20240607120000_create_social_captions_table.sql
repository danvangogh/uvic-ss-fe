-- Migration: Create social_captions table
CREATE TABLE social_captions (
  id uuid PRIMARY KEY REFERENCES source_content(id) ON DELETE CASCADE,
  bluesky_caption text,
  linkedin_caption text,
  facebook_caption text,
  instagram_caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on row update
CREATE OR REPLACE FUNCTION update_social_captions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_social_captions_updated_at
BEFORE UPDATE ON social_captions
FOR EACH ROW EXECUTE FUNCTION update_social_captions_updated_at(); 