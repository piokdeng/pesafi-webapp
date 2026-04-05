import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';
import { nanoid } from 'nanoid';

// Convert camelCase to snake_case for DB
function toSnakeCase(obj: any) {
  const mapped: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'smsEnabled') mapped['sms_enabled'] = value;
    else if (key === 'emailEnabled') mapped['email_enabled'] = value;
    else if (key === 'pushEnabled') mapped['push_enabled'] = value;
    else if (key === 'transactionReceived') mapped['transaction_received'] = value;
    else if (key === 'transactionSent') mapped['transaction_sent'] = value;
    else if (key === 'securityAlerts') mapped['security_alerts'] = value;
    else if (key === 'marketingEmails') mapped['marketing_emails'] = value;
    else if (key === 'minAmountForNotification') mapped['min_amount'] = value;
    else mapped[key] = value;
  }
  return mapped;
}

// Convert snake_case to camelCase for response
function toCamelCase(obj: any) {
  if (!obj) return obj;
  const mapped: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'sms_enabled') mapped['smsEnabled'] = value;
    else if (key === 'email_enabled') mapped['emailEnabled'] = value;
    else if (key === 'push_enabled') mapped['pushEnabled'] = value;
    else if (key === 'transaction_received') mapped['transactionReceived'] = value;
    else if (key === 'transaction_sent') mapped['transactionSent'] = value;
    else if (key === 'security_alerts') mapped['securityAlerts'] = value;
    else if (key === 'marketing_emails') mapped['marketingEmails'] = value;
    else if (key === 'min_amount') mapped['minAmountForNotification'] = value;
    else if (key === 'user_id') mapped['userId'] = value;
    else if (key === 'created_at') mapped['createdAt'] = value;
    else if (key === 'updated_at') mapped['updatedAt'] = value;
    else mapped[key] = value;
  }
  return mapped;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const { data: settings, error } = await adminSupabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        transactionReceived: true,
        transactionSent: true,
        securityAlerts: true,
        marketingEmails: false,
        minAmountForNotification: 0,
      });
    }

    if (error) {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(toCamelCase(settings));
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notification settings' },
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
    
    // Convert camelCase to snake_case
    const snakeData = toSnakeCase(data);
    
    // Filter out read-only fields
    const { id, user_id, created_at, updated_at, userId, createdAt, updatedAt, ...settingsData } = snakeData;
    const cleanData = Object.fromEntries(
      Object.entries(settingsData).filter(([_, v]) => v !== undefined && v !== null)
    );

    const adminSupabase = createAdminSupabaseClient();
    
    const { data: existing, error: checkError } = await adminSupabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    let result;
    if (checkError && checkError.code === 'PGRST116') {
      const { data: newSettings, error: insertError } = await adminSupabase
        .from('notification_settings')
        .insert({
          id: nanoid(),
          user_id: user.id,
          ...cleanData,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating notification settings:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Failed to create notification settings' },
          { status: 500 }
        );
      }
      
      result = newSettings;
    } else if (checkError) {
      console.error('Error checking existing notification settings:', checkError);
      return NextResponse.json(
        { error: checkError.message || 'Failed to check notification settings' },
        { status: 500 }
      );
    } else {
      const { data: updatedSettings, error: updateError } = await adminSupabase
        .from('notification_settings')
        .update({
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating notification settings:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update notification settings' },
          { status: 500 }
        );
      }
      
      result = updatedSettings;
    }

    return NextResponse.json(toCamelCase(result));
  } catch (error: any) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
