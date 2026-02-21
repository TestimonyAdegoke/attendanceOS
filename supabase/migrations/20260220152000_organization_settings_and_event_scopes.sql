-- Organization theming + event attendance scopes

DO $$ BEGIN
  CREATE TYPE theme_mode AS ENUM ('light', 'dark', 'auto');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organization_settings (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL DEFAULT '#4f46e5',
  secondary_color TEXT NOT NULL DEFAULT '#06b6d4',
  accent_color TEXT NOT NULL DEFAULT '#06b6d4',
  theme_mode theme_mode NOT NULL DEFAULT 'auto',
  logo_url TEXT,
  favicon_url TEXT,
  background_style TEXT,
  kiosk_background_style TEXT,
  font_family TEXT,
  portal_layout_variant TEXT,
  custom_labels JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_settings_updated_at ON organization_settings;
CREATE TRIGGER trg_org_settings_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- Cohorts
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_org_id ON cohorts(org_id);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cohort_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort_id ON cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_person_id ON cohort_members(person_id);

-- Event attendance scopes (event == session)
CREATE TABLE IF NOT EXISTS event_attendance_scopes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org','cohort','group','person')),
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_event_scopes_event_id ON event_attendance_scopes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scopes_org_id ON event_attendance_scopes(org_id);
