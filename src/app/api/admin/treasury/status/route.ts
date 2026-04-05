import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { getTreasuryStatus } from '@/lib/gas-treasury';

/**
 * Get Treasury Status
 *
 * Returns current status of the gas treasury including balance and configuration
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check here
    // For now, any authenticated user can check treasury status

    const status = await getTreasuryStatus();

    return NextResponse.json({
      success: true,
      treasury: status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Treasury Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get treasury status' },
      { status: 500 }
    );
  }
}
