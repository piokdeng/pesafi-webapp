import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get business wallet
    const { data: wallet } = await supabase
      .from('wallet')
      .select('id, address')
      .eq('user_id', user.id)
      .eq('wallet_type', 'business')
      .single();

    if (!wallet) {
      return NextResponse.json({ transactions: [], total: 0 });
    }

    // Get transactions
    const { data: transactions, error, count } = await supabase
      .from('transaction')
      .select('*', { count: 'exact' })
      .or(`from_address.eq.${wallet.address},to_address.eq.${wallet.address}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET TRANSACTIONS] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      wallet: wallet,
    });
  } catch (error: any) {
    console.error('[GET TRANSACTIONS] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
