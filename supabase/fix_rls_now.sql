-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR TO FIX RLS ISSUES IMMEDIATELY
-- This script fixes the organization creation RLS policy that blocks signup/onboarding

-- Ensure RLS is enabled (should already be, but good to be sure)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_plans ENABLE ROW LEVEL SECURITY;

-- Step 1: Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create own membership" ON org_memberships;
DROP POLICY IF EXISTS "Org owners can create plans" ON org_plans;
DROP POLICY IF EXISTS "allow_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "allow_insert_org_memberships" ON org_memberships;
DROP POLICY IF EXISTS "allow_insert_org_plans" ON org_plans;
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON organizations;

-- Step 2: Create new policies
-- INSERT: Any authenticated user can create an organization
CREATE POLICY "allow_insert_organizations"
ON organizations FOR INSERT TO authenticated WITH CHECK (true);

-- SELECT: Essential so the user can see the org they just created
CREATE POLICY "allow_select_organizations"
ON organizations FOR SELECT TO authenticated USING (true);

-- Org Memberships: Any authenticated user can create their own membership
CREATE POLICY "allow_insert_org_memberships"
ON org_memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_select_org_memberships"
ON org_memberships FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Org Plans: Any authenticated user can create a plan for an org
CREATE POLICY "allow_insert_org_plans"
ON org_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_select_org_plans"
ON org_plans FOR SELECT TO authenticated USING (true);

-- Step 3: Verify policies exist
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('organizations', 'org_memberships', 'org_plans')
ORDER BY tablename, policyname;
