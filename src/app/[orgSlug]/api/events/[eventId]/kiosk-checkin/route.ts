import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSelfCheckinEligibility } from "@/lib/checkin-eligibility";

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; eventId: string } }
) {
  try {
    const supabase = await createClient();
    const { orgSlug, eventId } = params;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    const orgId = (org as any).id as string;
    const body = await request.json();
    const { person_checkin_code, lat, lng, accuracy } = body;

    if (!person_checkin_code) {
      return NextResponse.json({ success: false, error: "person_checkin_code is required" }, { status: 400 });
    }

    const { data: person } = await supabase
      .from("people")
      .select("id, full_name")
      .eq("org_id", orgId)
      .eq("checkin_code", person_checkin_code)
      .eq("status", "active")
      .single();

    if (!person) {
      return NextResponse.json({ success: false, error: "Person not found" }, { status: 404 });
    }

    const personId = (person as any).id as string;

    const eligibility = await computeSelfCheckinEligibility({
      orgId,
      sessionId: eventId,
      personId,
      method: "kiosk",
      lat,
      lng,
      accuracy,
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

    const { error: insertError } = await (supabase as any)
      .from("attendance_records")
      .insert({
        org_id: orgId,
        session_id: eventId,
        person_id: personId,
        method: "kiosk",
        status: "present",
        lat,
        lng,
        accuracy_m: accuracy,
        meta: { kiosk: true, event_kiosk: true },
      });

    if (insertError) {
      return NextResponse.json({ success: false, error: "Failed to record check-in" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Welcome, ${(person as any).full_name}!`,
      person: { id: personId, full_name: (person as any).full_name },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unexpected error" }, { status: 500 });
  }
}
