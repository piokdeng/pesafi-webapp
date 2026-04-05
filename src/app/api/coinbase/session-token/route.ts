import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// CORS configuration - Only allow your approved domain
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  'https://app.pesafi.ai',
  'http://localhost:3000',
];

// Helper function to set CORS headers
function setCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Only set CORS header if origin is in allowed list
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: setCorsHeaders(origin),
  });
}

/**
 * Generate Coinbase session token
 * Security Requirements:
 * 1. User must be authenticated (JWT/session)
 * 2. Extract true client IP (not from headers)
 * 3. Generate JWT for CDP API authentication
 * 4. Call CDP API to create session token
 */
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

    // Verify the session token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid authentication token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. EXTRACT TRUE CLIENT IP (DO NOT TRUST HEADERS)
    const clientIp = extractTrueClientIp(request);

    if (!clientIp) {
      console.error('[COINBASE SESSION] Could not extract client IP');
      return NextResponse.json(
        { error: 'Could not determine client IP address' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[COINBASE SESSION] Creating session token for user:', user.id, 'IP:', clientIp);

    // 3. GET REQUEST BODY
    const body = await request.json();
    const { walletAddress, amount } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the wallet belongs to the authenticated user
    console.log('[COINBASE SESSION] Checking wallet ownership:', {
      walletAddress,
      authenticatedUserId: user.id,
      authenticatedUserEmail: user.email,
    });

    // First, find the wallet by address only
    const { data: walletByAddress, error: addressError } = await supabase
      .from('wallet')
      .select('*')
      .eq('address', walletAddress)
      .single();

    if (addressError) {
      console.log('[COINBASE SESSION] Wallet query result:', {
        found: false,
        error: addressError.message,
        walletData: null
      });
      
      console.log('[COINBASE SESSION] Wallet check failed:', {
        walletExists: false,
        walletOwner: undefined,
        authenticatedUser: user.id,
        walletActive: undefined
      });

      return NextResponse.json(
        { error: 'Wallet not found or does not belong to user' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if wallet belongs to authenticated user
    let wallet = walletByAddress;
    
    if (walletByAddress.user_id !== user.id) {
      console.log('[COINBASE SESSION] Wallet ownership mismatch - auto-transferring ownership:', {
        walletOwner: walletByAddress.user_id,
        authenticatedUser: user.id
      });
      
      // AUTO-TRANSFER OWNERSHIP: Delete any existing wallets for authenticated user
      const { data: existingUserWallets } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', user.id);
      
      if (existingUserWallets && existingUserWallets.length > 0) {
        console.log('[COINBASE SESSION] Deleting existing wallets for user to avoid unique constraint');
        const walletIds = existingUserWallets.map(w => w.id);

        const { error: deleteError } = await supabase
          .from('wallet')
          .delete()
          .in('id', walletIds);

        if (deleteError) {
          console.error('[COINBASE SESSION] Error deleting wallets:', deleteError);
        } else {
          console.log(`[COINBASE SESSION] Deleted ${walletIds.length} wallets`);
        }
      }
      
      // Transfer ownership of the wallet to authenticated user
      const { data: updatedWallet, error: updateError } = await supabase
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
        console.error('[COINBASE SESSION] Error transferring wallet ownership:', updateError);
        return NextResponse.json(
          { error: 'Failed to transfer wallet ownership' },
          { status: 500, headers: corsHeaders }
        );
      }
      
      console.log('[COINBASE SESSION] ✅ Wallet ownership transferred successfully');
      wallet = updatedWallet;
    }

    console.log('[COINBASE SESSION] Wallet query result:', {
      found: !!wallet,
      error: null,
      walletData: wallet,
    });

    // Wallet ownership check is now handled above

    // 4. GENERATE CDP JWT TOKEN
    const cdpJwt = generateCoinbaseJWT();

    // 5. CALL COINBASE API TO CREATE SESSION TOKEN
    const sessionToken = await createCoinbaseSessionToken({
      walletAddress,
      clientIp,
      jwt: cdpJwt,
    });

    console.log('[COINBASE SESSION] Session token created successfully');

    // 6. RETURN SESSION TOKEN
    return NextResponse.json(
      { sessionToken },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[COINBASE SESSION] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create session token' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Extract true client IP from network layer
 * DO NOT TRUST X-Forwarded-For or similar headers as they can be spoofed
 */
function extractTrueClientIp(request: NextRequest): string | null {
  // In production (Vercel/Netlify), use their trusted IP headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // For Vercel, x-forwarded-for is trusted
  if (process.env.VERCEL && forwardedFor) {
    // Take the first IP in the chain (client IP)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Fallback to x-real-ip
  if (realIp) {
    return realIp;
  }

  // For local development, use a test IP
  if (process.env.NODE_ENV === 'development') {
    console.warn('[COINBASE SESSION] Using test IP for development');
    return '192.0.2.1'; // TEST-NET-1 IP (RFC 5737)
  }

  // Extract from connection (Next.js specific)
  // @ts-ignore - accessing internal Next.js request object
  const socket = request.socket || request.connection;
  if (socket?.remoteAddress) {
    return socket.remoteAddress;
  }

  return null;
}

/**
 * Generate JWT for Coinbase CDP API authentication
 * Reference: https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication
 */
function generateCoinbaseJWT(): string {
  const apiKeyName = process.env.COINBASE_CDP_API_KEY_NAME;
  let apiKeyPrivate = process.env.COINBASE_CDP_API_KEY_PRIVATE;

  if (!apiKeyName || !apiKeyPrivate) {
    throw new Error('Coinbase CDP API credentials not configured. Set COINBASE_CDP_API_KEY_NAME and COINBASE_CDP_API_KEY_PRIVATE');
  }

  // Convert \n in the environment variable to actual newlines
  // This is necessary because .env files store the key as a string with literal \n
  apiKeyPrivate = apiKeyPrivate.replace(/\\n/g, '\n');

  // Build URI for the API request (required in JWT payload for Coinbase CDP)
  const requestMethod = 'POST';
  const hostname = 'api.developer.coinbase.com';
  const requestPath = '/onramp/v1/token';
  const uri = `${requestMethod} ${hostname}${requestPath}`;

  // JWT Payload - Following Coinbase CDP format
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp',  // MUST be "cdp" for Coinbase Developer Platform
    nbf: now,
    exp: now + 120, // Token expires in 2 minutes
    sub: apiKeyName,
    uri: uri,  // REQUIRED: includes request method, hostname, and path
  };

  // Generate random nonce for header
  const nonce = crypto.randomBytes(16).toString('hex');

  // Sign JWT using jsonwebtoken library with ES256 algorithm
  // TypeScript doesn't recognize 'nonce' in header, but Coinbase requires it
  const token = jwt.sign(payload, apiKeyPrivate, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      typ: 'JWT',
      kid: apiKeyName,
      nonce: nonce,  // REQUIRED: random hex string for security
    } as any,  // Type assertion needed for custom 'nonce' property
  });

  return token;
}

/**
 * Call Coinbase CDP API to create session token
 */
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
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addresses: [
        {
          address: walletAddress,
          blockchains: ['base'],
        },
      ],
      assets: ['USDC', 'ETH'],
      clientIp: clientIp,
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
