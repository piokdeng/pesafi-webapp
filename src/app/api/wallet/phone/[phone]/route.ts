import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { phoneNumberSchema, normalizePhoneNumber, validateInput } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await params;
    const phoneNumber = decodeURIComponent(phone);

    // Validate and normalize phone number
    const validation = validateInput(phoneNumberSchema, normalizePhoneNumber(phoneNumber));
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const validatedPhone = validation.data;
    
    const { data: userWallet, error } = await supabase
      .from('wallet')
      .select('*')
      .eq('phone_number', validatedPhone)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (error) {
      console.error('Error getting wallet by phone:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get wallet' },
        { status: 500 }
      );
    }

    // Only return public information
    return NextResponse.json({
      id: userWallet.id,
      address: userWallet.address,
      phoneNumber: userWallet.phone_number,
    });
  } catch (error: any) {
    console.error('Error getting wallet by phone:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get wallet' },
      { status: 500 }
    );
  }
}
