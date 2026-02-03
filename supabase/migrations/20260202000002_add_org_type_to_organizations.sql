-- Add org_type to organizations for org-aware people schemas
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'other'
  CHECK (org_type IN ('church', 'school', 'workplace', 'event', 'ngo', 'other'));
