-- Flexible org-specific attributes for people
ALTER TABLE people
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
