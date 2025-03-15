-- Set search path
SET search_path TO public;

DO $$ 
BEGIN 
    -- Add template_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'source_content' 
        AND column_name = 'template_id'
    ) THEN
        -- Add the foreign key column
        ALTER TABLE source_content 
        ADD COLUMN template_id UUID REFERENCES content_templates(id);

        -- Note: We're not making this NOT NULL because:
        -- 1. Existing rows won't have a template
        -- 2. Source content starts without a template (selected later in workflow)
        -- 3. This matches the "Template Selected" status in our workflow
    END IF;

    -- Create an index for the foreign key
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'source_content'
        AND indexname = 'idx_source_content_template'
    ) THEN
        CREATE INDEX idx_source_content_template ON source_content(template_id);
    END IF;

    -- Update RLS policies to allow template access
    -- Users can view templates from their institution (policy already exists)
    -- Add policy for updating template_id if one doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE policyname = 'Users can update template for their own content'
        AND tablename = 'source_content'
    ) THEN
        CREATE POLICY "Users can update template for their own content"
            ON source_content 
            FOR UPDATE
            TO authenticated
            USING (
                user_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid()
                    AND user_profiles.institution_id = source_content.institution_id
                )
            )
            WITH CHECK (
                user_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid()
                    AND user_profiles.institution_id = source_content.institution_id
                )
            );
    END IF;
END $$; 