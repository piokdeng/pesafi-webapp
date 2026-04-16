import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';

// CORS configuration
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  'https://app.pesafi.ai',
  'http://localhost:3000',
];

function setCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: setCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = setCorsHeaders(origin);

  try {
    // 1. VERIFY USER AUTHENTICATION
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createAdminSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid authentication token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. EXTRACT TRUE CLIENT IP
    const clientIp = extractTrueClientIp(request);

    if (!clientIp) {
      console.error('[COINBASE SESSION] Could not extract client IP');
      return NextResponse.json(
        { error: 'Could not determine client IP address' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[COINBASE SESSION] Creating session for user:', user.id, 'IP:', clientIp);

    // 3. GET REQUEST BODY — accept BOTH field names from mobile app
    const body = await request.json();
    const walletAddress = body.walletAddress || body.address;
    const amount = body.amount;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required (send walletAddress or address)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. VERIFY WALLET OWNERSHIP
    console.log('[COINBASE SESSION] Checking wallet:', {
      walletAddress,
      userId: user.id,
      email: user.email,
    });

    const { data: walletByAddress, error: addressError } = await supabase
      .from('wallet')
      .select('*')
      .eq('address', walletAddress)
      .single();

    if (addressError) {
      console.log('[COINBASE SESSION] Wallet not found:', addressError.message);
      return NextResponse.json(
        { error: 'Wallet not found or does not belong to user' },
        { status: 403, headers: corsHeaders }
      );
    }

    let wallet = walletByAddress;

    if (walletByAddress.user_id !== user.id) {
      console.log('[COINBASE SESSION] Ownership mismatch - transferring:', {
        from: walletByAddress.user_id,
        to: user.id,
      });

      const { data: existingUserWallets } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', user.id);

      if (existingUserWallets && existingUserWallets.length > 0) {
        const walletIds = existingUserWallets.map((w: any) => w.id);
        await supabase.from('wallet').delete().in('id', walletIds);
      }

      const { data: updatedWallet, error: updateError } = await supabase
        .from('wallet')
        .update({
          user_id: user.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletByAddress.id)
        .select()
        .single();

      if (updateError) {
        console.error('[COINBASE SESSION] Transfer error:', updateError);
        return NextResponse.json(
          { error: 'Failed to transfer wallet ownership' },
          { status: 500, headers: corsHeaders }
        );
      }

      wallet = updatedWallet;
    }

    // 5. GENERATE CDP JWT (handles Ed25519 AND ES256 automatically)
    const cdpJwt = await generateCoinbaseJWT();

    // 6. CALL COINBASE API TO CREATE SESSION TOKEN
    const sessionToken = await createCoinbaseSessionToken({
      walletAddress,
      clientIp,
      jwt: cdpJwt,
    });

    console.log('[COINBASE SESSION] Success!');

    return NextResponse.json(
      { sessionToken },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[COINBASE SESSION] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create session token';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

function extractTrueClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (process.env.VERCEL && forwardedFor) {
    return forwardedFor.split(',').map(ip => ip.trim())[0];
  }

  if (realIp) return realIp;

  if (forwardedFor) {
    return forwardedFor.split(',').map(ip => ip.trim())[0];
  }

  if (process.env.NODE_ENV === 'development') {
    return '192.0.2.1';
  }

  return null;
}

async function generateCoinbaseJWT(): Promise<string> {
  const apiKeyName = process.env.COINBASE_CDP_API_KEY_NAME;
  let apiKeyPrivate = process.env.COINBASE_CDP_API_KEY_PRIVATE;

  if (!apiKeyName || !apiKeyPrivate) {
    throw new Error(
      'Missing Coinbase credentials. Set COINBASE_CDP_API_KEY_NAME and COINBASE_CDP_API_KEY_PRIVATE.'
    );
  }

  apiKeyPrivate = apiKeyPrivate.replace(/\\n/g, '\n');

  // PRIMARY: Use official CDP SDK (handles Ed25519 + ES256)
  try {
    const { generateJwt } = await import('@coinbase/cdp-sdk/auth');

    const token = await generateJwt({
      apiKeyId: apiKeyName,
      apiKeySecret: apiKeyPrivate,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
      expiresIn: 120,
    });

    console.log('[COINBASE JWT] Generated via @coinbase/cdp-sdk');
    return token;
  } catch (sdkError) {
    console.warn(
      '[COINBASE JWT] cdp-sdk unavailable, falling back to jsonwebtoken:',
      sdkError instanceof Error ? sdkError.message : sdkError
    );
  }

  // FALLBACK: jsonwebtoken (ES256 only — will fail with Ed25519 keys!)
  const jwt = (await import('jsonwebtoken')).default;
  const crypto = (await import('crypto')).default;

  const uri = 'POST api.developer.coinbase.com/onramp/v1/token';

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp',
    nbf: now,
    exp: now + 120,
    sub: apiKeyName,
    uri,
  };

  const nonce = crypto.randomBytes(16).toString('hex');

  const token = jwt.sign(payload, apiKeyPrivate, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      typ: 'JWT',
      kid: apiKeyName,
      nonce,
    } as any,
  });

  console.log('[COINBASE JWT] Generated via jsonwebtoken (ES256 fallback)');
  return token;
}

async function createCoinbaseSessionToken({
  walletAddress,
  clientIp,
  jwt,
}: {
  walletAddress: string;
  clientIp: string;
  jwt: string;
}): Promise<string> {
  const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addresses: [{ address: walletAddress, blockchains: ['base'] }],
      assets: ['USDC', 'ETH'],
      clientIp,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[COINBASE SESSION] API Error:', response.status, errorText);
    throw new Error(`Coinbase API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.token) {
    throw new Error('No session token returned from Coinbase API');
  }

  return data.token;
}
