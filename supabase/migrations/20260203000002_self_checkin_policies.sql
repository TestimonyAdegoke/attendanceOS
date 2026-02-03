-- Self Check-in Policies Migration
-- Defines policies for cohort-based and session-based self check-in access

-- Self check-in policy table
CREATE TABLE IF NOT EXISTS self_checkin_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org', 'group', 'session')),
  scope_id UUID, -- null if scope_type='org', otherwise references groups.id or sessions.id
  mode TEXT NOT NULL CHECK (mode IN ('disabled', 'public_with_code', 'authenticated')) DEFAULT 'disabled',
  eligible_set TEXT NOT NULL CHECK (eligible_set IN ('all_members', 'explicit_allowlist', 'explicit_denylist')) DEFAULT 'all_members',
  require_linked_user BOOLEAN NOT NULL DEFAULT false,
  require_geofence BOOLEAN NOT NULL DEFAULT true,
  require_event_code BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_self_checkin_policies_org_id ON self_checkin_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_self_checkin_policies_scope ON self_checkin_policies(scope_type, scope_id);

-- Self check-in access overrides (allow/deny per person)
CREATE TABLE IF NOT EXISTS self_checkin_access_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('group', 'session')),
  scope_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  access TEXT NOT NULL CHECK (access IN ('allow', 'deny')),
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, scope_type, scope_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_self_checkin_overrides_org_id ON self_checkin_access_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_self_checkin_overrides_scope ON self_checkin_access_overrides(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_self_checkin_overrides_person_id ON self_checkin_access_overrides(person_id);

-- RLS for self_checkin_policies
ALTER TABLE self_checkin_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to self_checkin_policies"
  ON self_checkin_policies FOR ALL
  USING (is_super_admin());

CREATE POLICY "Org admins can manage self_checkin_policies"
  ON self_checkin_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = self_checkin_policies.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('org_owner', 'admin')
    )
  );

CREATE POLICY "Org members can view self_checkin_policies"
  ON self_checkin_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = self_checkin_policies.org_id
      AND org_memberships.user_id = auth.uid()
    )
  );

-- RLS for self_checkin_access_overrides
ALTER TABLE self_checkin_access_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to self_checkin_access_overrides"
  ON self_checkin_access_overrides FOR ALL
  USING (is_super_admin());

CREATE POLICY "Org admins can manage self_checkin_access_overrides"
  ON self_checkin_access_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = self_checkin_access_overrides.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('org_owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own overrides"
  ON self_checkin_access_overrides FOR SELECT
  USING (
    person_id IN (
      SELECT person_id FROM person_user_links WHERE user_id = auth.uid()
    )
  );
