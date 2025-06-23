-- Enable RLS on social_captions and add policies matching source_content
ALTER TABLE social_captions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own social captions" ON social_captions;
DROP POLICY IF EXISTS "Users can insert their own social captions" ON social_captions;
DROP POLICY IF EXISTS "Users can update their own social captions" ON social_captions;
DROP POLICY IF EXISTS "Users can delete their own social captions" ON social_captions;

-- SELECT policy
CREATE POLICY "Users can view their own social captions"
  ON social_captions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM source_content
      WHERE source_content.id = social_captions.id
      AND source_content.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = source_content.institution_id
      )
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own social captions"
  ON social_captions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM source_content
      WHERE source_content.id = social_captions.id
      AND source_content.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = source_content.institution_id
      )
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update their own social captions"
  ON social_captions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM source_content
      WHERE source_content.id = social_captions.id
      AND source_content.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = source_content.institution_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM source_content
      WHERE source_content.id = social_captions.id
      AND source_content.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = source_content.institution_id
      )
    )
  );

-- DELETE policy
CREATE POLICY "Users can delete their own social captions"
  ON social_captions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM source_content
      WHERE source_content.id = social_captions.id
      AND source_content.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = source_content.institution_id
      )
    )
  ); 