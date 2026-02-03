-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_plans ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations policies
CREATE POLICY "Users can view orgs they belong to" ON organizations
  FOR SELECT USING (id = ANY(get_user_org_ids()));

CREATE POLICY "Org owners can update org" ON organizations
  FOR UPDATE USING (user_has_role(id, ARRAY['org_owner'::org_role]));

-- Org memberships policies
CREATE POLICY "Users can view memberships in their orgs" ON org_memberships
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Org owners/admins can manage memberships" ON org_memberships
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- People policies
CREATE POLICY "Users can view people in their orgs" ON people
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage people" ON people
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Groups policies
CREATE POLICY "Users can view groups in their orgs" ON groups
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage groups" ON groups
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Group members policies
CREATE POLICY "Users can view group members in their orgs" ON group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.org_id = ANY(get_user_org_ids()))
  );

CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND user_has_role(g.org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]))
  );

-- Locations policies
CREATE POLICY "Users can view locations in their orgs" ON locations
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Geofences policies
CREATE POLICY "Users can view geofences in their orgs" ON geofences
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage geofences" ON geofences
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Event series policies
CREATE POLICY "Users can view event series in their orgs" ON event_series
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage event series" ON event_series
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role, 'location_manager'::org_role]));

-- Sessions policies
CREATE POLICY "Users can view sessions in their orgs" ON sessions
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role, 'location_manager'::org_role]));

-- Attendance records policies
CREATE POLICY "Users can view attendance in their orgs" ON attendance_records
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Operators can create attendance" ON attendance_records
  FOR INSERT WITH CHECK (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role, 'location_manager'::org_role, 'operator'::org_role]));

CREATE POLICY "Admins can update attendance" ON attendance_records
  FOR UPDATE USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Devices policies
CREATE POLICY "Users can view devices in their orgs" ON devices
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Admins can manage devices" ON devices
  FOR ALL USING (user_has_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- Audit logs policies
CREATE POLICY "Users can view audit logs in their orgs" ON audit_logs
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (org_id = ANY(get_user_org_ids()));

-- Org plans policies
CREATE POLICY "Users can view org plans" ON org_plans
  FOR SELECT USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Org owners can update plans" ON org_plans
  FOR UPDATE USING (user_has_role(org_id, ARRAY['org_owner'::org_role]));
