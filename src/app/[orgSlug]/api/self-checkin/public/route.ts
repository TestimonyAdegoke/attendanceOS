// Public Self Check-in API Route (no login required)
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
    const { 
      session_code, 
      qr_token, 
      identifier, 
      identifier_type = "phone",
      lat, 
      lng, 
      accuracy 
    } = body;

    // Resolve session by code or QR token
    let sessionQuery = supabase
      .from("sessions")
      .select("id, org_id, public_code, event_qr_token")
      .eq("org_id", orgId);

    if (session_code) {
      sessionQuery = sessionQuery.ilike("public_code", session_code);
    } else if (qr_token) {
      sessionQuery = sessionQuery.eq("event_qr_token", qr_token);
    } else {
      return NextResponse.json(
        { success: false, error: "Session code or QR token is required" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await sessionQuery.single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Invalid session code or QR. Please check and try again." },
        { status: 404 }
      );
    }

    const sessionId = (session as { id: string }).id;

    // Resolve person by identifier
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Phone number or email is required to identify you" },
        { status: 400 }
      );
    }

    let personQuery = supabase
      .from("people")
      .select("id, full_name, checkin_code")
      .eq("org_id", orgId);

    if (identifier_type === "phone") {
      personQuery = personQuery.eq("phone", identifier);
    } else if (identifier_type === "email") {
      personQuery = personQuery.ilike("email", identifier);
    } else if (identifier_type === "checkin_code") {
      personQuery = personQuery.eq("checkin_code", identifier);
    } else if (identifier_type === "external_id") {
      personQuery = personQuery.eq("external_id", identifier);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid identifier type" },
        { status: 400 }
      );
    }

    const { data: person, error: personError } = await personQuery.single();

    if (personError || !person) {
      return NextResponse.json(
        { success: false, error: "We couldn't find your profile. Please check your details or contact an administrator." },
        { status: 404 }
      );
    }

    const personId = (person as { id: string }).id;

    // Check eligibility
    const eligibility = await computeSelfCheckinEligibility({
      orgId,
      sessionId,
      personId,
      method: session_code ? "event_code" : "qr",
      lat,
      lng,
      accuracy,
      eventCode: session_code,
      qrToken: qr_token,
    });

    if (!eligibility.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: eligibility.reason,
          distanceMeters: eligibility.distanceMeters,
          geofenceRadius: eligibility.geofenceRadius,
        },
        { status: 403 }
      );
    }

    // Create attendance record
    const { data: record, error: insertError } = await (supabase as any)
      .from("attendance_records")
      .insert({
        org_id: orgId,
        session_id: sessionId,
        person_id: personId,
        method: session_code ? "manual" : "qr",
        status: "present",
        lat,
        lng,
        accuracy_m: accuracy,
        meta: {
          self_checkin: true,
          authenticated: false,
          identifier_type,
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
      message: `Welcome, ${(person as { full_name: string }).full_name}! Check-in successful.`,
      record,
    });
  } catch (error) {
    console.error("Public self check-in error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
