import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/login?message=email-verified';

  console.log('[Auth Callback] Processing verification:', { hasCode: !!code, origin });

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] exchangeCodeForSession failed:', error);
      // Even if exchange fails, user might already be verified
      // Continue to error page but log for debugging
    }

    if (!error) {
      // Email verification successful - now update the user table in database
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.email_confirmed_at) {
          console.log('[Email Verification] Updating database for user:', user.id);

          // Use admin client to update the user table
          const adminSupabase = createAdminSupabaseClient();
          const { error: dbError } = await adminSupabase
            .from('user')
            .update({
              email_verified: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (dbError) {
            console.error('[Email Verification] Failed to update user table:', dbError);
          } else {
            console.log('[Email Verification] ✅ Database updated - email_verified = true');
          }
        }
      } catch (updateError) {
        console.error('[Email Verification] Error updating database:', updateError);
        // Don't fail the verification if database update fails
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
