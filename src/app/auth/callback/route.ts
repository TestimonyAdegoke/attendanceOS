import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const redirect = searchParams.get("redirect") || "/dashboard";
  const onboarding = searchParams.get("onboarding");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Handle password recovery
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      
      // Handle new signup with onboarding
      if (onboarding === "true") {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
