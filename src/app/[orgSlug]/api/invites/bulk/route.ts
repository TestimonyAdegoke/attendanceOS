// Bulk Invite API Route
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Check if user is admin
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["org_owner", "admin"].includes((membership as { role: string }).role)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { group_id, person_ids } = body;

    if (!person_ids || !Array.isArray(person_ids) || person_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one person_id is required" },
        { status: 400 }
      );
    }

    // Get people with emails
    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .in("id", person_ids);

    if (peopleError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch people" },
        { status: 500 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Create invites for each person
    for (const person of (people || [])) {
      const typedPerson = person as { id: string; full_name: string; email: string | null };
      
      if (!typedPerson.email) {
        results.skipped++;
        results.errors.push(`${typedPerson.full_name}: No email address`);
        continue;
      }

      // Check if invite already exists and is not used
      const { data: existingInvite } = await supabase
        .from("invites")
        .select("id, used_at, expires_at")
        .eq("org_id", orgId)
        .eq("person_id", typedPerson.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingInvite) {
        results.skipped++;
        results.errors.push(`${typedPerson.full_name}: Already has pending invite`);
        continue;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("person_user_links")
        .select("id")
        .eq("org_id", orgId)
        .eq("person_id", typedPerson.id)
        .single();

      if (existingLink) {
        results.skipped++;
        results.errors.push(`${typedPerson.full_name}: Already has portal access`);
        continue;
      }

      // Create invite
      const { error: insertError } = await supabase
        .from("invites")
        .insert({
          org_id: orgId,
          group_id: group_id || null,
          person_id: typedPerson.id,
          email: typedPerson.email,
          created_by: user.id,
        });

      if (insertError) {
        results.errors.push(`${typedPerson.full_name}: Failed to create invite`);
        continue;
      }

      results.created++;

      // TODO: Send email notification
      // For MVP, invites are created and can be viewed/sent from admin UI
      console.log(`Invite created for ${typedPerson.full_name} (${typedPerson.email})`);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.created} invites, skipped ${results.skipped}`,
      ...results,
    });
  } catch (error) {
    console.error("Bulk invite error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get pending invites for a group or org
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const supabase = await createClient();
    const { orgSlug } = params;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id");

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

    // Build query
    let query = supabase
      .from("invites")
      .select(`
        id, email, token, expires_at, used_at, created_at,
        people (id, full_name, email)
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data: invites, error: invitesError } = await query;

    if (invitesError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch invites" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error("Get invites error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
