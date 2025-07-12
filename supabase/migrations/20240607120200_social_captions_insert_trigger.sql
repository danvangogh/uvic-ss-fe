-- Create a function to insert a matching social_captions record after source_content insert
CREATE OR REPLACE FUNCTION insert_social_captions_for_source_content()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO social_captions (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on source_content
DROP TRIGGER IF EXISTS trg_insert_social_captions ON source_content;
CREATE TRIGGER trg_insert_social_captions
AFTER INSERT ON source_content
FOR EACH ROW
EXECUTE FUNCTION insert_social_captions_for_source_content(); 