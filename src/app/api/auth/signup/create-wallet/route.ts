import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Create Wallet for Existing User
 *
 * This endpoint creates a wallet for users who don't have one
 * (handles cases where wallet creation failed during signup)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Create Wallet] Creating wallet for user:', user.id);

    // Check if user already has a wallet
    const adminSupabase = createAdminSupabaseClient();
    const { data: existingWallet } = await adminSupabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (existingWallet) {
      console.log('[Create Wallet] User already has wallet:', existingWallet.address);
      return NextResponse.json({
        success: true,
        address: existingWallet.address,
        message: 'Wallet already exists'
      });
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    const privateKey = wallet.privateKey;

    console.log('[Create Wallet] Generated new wallet:', walletAddress);

    // Encrypt private key using AES-256-GCM
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }

    const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const encryptedPrivateKey = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    // Create wallet record
    const walletId = ethers.id(`wallet-${user.id}-${walletAddress}`).slice(0, 21);

    const { error: walletError } = await adminSupabase
      .from('wallet')
      .insert({
        id: walletId,
        user_id: user.id,
        address: walletAddress.toLowerCase(),
        encrypted_private_key: encryptedPrivateKey,
        usdc_balance: '0',
        local_currency: 'KES',
        is_active: true,
      });

    if (walletError) {
      console.error('[Create Wallet] Database error:', walletError);
      return NextResponse.json(
        { error: 'Failed to create wallet', details: walletError.message },
        { status: 500 }
      );
    }

    console.log('[Create Wallet] ✅ Wallet created successfully');

    return NextResponse.json({
      success: true,
      address: walletAddress,
      message: 'Wallet created successfully'
    });

  } catch (error: any) {
    console.error('[Create Wallet] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create wallet' },
      { status: 500 }
    );
  }
}
