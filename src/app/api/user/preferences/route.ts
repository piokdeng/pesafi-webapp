import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';
import { nanoid } from 'nanoid';

// Convert camelCase to snake_case for DB
function toSnakeCase(obj: any) {
  const mapped: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'requirePinForTransactions') mapped['require_pin'] = value;
    else if (key === 'showBalance') mapped['show_balance'] = value;
    else if (key === 'showActivity') mapped['show_activity'] = value;
    else if (key === 'anonymizeAddress') mapped['anonymize_address'] = value;
    else if (key === 'anonymizeBalance') mapped['anonymize_balance'] = value;
    else if (key === 'hideUsdBalance') mapped['hide_usd_balance'] = value;
    else if (key === 'hideLocalAmount') mapped['hide_local_amount'] = value;
    else if (key === 'twoFactorEnabled') mapped['two_factor_enabled'] = value;
    else if (key === 'biometricsEnabled') mapped['biometrics_enabled'] = value;
    else mapped[key] = value;
  }
  return mapped;
}

// Convert snake_case to camelCase for response
function toCamelCase(obj: any) {
  if (!obj) return obj;
  const mapped: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'require_pin') mapped['requirePinForTransactions'] = value;
    else if (key === 'show_balance') mapped['showBalance'] = value;
    else if (key === 'show_activity') mapped['showActivity'] = value;
    else if (key === 'anonymize_address') mapped['anonymizeAddress'] = value;
    else if (key === 'anonymize_balance') mapped['anonymizeBalance'] = value;
    else if (key === 'hide_usd_balance') mapped['hideUsdBalance'] = value;
    else if (key === 'hide_local_amount') mapped['hideLocalAmount'] = value;
    else if (key === 'two_factor_enabled') mapped['twoFactorEnabled'] = value;
    else if (key === 'biometrics_enabled') mapped['biometricsEnabled'] = value;
    else if (key === 'user_id') mapped['userId'] = value;
    else if (key === 'created_at') mapped['createdAt'] = value;
    else if (key === 'updated_at') mapped['updatedAt'] = value;
    else mapped[key] = value;
  }
  return mapped;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[User Preferences] Request received:', {
      method: request.method,
      url: request.url,
      authorization: request.headers.get('authorization'),
      contentType: request.headers.get('content-type'),
      allHeaders: Object.fromEntries(request.headers.entries())
    });
    
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[User Preferences] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('[User Preferences] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const { data: prefs, error } = await adminSupabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        theme: 'system',
        language: 'en',
        currency: 'KES',
        showBalance: true,
        showActivity: true,
        anonymizeAddress: false,
        anonymizeBalance: false,
        hideUsdBalance: false,
        hideLocalAmount: false,
        twoFactorEnabled: false,
        biometricsEnabled: false,
        requirePinForTransactions: true,
      });
    }

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(toCamelCase(prefs));
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
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

    const data = await request.json();
    console.log('Updating preferences with data:', data);

    // Convert camelCase to snake_case
    const snakeData = toSnakeCase(data);
    
    // Filter out read-only fields and undefined/null values
    const { id, user_id, created_at, updated_at, userId, createdAt, updatedAt, ...settingsData } = snakeData;
    const cleanData = Object.fromEntries(
      Object.entries(settingsData).filter(([_, v]) => v !== undefined && v !== null)
    );

    console.log('Cleaned data for DB:', cleanData);

    const adminSupabase = createAdminSupabaseClient();
    
    // Check if preferences exist
    const { data: existing, error: checkError } = await adminSupabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    let result;
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Creating new preferences for user:', user.id);
      const { data: newPrefs, error: insertError } = await adminSupabase
        .from('user_preferences')
        .insert({
          id: nanoid(),
          user_id: user.id,
          ...cleanData,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating preferences:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Failed to create preferences' },
          { status: 500 }
        );
      }
      
      result = newPrefs;
    } else if (checkError) {
      console.error('Error checking existing preferences:', checkError);
      return NextResponse.json(
        { error: checkError.message || 'Failed to check preferences' },
        { status: 500 }
      );
    } else {
      console.log('Updating existing preferences for user:', user.id);
      const { data: updatedPrefs, error: updateError } = await adminSupabase
        .from('user_preferences')
        .update({
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating preferences:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update preferences' },
          { status: 500 }
        );
      }
      
      result = updatedPrefs;
    }

    console.log('Preferences saved successfully:', result);
    return NextResponse.json(toCamelCase(result));
  } catch (error: any) {
    console.error('Error updating preferences:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
