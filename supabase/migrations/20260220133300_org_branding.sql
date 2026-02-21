-- Organization branding fields
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS brand_primary TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent TEXT,
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- Defaults
UPDATE organizations
SET brand_primary = COALESCE(brand_primary, '#4f46e5'),
    brand_accent = COALESCE(brand_accent, '#06b6d4')
WHERE brand_primary IS NULL OR brand_accent IS NULL;
