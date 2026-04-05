import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// Client-side Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          return cookieStore.getAll();
        },
        setAll: async (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Server-side client that authenticates using the incoming Authorization header.
// Use this in route handlers where the client performs auth on the browser and
// sends the access token along with the request.
export function createRouteSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
}

// Admin client with service role key for privileged operations
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Auth helper functions
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
      },
      // For development: disable email confirmation
      // In production: configure SMTP in Supabase dashboard
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback',
    },
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase.auth.signOut();
  
  return { error };
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });
  
  return { data, error };
}
