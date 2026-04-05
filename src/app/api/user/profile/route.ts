import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user data from Supabase Auth
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || null,
      image: user.user_metadata?.avatar_url || null,
      phoneNumber: user.user_metadata?.phone_number || null,
      email_verified: user.email_confirmed_at ? true : false,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return NextResponse.json(userProfile);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phoneNumber } = await request.json();

    console.log('[Profile API] Updating user:', user.id, { name, phoneNumber });

    // Use admin client to update user metadata
    const adminSupabase = createAdminSupabaseClient();
    const { data: updatedUser, error } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          name: name,
          phone_number: phoneNumber,
        },
      }
    );

    if (error) {
      console.error('[Profile API] Error updating profile:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('[Profile API] Update successful');

    return NextResponse.json({
      id: updatedUser.user.id,
      email: updatedUser.user.email,
      name: updatedUser.user.user_metadata?.name || null,
      image: updatedUser.user.user_metadata?.avatar_url || null,
      phoneNumber: updatedUser.user.user_metadata?.phone_number || null,
      email_verified: updatedUser.user.email_confirmed_at ? true : false,
      created_at: updatedUser.user.created_at,
      updated_at: updatedUser.user.updated_at,
    });
  } catch (error: any) {
    console.error('[Profile API] Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
