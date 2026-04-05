import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { createServerSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';

// GET - List team members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business profile
    const { data: business } = await supabase
      .from('business_profile')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get team members
    const { data: members, error } = await supabase
      .from('business_member')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET TEAM] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (error: any) {
    console.error('[GET TEAM] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add team member
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      full_name,
      role,
      can_send_money,
      can_receive_money,
      can_view_transactions,
      can_manage_team,
      can_edit_settings,
    } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Get business profile
    const { data: business } = await supabase
      .from('business_profile')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const memberId = ethers.id(`member-${business.id}-${email}-${Date.now()}`).slice(0, 24);

    const { data: member, error } = await adminSupabase
      .from('business_member')
      .insert({
        id: memberId,
        business_id: business.id,
        email,
        full_name: full_name || null,
        role,
        can_send_money: can_send_money || false,
        can_receive_money: can_receive_money || true,
        can_view_transactions: can_view_transactions || true,
        can_manage_team: can_manage_team || false,
        can_edit_settings: can_edit_settings || false,
        status: 'invited',
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[ADD TEAM MEMBER] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member, message: 'Team member added successfully' });
  } catch (error: any) {
    console.error('[ADD TEAM MEMBER] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove team member
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('id');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    const { error } = await adminSupabase
      .from('business_member')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('[DELETE TEAM MEMBER] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Team member removed successfully' });
  } catch (error: any) {
    console.error('[DELETE TEAM MEMBER] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
