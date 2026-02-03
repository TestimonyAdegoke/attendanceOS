-- Add insert policies needed for signup + onboarding flows

-- Allow any authenticated user to create an organization
CREATE POLICY "Users can create organizations"
ON organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to create an org_memberships row for themselves
CREATE POLICY "Users can create own membership"
ON org_memberships
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow org owners to create org plans for their org
CREATE POLICY "Org owners can create plans"
ON org_plans
FOR INSERT
WITH CHECK (user_has_role(org_id, ARRAY['org_owner'::org_role]));
