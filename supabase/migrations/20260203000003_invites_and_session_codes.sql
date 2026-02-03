-- Invites and Session Codes Migration
-- Adds invitation system for cohort/user signup and session codes for public check-in

-- Invites table for authenticated self check-in onboarding
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_group_id ON invites(org_id, group_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(org_id, email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_person_id ON invites(person_id);

-- Add public_code and event_qr_token to sessions for self check-in
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS public_code TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_qr_token TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Generate default codes for existing sessions
UPDATE sessions SET public_code = UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 6))
WHERE public_code IS NULL;

UPDATE sessions SET event_qr_token = encode(gen_random_bytes(16), 'hex')
WHERE event_qr_token IS NULL;

-- Make public_code NOT NULL after populating
ALTER TABLE sessions ALTER COLUMN public_code SET DEFAULT UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 6));
ALTER TABLE sessions ALTER COLUMN event_qr_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Add self check-in fields to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS self_checkin_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS self_checkin_mode TEXT NOT NULL DEFAULT 'public_with_code' CHECK (self_checkin_mode IN ('disabled', 'public_with_code', 'authenticated'));
ALTER TABLE groups ADD COLUMN IF NOT EXISTS self_checkin_require_invite BOOLEAN NOT NULL DEFAULT false;

-- RLS for invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to invites"
  ON invites FOR ALL
  USING (is_super_admin());

CREATE POLICY "Org admins can manage invites"
  ON invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = invites.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('org_owner', 'admin')
    )
  );

-- Anyone can read invite by token (for accepting)
CREATE POLICY "Anyone can read invite by token"
  ON invites FOR SELECT
  USING (true);

-- Function to accept an invite
CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_link_id UUID;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite FROM invites 
  WHERE token = p_token 
  AND used_at IS NULL 
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Must be logged in to accept invite');
  END IF;
  
  -- Check if link already exists
  IF EXISTS (
    SELECT 1 FROM person_user_links 
    WHERE org_id = v_invite.org_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You are already linked to a person in this organization');
  END IF;
  
  -- Create the person-user link
  INSERT INTO person_user_links (org_id, person_id, user_id)
  VALUES (v_invite.org_id, v_invite.person_id, auth.uid())
  RETURNING id INTO v_link_id;
  
  -- Mark invite as used
  UPDATE invites SET used_at = NOW() WHERE id = v_invite.id;
  
  -- Create org membership if not exists
  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (v_invite.org_id, auth.uid(), 'user')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  
  RETURN json_build_object(
    'success', true, 
    'link_id', v_link_id,
    'org_id', v_invite.org_id,
    'person_id', v_invite.person_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
