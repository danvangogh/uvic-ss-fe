ALTER TABLE images
ADD COLUMN sequence integer NOT NULL DEFAULT 1;

-- Add an index on sequence for better performance when sorting
CREATE INDEX idx_images_sequence ON images(sequence); 