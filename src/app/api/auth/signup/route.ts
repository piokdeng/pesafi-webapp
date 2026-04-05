import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/supabase-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    console.log('Signup request:', { email, password: password ? '[REDACTED]' : 'missing', name });

    if (!email || !password || !name) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name });
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await signUp(email, password, name);

    if (error) {
      console.error('Supabase signup error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        cause: error.cause,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Handle specific error types
      if (error.message.includes('rate limit') || error.message.includes('Email rate limit exceeded')) {
        return NextResponse.json(
          { error: 'Too many signup attempts. Please wait a few minutes before trying again.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        );
      }

      if (error.message.includes('Database error')) {
        return NextResponse.json(
          { error: 'Database connection error. Please check your Supabase configuration.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to create account. Please try again.' },
        { status: 400 }
      );
    }

    // Auto-create wallet for new user (completely invisible to them)
    if (data.user) {
      try {
        console.log('[Signup] Auto-creating wallet for user:', data.user.id);

        // Generate new wallet
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        const privateKey = wallet.privateKey;

        // Encrypt private key using AES-256-GCM
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default_key_change_in_production';

        // Create encryption key hash (must be 32 bytes for AES-256)
        const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();

        // Generate IV
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);

        // Encrypt private key
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get auth tag
        const authTag = cipher.getAuthTag();

        // Store as: iv:authTag:encryptedData
        const encryptedPrivateKey = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

        const adminSupabase = createAdminSupabaseClient();

        // Ensure user row exists
        const { data: existingUser } = await adminSupabase
          .from('user')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingUser) {
          await adminSupabase
            .from('user')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: name,
              email_verified: false,
            });
        }

        // Create wallet record
        const walletId = ethers.id(`wallet-${data.user.id}-${walletAddress}`).slice(0, 21);

        const { error: walletError } = await adminSupabase
          .from('wallet')
          .insert({
            id: walletId,
            user_id: data.user.id,
            address: walletAddress.toLowerCase(),
            encrypted_private_key: encryptedPrivateKey,
            usdc_balance: '0',
            local_currency: 'KES',
            is_active: true,
          });

        if (walletError) {
          console.error('[Signup] Failed to create wallet:', walletError);
        } else {
          console.log('[Signup] ✅ Wallet auto-created:', walletAddress);
        }
      } catch (walletError) {
        console.error('[Signup] Wallet creation failed (non-fatal):', walletError);
        // Don't fail signup if wallet creation fails
      }
    }

    return NextResponse.json({
      message: 'Account created successfully! Please check your email to verify your account.',
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
