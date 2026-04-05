"use client";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

export const supabaseAuthClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only update user state if the user ID actually changed
    // This prevents cascading re-renders from new object references
    const updateUser = (newUser: any) => {
      const newId = newUser?.id ?? null;
      if (newId !== currentUserIdRef.current) {
        currentUserIdRef.current = newId;
        setUser(newUser);
      }
      setLoading(false);
    };

    // Get initial session
    supabaseAuthClient.auth.getSession().then(({ data: { session } }) => {
      updateUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange((_event, session) => {
      updateUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabaseAuthClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabaseAuthClient.auth.signOut();
    return { error };
  };

  const resendVerification = async (email: string) => {
    const { data, error } = await supabaseAuthClient.auth.resend({
      type: 'signup',
      email: email,
    });
    return { data, error };
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resendVerification,
  };
}