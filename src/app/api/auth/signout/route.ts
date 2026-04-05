import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const { error } = await signOut();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Sign out successful'
    });

  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}





