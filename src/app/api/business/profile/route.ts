import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { createServerSupabaseClient } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business profile
    const { data: profile, error } = await supabase
      .from('business_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[GET BUSINESS PROFILE] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('[GET BUSINESS PROFILE] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      business_name,
      business_type,
      registration_number,
      tax_id,
      business_email,
      business_phone,
      website,
      country,
      city,
      state_region,
      postal_code,
      street_address,
      industry,
      description,
      employee_count,
      annual_revenue,
    } = body;

    // Update business profile using admin client to bypass RLS
    const adminSupabase = createAdminSupabaseClient();

    const { data: profile, error } = await adminSupabase
      .from('business_profile')
      .update({
        business_name,
        business_type,
        registration_number,
        tax_id,
        business_email,
        business_phone,
        website,
        country,
        city,
        state_region,
        postal_code,
        street_address,
        industry,
        description,
        employee_count,
        annual_revenue,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[UPDATE BUSINESS PROFILE] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE BUSINESS PROFILE] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
