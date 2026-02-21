// Self Check-in Eligibility Decision Engine
// Computes whether a person is allowed to self check-in based on policies, overrides, and geofence

import { createClient } from "@/lib/supabase/server";

export interface EligibilityInput {
  orgId: string;
  sessionId: string;
  personId?: string;
  userId?: string;
  method: "qr" | "geo" | "event_code" | "kiosk";
  lat?: number;
  lng?: number;
  accuracy?: number;
  eventCode?: string;
  qrToken?: string;
}

export interface EligibilityResult {
  allowed: boolean;
  reason: string;
  policy?: {
    mode: string;
    requireGeofence: boolean;
    requireEventCode: boolean;
    requireLinkedUser: boolean;
  };
  requiresInvite?: boolean;
  requiresLogin?: boolean;
  distanceMeters?: number;
  geofenceRadius?: number;
}

interface Session {
  id: string;
  org_id: string;
  name: string;
  start_at: string;
  end_at: string;
  status: string;
  location_id: string;
  group_id: string | null;
  public_code: string;
  event_qr_token: string;
  allowed_methods: { qr?: boolean; geo?: boolean; kiosk?: boolean; manual?: boolean };
  locations?: {
    id: string;
    lat: number | null;
    lng: number | null;
  } | null;
}

interface Policy {
  mode: string;
  eligible_set: string;
  require_linked_user: boolean;
  require_geofence: boolean;
  require_event_code: boolean;
}

interface Geofence {
  radius_m: number;
  type: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function computeSelfCheckinEligibility(
  input: EligibilityInput
): Promise<EligibilityResult> {
  const supabase = await createClient();
  const { orgId, sessionId, personId, userId, method, lat, lng, eventCode, qrToken } = input;

  // 1. Fetch session with location
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(`
      id, org_id, name, start_at, end_at, status, location_id, group_id, public_code, event_qr_token, allowed_methods,
      locations (id, lat, lng)
    `)
    .eq("id", sessionId)
    .eq("org_id", orgId)
    .single();

  if (sessionError || !session) {
    return { allowed: false, reason: "Session not found" };
  }

  const typedSession = session as unknown as Session;

  const methodAllowed =
    (method === "qr" && typedSession.allowed_methods?.qr !== false) ||
    (method === "geo" && typedSession.allowed_methods?.geo !== false) ||
    (method === "event_code" && typedSession.allowed_methods?.manual !== false) ||
    (method === "kiosk" && typedSession.allowed_methods?.kiosk !== false);

  if (!methodAllowed) {
    return { allowed: false, reason: "This check-in method is not enabled for this event" };
  }

  // Check session status
  if (typedSession.status === "cancelled") {
    return { allowed: false, reason: "This session has been cancelled" };
  }

  // Check time window (allow 15 min early, 30 min late)
  const now = new Date();
  const startTime = new Date(typedSession.start_at);
  const endTime = new Date(typedSession.end_at);
  const earlyWindow = new Date(startTime.getTime() - 15 * 60 * 1000);
  const lateWindow = new Date(endTime.getTime() + 30 * 60 * 1000);

  if (now < earlyWindow) {
    return { allowed: false, reason: "Check-in is not yet open. Please wait until closer to the session start time." };
  }

  if (now > lateWindow) {
    return { allowed: false, reason: "Check-in window has closed for this session" };
  }

  // 2. Resolve effective policy (session -> group -> org -> default)
  let policy: Policy = {
    mode: "disabled",
    eligible_set: "all_members",
    require_linked_user: false,
    require_geofence: true,
    require_event_code: true,
  };

  // Try session-level policy
  const { data: sessionPolicy } = await supabase
    .from("self_checkin_policies")
    .select("*")
    .eq("org_id", orgId)
    .eq("scope_type", "session")
    .eq("scope_id", sessionId)
    .single();

  if (sessionPolicy) {
    policy = sessionPolicy as Policy;
  } else if (typedSession.group_id) {
    // Try group-level policy
    const { data: groupPolicy } = await supabase
      .from("self_checkin_policies")
      .select("*")
      .eq("org_id", orgId)
      .eq("scope_type", "group")
      .eq("scope_id", typedSession.group_id)
      .single();

    if (groupPolicy) {
      policy = groupPolicy as Policy;
    } else {
      // Check group's self_checkin_enabled flag
      const { data: group } = await supabase
        .from("groups")
        .select("self_checkin_enabled, self_checkin_mode, self_checkin_require_invite")
        .eq("id", typedSession.group_id)
        .single();

      if (group && (group as any).self_checkin_enabled) {
        policy.mode = (group as any).self_checkin_mode || "public_with_code";
        policy.require_linked_user = (group as any).self_checkin_require_invite || false;
      }
    }
  }

  // Try org-level policy as fallback
  if (policy.mode === "disabled") {
    const { data: orgPolicy } = await supabase
      .from("self_checkin_policies")
      .select("*")
      .eq("org_id", orgId)
      .eq("scope_type", "org")
      .is("scope_id", null)
      .single();

    if (orgPolicy) {
      policy = orgPolicy as Policy;
    }
  }

  // 3. Check if mode is disabled
  if (policy.mode === "disabled") {
    return { 
      allowed: false, 
      reason: "Self check-in is not enabled for this session",
      policy: {
        mode: policy.mode,
        requireGeofence: policy.require_geofence,
        requireEventCode: policy.require_event_code,
        requireLinkedUser: policy.require_linked_user,
      }
    };
  }

  // 4. Enforce geofence (MANDATORY for all methods)
  if (policy.require_geofence) {
    if (lat === undefined || lng === undefined) {
      return { 
        allowed: false, 
        reason: "Location access is required for check-in. Please enable location services.",
        policy: {
          mode: policy.mode,
          requireGeofence: policy.require_geofence,
          requireEventCode: policy.require_event_code,
          requireLinkedUser: policy.require_linked_user,
        }
      };
    }

    const locationData = typedSession.locations;
    if (!locationData || locationData.lat === null || locationData.lng === null) {
      return { allowed: false, reason: "Session location is not configured for geofence check-in" };
    }

    // Get geofence for location
    const { data: geofence } = await supabase
      .from("geofences")
      .select("radius_m, type")
      .eq("location_id", typedSession.location_id)
      .single();

    const radius = (geofence as Geofence | null)?.radius_m || 100; // Default 100m radius
    const distance = calculateDistance(lat, lng, locationData.lat, locationData.lng);

    if (distance > radius) {
      return {
        allowed: false,
        reason: `You are ${Math.round(distance)}m away from the check-in zone. Please move within ${radius}m of the location.`,
        distanceMeters: Math.round(distance),
        geofenceRadius: radius,
        policy: {
          mode: policy.mode,
          requireGeofence: policy.require_geofence,
          requireEventCode: policy.require_event_code,
          requireLinkedUser: policy.require_linked_user,
        }
      };
    }
  }

  // 5. Validate event code/QR token for public mode
  if (method !== "kiosk" && policy.require_event_code && policy.mode === "public_with_code") {
    if (method === "event_code" && eventCode) {
      if (eventCode.toUpperCase() !== typedSession.public_code?.toUpperCase()) {
        return { allowed: false, reason: "Invalid event code. Please check and try again." };
      }
    } else if (method === "qr" && qrToken) {
      if (qrToken !== typedSession.event_qr_token) {
        return { allowed: false, reason: "Invalid QR code. Please scan the correct event QR." };
      }
    } else if (method !== "geo") {
      return { allowed: false, reason: "Event code or QR scan is required for check-in" };
    }
  }

  // 6. Resolve person
  let resolvedPersonId = personId;

  if (policy.mode === "authenticated") {
    if (!userId) {
      return { 
        allowed: false, 
        reason: "Please sign in to check in to this session",
        requiresLogin: true,
        policy: {
          mode: policy.mode,
          requireGeofence: policy.require_geofence,
          requireEventCode: policy.require_event_code,
          requireLinkedUser: policy.require_linked_user,
        }
      };
    }

    // Get linked person
    const { data: link } = await supabase
      .from("person_user_links")
      .select("person_id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!link) {
      return { 
        allowed: false, 
        reason: "Your account is not linked to a member profile. Please check your invite or contact an administrator.",
        requiresInvite: true,
        policy: {
          mode: policy.mode,
          requireGeofence: policy.require_geofence,
          requireEventCode: policy.require_event_code,
          requireLinkedUser: policy.require_linked_user,
        }
      };
    }

    resolvedPersonId = (link as { person_id: string }).person_id;
  }

  if (!resolvedPersonId) {
    return { allowed: false, reason: "Unable to identify member for check-in" };
  }

  // 7. Event attendance scopes (event == session)
  // If any scopes exist for this event, person must match at least one scope.
  const { data: scopes } = await supabase
    .from("event_attendance_scopes")
    .select("scope_type, scope_id")
    .eq("event_id", sessionId);

  const scopeRows = (scopes as any[]) || [];
  if (scopeRows.length > 0) {
    const orgOpen = scopeRows.some((s) => s.scope_type === "org");
    if (!orgOpen) {
      const personMatch = scopeRows.some((s) => s.scope_type === "person" && s.scope_id === resolvedPersonId);
      if (!personMatch) {
        const groupScopeIds = scopeRows.filter((s) => s.scope_type === "group").map((s) => s.scope_id).filter(Boolean);
        const cohortScopeIds = scopeRows.filter((s) => s.scope_type === "cohort").map((s) => s.scope_id).filter(Boolean);

        let matched = false;

        if (groupScopeIds.length > 0) {
          const { data: groupMembership } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("person_id", resolvedPersonId)
            .in("group_id", groupScopeIds)
            .limit(1);
          matched = !!groupMembership && (groupMembership as any[]).length > 0;
        }

        if (!matched && cohortScopeIds.length > 0) {
          const { data: cohortMembership } = await supabase
            .from("cohort_members")
            .select("cohort_id")
            .eq("person_id", resolvedPersonId)
            .in("cohort_id", cohortScopeIds)
            .limit(1);
          matched = !!cohortMembership && (cohortMembership as any[]).length > 0;
        }

        if (!matched) {
          return { allowed: false, reason: "You are not assigned to this event" };
        }
      }
    }
  }

  // 8. Enforce explicit session assignments if configured
  // If a session has any assigned people or groups, only those attendees are eligible.
  const [{ data: assignedPeople }, { data: assignedGroups }] = await Promise.all([
    supabase
      .from("session_people")
      .select("person_id")
      .eq("session_id", sessionId),
    supabase
      .from("session_groups")
      .select("group_id")
      .eq("session_id", sessionId),
  ]);

  const assignedPeopleIds = new Set(((assignedPeople as any[]) || []).map((r) => r.person_id as string));
  const assignedGroupIds = ((assignedGroups as any[]) || []).map((r) => r.group_id as string).filter(Boolean);
  const hasAssignments = assignedPeopleIds.size > 0 || assignedGroupIds.length > 0;

  if (hasAssignments) {
    if (assignedPeopleIds.has(resolvedPersonId)) {
      // allowed
    } else if (assignedGroupIds.length > 0) {
      const { data: groupMembership } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("person_id", resolvedPersonId)
        .in("group_id", assignedGroupIds)
        .limit(1);

      if (!groupMembership || (groupMembership as any[]).length === 0) {
        return { allowed: false, reason: "You are not assigned to this session" };
      }
    } else {
      return { allowed: false, reason: "You are not assigned to this session" };
    }
  }

  // 9. Check group membership if session has a group
  if (typedSession.group_id) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", typedSession.group_id)
      .eq("person_id", resolvedPersonId)
      .single();

    if (!membership && policy.eligible_set === "all_members") {
      // Check for allow override
      const { data: allowOverride } = await supabase
        .from("self_checkin_access_overrides")
        .select("access")
        .eq("org_id", orgId)
        .eq("scope_type", "group")
        .eq("scope_id", typedSession.group_id)
        .eq("person_id", resolvedPersonId)
        .eq("access", "allow")
        .single();

      if (!allowOverride) {
        return { allowed: false, reason: "You are not a member of the group for this session" };
      }
    }
  }

  // 10. Check for deny override
  const { data: denyOverride } = await supabase
    .from("self_checkin_access_overrides")
    .select("access, reason")
    .eq("org_id", orgId)
    .eq("person_id", resolvedPersonId)
    .eq("access", "deny")
    .or(`scope_type.eq.session,scope_id.eq.${sessionId},scope_type.eq.group,scope_id.eq.${typedSession.group_id || 'null'}`)
    .limit(1)
    .single();

  if (denyOverride) {
    return { 
      allowed: false, 
      reason: (denyOverride as { reason?: string }).reason || "Your check-in access has been restricted. Please contact an administrator." 
    };
  }

  // 11. Check if already checked in
  const { data: existingRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("session_id", sessionId)
    .eq("person_id", resolvedPersonId)
    .single();

  if (existingRecord) {
    return { allowed: false, reason: "You have already checked in to this session" };
  }

  // All checks passed
  return {
    allowed: true,
    reason: "Eligible for check-in",
    policy: {
      mode: policy.mode,
      requireGeofence: policy.require_geofence,
      requireEventCode: policy.require_event_code,
      requireLinkedUser: policy.require_linked_user,
    }
  };
}

// Client-side version for eligibility preview (doesn't do full validation)
export function calculateDistanceClient(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateDistance(lat1, lng1, lat2, lng2);
}
