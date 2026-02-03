-- Super Admin Role and Person-User Links Migration
-- This migration adds super admin support and links between people (attendees) and users (auth accounts)

-- Add is_super_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Create person_user_links table to link people (attendees) to users (auth accounts)
-- This allows a subset of people to have authenticated portal access
CREATE TABLE IF NOT EXISTS person_user_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, person_id),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_person_user_links_org_id ON person_user_links(org_id);
CREATE INDEX IF NOT EXISTS idx_person_user_links_person_id ON person_user_links(person_id);
CREATE INDEX IF NOT EXISTS idx_person_user_links_user_id ON person_user_links(user_id);

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to get linked person_id for current user in an org
CREATE OR REPLACE FUNCTION get_linked_person_id(p_org_id UUID)
RETURNS UUID AS $$
  SELECT person_id FROM person_user_links 
  WHERE org_id = p_org_id AND user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS for person_user_links
ALTER TABLE person_user_links ENABLE ROW LEVEL SECURITY;

-- Super admins can do anything
CREATE POLICY "Super admins full access to person_user_links"
  ON person_user_links FOR ALL
  USING (is_super_admin());

-- Org admins can manage links in their org
CREATE POLICY "Org admins can manage person_user_links"
  ON person_user_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = person_user_links.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('org_owner', 'admin')
    )
  );

-- Users can view their own link
CREATE POLICY "Users can view own person_user_link"
  ON person_user_links FOR SELECT
  USING (user_id = auth.uid());
