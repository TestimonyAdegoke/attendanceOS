// Authenticated Self Check-in API Route
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSelfCheckinEligibility } from "@/lib/checkin-eligibility";

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const supabase = await createClient();
    const { orgSlug } = params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get org by slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = (org as { id: string }).id;

    // Parse request body
    const body = await request.json();
    const { session_id, method, lat, lng, accuracy, event_code, qr_token } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!method || !["geo", "event_code", "qr"].includes(method)) {
      return NextResponse.json(
        { success: false, error: "Valid method is required (geo, event_code, qr)" },
        { status: 400 }
      );
    }

    // Check eligibility
    const eligibility = await computeSelfCheckinEligibility({
      orgId,
      sessionId: session_id,
      userId: user.id,
      method,
      lat,
      lng,
      accuracy,
      eventCode: event_code,
      qrToken: qr_token,
    });

    if (!eligibility.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: eligibility.reason,
          requiresLogin: eligibility.requiresLogin,
          requiresInvite: eligibility.requiresInvite,
          distanceMeters: eligibility.distanceMeters,
          geofenceRadius: eligibility.geofenceRadius,
        },
        { status: 403 }
      );
    }

    // Get linked person
    const { data: link } = await supabase
      .from("person_user_links")
      .select("person_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!link) {
      return NextResponse.json(
        { success: false, error: "No linked member profile found" },
        { status: 403 }
      );
    }

    const personId = (link as { person_id: string }).person_id;

    // Create attendance record
    const { data: record, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        org_id: orgId,
        session_id,
        person_id: personId,
        method: method === "event_code" ? "manual" : method,
        status: "present",
        lat,
        lng,
        accuracy_m: accuracy,
        meta: {
          self_checkin: true,
          authenticated: true,
          method_detail: method,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create attendance record:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to record check-in" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Check-in successful!",
      record,
    });
  } catch (error) {
    console.error("Self check-in error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
