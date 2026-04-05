import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    console.log('[Wallet Get] Request received:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[Wallet Get] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('[Wallet Get] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Verify the user is accessing their own wallet
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: userWallet, error } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (error) {
      console.error('Error getting wallet:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json(userWallet);
  } catch (error: any) {
    console.error('Error getting wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get wallet' },
      { status: 500 }
    );
  }
}
