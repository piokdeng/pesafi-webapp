import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';

/**
 * Coinbase Smart Wallet Creation API
 *
 * With Coinbase Smart Wallet SDK, wallets are automatically created when users
 * connect via passkey authentication. This endpoint simply records the wallet
 * address in our database after the user has connected on the frontend.
 *
 * NO private keys are generated or stored.
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[Smart Wallet API] Request received');

    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Smart Wallet API] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Smart Wallet API] User authenticated:', user.id);

    const { walletAddress, phoneNumber } = await request.json();
    console.log('[Smart Wallet API] Wallet address from request:', walletAddress);

    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    console.log('[Smart Wallet API] Proceeding to record wallet:', {
      userId: user.id,
      walletAddress
    });

    // Use admin client for database operations
    const adminSupabase = createAdminSupabaseClient();

    // Check if wallet already exists for this user
    const { data: existingWallets } = await adminSupabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id);

    console.log('[Smart Wallet API] Checking existing wallets:', existingWallets?.length || 0);

    // Check if wallet with this exact address exists anywhere in the database
    const { data: walletByAddress } = await adminSupabase
      .from('wallet')
      .select('*')
      .eq('address', walletAddress.toLowerCase())
      .single();

    if (walletByAddress) {
      console.log('[Smart Wallet API] Wallet with this address exists:', walletByAddress.id);
      console.log('[Smart Wallet API] Existing wallet details:', {
        address: walletByAddress.address,
        hasPrivateKey: !!walletByAddress.encrypted_private_key,
        isActive: walletByAddress.is_active,
        currentUserId: walletByAddress.user_id,
        authenticatedUserId: user.id
      });

      // If wallet belongs to authenticated user, return it
      if (walletByAddress.user_id === user.id) {
        console.log('[Smart Wallet API] Wallet belongs to authenticated user, returning it');
        return NextResponse.json(walletByAddress);
      }

      // If wallet belongs to different user, transfer ownership
      console.log('[Smart Wallet API] Transferring wallet ownership to authenticated user');
      
      // First, delete any existing wallets for the authenticated user (unique constraint)
      if (existingWallets && existingWallets.length > 0) {
        console.log('[Smart Wallet API] Deleting existing wallets for user to avoid unique constraint');
        const walletIds = existingWallets.map(w => w.id);

        const { error: deleteError } = await adminSupabase
          .from('wallet')
          .delete()
          .in('id', walletIds);

        if (deleteError) {
          console.error('[Smart Wallet API] Error deleting wallets:', deleteError);
        } else {
          console.log(`[Smart Wallet API] Deleted ${walletIds.length} wallets`);
        }
      }
      
      // Now transfer ownership
      const { data: updatedWallet, error: updateError } = await adminSupabase
        .from('wallet')
        .update({ 
          user_id: user.id,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletByAddress.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Smart Wallet API] Error transferring ownership:', updateError);
        return NextResponse.json(
          { error: 'Failed to transfer wallet ownership', details: updateError.message },
          { status: 500 }
        );
      }

      console.log('[Smart Wallet API] ✅ Wallet ownership transferred successfully');
      return NextResponse.json(updatedWallet);
    }

    // If user has an old wallet (with private key), we'll create a new Smart Wallet record
    // but mark the old one as inactive
    const oldWallet = existingWallets?.find(w => !!w.encrypted_private_key);
    if (oldWallet) {
      console.log('[Smart Wallet API] Found old wallet, marking as inactive:', oldWallet.address);
      await adminSupabase
        .from('wallet')
        .update({ is_active: false })
        .eq('id', oldWallet.id);
      console.log('[Smart Wallet API] Old wallet marked inactive');
    }

    // Ensure user row exists
    const { data: existingUser } = await adminSupabase
      .from('user')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      await adminSupabase
        .from('user')
        .insert({
          id: user.id,
          email: user.email,
          name: (user as any).user_metadata?.name || null,
          email_verified: !!user.email_confirmed_at,
        });
    }

    // Create wallet record (NO private keys)
    // Generate unique wallet ID based on user ID AND wallet address
    const walletId = ethers.id(`wallet-${user.id}-${walletAddress}`).slice(0, 21);

    console.log('[Smart Wallet API] Creating wallet with ID:', walletId);

    const { data, error } = await adminSupabase
      .from('wallet')
      .insert({
        id: walletId,
        user_id: user.id,
        address: walletAddress,
        phone_number: phoneNumber,
        usdc_balance: '0',
        local_currency: 'KES',
        is_active: true,
        // NO encrypted_private_key
        // NO encrypted_mnemonic
      })
      .select()
      .single();

    if (error) {
      console.error('[Smart Wallet API] Database error:', error);

      if (error.code === '23505') {
        console.log('[Smart Wallet API] Duplicate key, checking for wallet transfer');
        
        // Check if wallet with this address exists and transfer ownership
        const { data: walletByAddress } = await adminSupabase
          .from('wallet')
          .select('*')
          .eq('address', walletAddress.toLowerCase())
          .single();

        if (walletByAddress) {
          console.log('[Smart Wallet API] Found wallet with same address:', walletByAddress.id);
          console.log('[Smart Wallet API] Current owner:', walletByAddress.user_id);
          console.log('[Smart Wallet API] Authenticated user:', user.id);
          
          // If wallet belongs to different user, transfer ownership
          if (walletByAddress.user_id !== user.id) {
            console.log('[Smart Wallet API] Transferring wallet ownership to authenticated user');
            
            // Delete existing user wallets first (unique constraint)
            const { data: userExistingWallets } = await adminSupabase
              .from('wallet')
              .select('*')
              .eq('user_id', user.id);
              
            if (userExistingWallets && userExistingWallets.length > 0) {
              console.log('[Smart Wallet API] Deleting existing wallets for user');
              const walletIds = userExistingWallets.map(w => w.id);

              const { error: deleteError } = await adminSupabase
                .from('wallet')
                .delete()
                .in('id', walletIds);

              if (deleteError) {
                console.error('[Smart Wallet API] Error deleting wallets:', deleteError);
              } else {
                console.log(`[Smart Wallet API] Deleted ${walletIds.length} wallets`);
              }
            }
            
            const { data: updatedWallet, error: updateError } = await adminSupabase
              .from('wallet')
              .update({ 
                user_id: user.id,
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', walletByAddress.id)
              .select()
              .single();

            if (updateError) {
              console.error('[Smart Wallet API] Error transferring ownership:', updateError);
              return NextResponse.json(
                { error: 'Failed to transfer wallet ownership', details: updateError.message },
                { status: 500 }
              );
            }

            console.log('[Smart Wallet API] ✅ Wallet ownership transferred successfully');
            return NextResponse.json(updatedWallet);
          } else {
            console.log('[Smart Wallet API] Wallet already belongs to authenticated user');
            return NextResponse.json(walletByAddress);
          }
        }
        
        // Fallback: try to find wallet by user_id
        const { data: existingWallet } = await adminSupabase
          .from('wallet')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingWallet) {
          console.log('[Smart Wallet API] Returning existing wallet:', existingWallet.id);
          return NextResponse.json(existingWallet);
        }
      }

      return NextResponse.json(
        { error: 'Failed to create wallet record', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Smart Wallet API] ✅ Wallet recorded successfully:', data.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Smart Wallet API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record wallet' },
      { status: 500 }
    );
  }
}
