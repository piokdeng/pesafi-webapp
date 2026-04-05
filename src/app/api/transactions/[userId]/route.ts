import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the requesting user matches the userId or is an admin
    if (user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse filter params
    const { searchParams } = new URL(request.url);

    // Get user's wallet
    const walletType = searchParams.get('walletType');
    let walletQuery = supabase
      .from('wallet')
      .select('id')
      .eq('user_id', params.userId);

    if (walletType) {
      walletQuery = walletQuery.eq('wallet_type', walletType);
    }

    const { data: wallet, error: walletError } = await walletQuery.limit(1).single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query with filters
    let query = supabase
      .from('transaction')
      .select('*')
      .eq('wallet_id', wallet.id);

    if (type) {
      query = query.eq('type', type);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`to_address.ilike.${searchTerm},from_address.ilike.${searchTerm},tx_hash.ilike.${searchTerm}`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Fetch transactions for this wallet
    const { data: transactions, error: txError } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json(transactions || []);

  } catch (error: any) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
