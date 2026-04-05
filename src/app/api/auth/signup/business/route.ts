import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      email,
      password,
      businessName,
      businessType,
      registrationNumber,
      taxId,
      businessEmail,
      businessPhone,
      country,
      city,
      stateRegion,
      postalCode,
      streetAddress,
      industry,
      description,
      website,
    } = body;

    // Validate required fields
    if (!email || !password || !businessName || !businessType) {
      console.log('[BUSINESS SIGNUP] Missing required fields');
      return NextResponse.json(
        { error: 'Email, password, business name, and business type are required' },
        { status: 400 }
      );
    }

    console.log('[BUSINESS SIGNUP] Starting signup for:', email, 'Business:', businessName);

    // 1. Create Supabase Auth user using regular signup (THIS SENDS VERIFICATION EMAIL!)
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: 'business',
          name: businessName,
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback',
      },
    });

    if (authError || !authData.user) {
      console.error('[BUSINESS SIGNUP] Auth error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    console.log('[BUSINESS SIGNUP] User created:', userId);
    console.log('[BUSINESS SIGNUP] ✉️ Verification email sent to:', email);

    // 2. Get admin client for database operations
    const adminSupabase = createAdminSupabaseClient();

    // 3. Generate crypto wallet (same as individual)
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address.toLowerCase();
    const privateKey = wallet.privateKey;

    console.log('[BUSINESS SIGNUP] Wallet generated:', walletAddress);

    // 4. Encrypt private key using AES-256-GCM
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default_key_change_in_production';
    const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();

    // Encrypt private key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
    let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
    encryptedPrivateKey += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const encryptedPrivateKeyString = `${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedPrivateKey}`;

    console.log('[BUSINESS SIGNUP] Private key encrypted');

    // 5. Create business profile
    const businessId = ethers.id(`business-${userId}-${Date.now()}`).slice(0, 24);

    console.log('[BUSINESS SIGNUP] Creating business profile with ID:', businessId);

    const { error: businessError } = await adminSupabase
      .from('business_profile')
      .insert({
        id: businessId,
        user_id: userId,
        business_name: businessName,
        business_type: businessType,
        registration_number: registrationNumber || null,
        tax_id: taxId || null,
        business_email: businessEmail || email,
        business_phone: businessPhone || null,
        country: country || 'Kenya',
        city: city || null,
        state_region: stateRegion || null,
        postal_code: postalCode || null,
        street_address: streetAddress || null,
        industry: industry || null,
        description: description || null,
        website: website || null,
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (businessError) {
      console.error('[BUSINESS SIGNUP] Business profile error:', {
        error: businessError,
        message: businessError.message,
        details: businessError.details,
        hint: businessError.hint,
        code: businessError.code,
      });
      // Cleanup
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        {
          error: 'Failed to create business profile. Please make sure the database migration has been run.',
          details: businessError.message
        },
        { status: 500 }
      );
    }

    console.log('[BUSINESS SIGNUP] ✅ Business profile created:', businessId);

    // 6. Ensure user row exists (required for wallet foreign key)
    const { data: existingUser } = await adminSupabase
      .from('user')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      console.log('[BUSINESS SIGNUP] Creating user record...');
      await adminSupabase
        .from('user')
        .insert({
          id: userId,
          email: email,
          name: businessName,
          email_verified: false,
        });
      console.log('[BUSINESS SIGNUP] ✅ User record created');
    } else {
      console.log('[BUSINESS SIGNUP] User record already exists');
    }

    // 7. Create wallet linked to business (using same method as individual signup)
    const walletId = ethers.id(`wallet-${userId}-${walletAddress}`).slice(0, 21);

    console.log('[BUSINESS SIGNUP] Creating wallet with ID:', walletId);

    // Try to create wallet with business columns first
    let walletError: any = null;
    let createdWithBusinessColumns = false;

    // Attempt 1: Try with business_id and wallet_type columns
    const fullWalletData = {
      id: walletId,
      user_id: userId,
      address: walletAddress,
      encrypted_private_key: encryptedPrivateKeyString,
      usdc_balance: '0',
      local_currency: 'KES',
      is_active: true,
      business_id: businessId,
      wallet_type: 'business',
    };

    console.log('[BUSINESS SIGNUP] Attempting to create wallet with business columns...');
    const { error: fullError } = await adminSupabase
      .from('wallet')
      .insert(fullWalletData);

    if (fullError) {
      // Check if error is due to missing columns
      const isMissingColumnError = fullError.message?.includes('column') &&
        (fullError.message?.includes('business_id') || fullError.message?.includes('wallet_type'));

      if (isMissingColumnError) {
        console.log('[BUSINESS SIGNUP] ⚠️ Business columns not found, retrying without them...');

        // Attempt 2: Try without business columns (fallback)
        const basicWalletData = {
          id: walletId,
          user_id: userId,
          address: walletAddress,
          encrypted_private_key: encryptedPrivateKeyString,
          usdc_balance: '0',
          local_currency: 'KES',
          is_active: true,
        };

        const { error: basicError } = await adminSupabase
          .from('wallet')
          .insert(basicWalletData);

        if (basicError) {
          walletError = basicError;
        } else {
          console.log('[BUSINESS SIGNUP] ⚠️ Wallet created WITHOUT business columns!');
          console.log('[BUSINESS SIGNUP] ⚠️ Please run wallet-table-update.sql to add business support to wallet table');
          createdWithBusinessColumns = false;
        }
      } else {
        // Some other error
        walletError = fullError;
      }
    } else {
      console.log('[BUSINESS SIGNUP] ✅ Wallet created with business columns');
      createdWithBusinessColumns = true;
    }

    // If we have a wallet error that wasn't handled, fail the signup
    if (walletError) {
      console.error('[BUSINESS SIGNUP] Wallet creation failed:', {
        error: walletError,
        message: walletError.message,
        details: walletError.details,
        hint: walletError.hint,
        code: walletError.code,
      });

      // Cleanup
      await adminSupabase.from('business_profile').delete().eq('id', businessId);
      await adminSupabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: 'Failed to create wallet.',
          details: walletError.message,
          hint: walletError.hint,
          instruction: 'Please check that wallet-table-update.sql has been run successfully. Check server logs for full error details.'
        },
        { status: 500 }
      );
    }

    console.log('[BUSINESS SIGNUP] ✅ Wallet created:', walletId);

    // 8. Create business preferences (optional - skip if table doesn't exist)
    try {
      const preferencesId = ethers.id(`prefs-${businessId}-${Date.now()}`).slice(0, 24);

      await adminSupabase
        .from('business_preferences')
        .insert({
          id: preferencesId,
          business_id: businessId,
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          language: 'en',
          notify_on_payment: true,
          notify_on_settlement: true,
          notification_email: businessEmail || email,
          auto_settlement: false,
          settlement_frequency: 'weekly',
          minimum_settlement_amount: 100,
          require_2fa_for_settlements: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      console.log('[BUSINESS SIGNUP] ✅ Business preferences created');
    } catch (prefsError) {
      console.log('[BUSINESS SIGNUP] ⚠️ Business preferences not created (table may not exist):', prefsError);
      // Continue anyway - preferences are not critical
    }

    // 9. Create business owner as member (optional - skip if table doesn't exist)
    try {
      const memberId = ethers.id(`member-${businessId}-${userId}`).slice(0, 24);

      await adminSupabase
        .from('business_member')
        .insert({
          id: memberId,
          business_id: businessId,
          user_id: userId,
          email: email,
          full_name: businessName,
          role: 'owner',
          can_send_money: true,
          can_receive_money: true,
          can_view_transactions: true,
          can_manage_team: true,
          can_edit_settings: true,
          status: 'active',
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      console.log('[BUSINESS SIGNUP] ✅ Business member created');
    } catch (memberError) {
      console.log('[BUSINESS SIGNUP] ⚠️ Business member not created (table may not exist):', memberError);
      // Continue anyway - member record is not critical
    }

    console.log('[BUSINESS SIGNUP] ✅✅✅ Business account setup complete!');

    // 10. Return success with user data
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        businessId,
        walletAddress,
        accountType: 'business',
      },
      message: 'Business account created successfully',
    });

  } catch (error: any) {
    console.error('[BUSINESS SIGNUP] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
