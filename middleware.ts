import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-auth";
 
export async function middleware(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const { data: { user }, error } = await supabase.auth.getUser();
 
	if (!user || error) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// Check if email is verified
	if (user && !user.email_confirmed_at) {
		return NextResponse.redirect(new URL("/verify-email?email=" + encodeURIComponent(user.email!), request.url));
	}
 
	return NextResponse.next();
}
 
export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard"], // Apply middleware to specific routes
};