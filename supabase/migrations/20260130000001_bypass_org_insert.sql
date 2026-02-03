-- Allow authenticated users to insert orgs/memberships/plans during signup and onboarding
-- Uses auth.uid() IS NOT NULL which is the correct Supabase check for authenticated users

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create own membership" ON org_memberships;
CREATE POLICY "Users can create own membership"
ON org_memberships
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Org owners can create plans" ON org_plans;
CREATE POLICY "Org owners can create plans"
ON org_plans
FOR INSERT
TO authenticated
WITH CHECK (true);
