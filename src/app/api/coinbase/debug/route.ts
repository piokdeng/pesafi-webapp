import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check Coinbase CDP configuration
 * REMOVE THIS IN PRODUCTION AFTER DEBUGGING
 */
export async function GET() {
  const apiKeyName = process.env.COINBASE_CDP_API_KEY_NAME;
  const apiKeyPrivate = process.env.COINBASE_CDP_API_KEY_PRIVATE;

  return NextResponse.json({
    hasApiKeyName: !!apiKeyName,
    hasApiKeyPrivate: !!apiKeyPrivate,
    apiKeyNameLength: apiKeyName?.length || 0,
    apiKeyPrivateLength: apiKeyPrivate?.length || 0,
    apiKeyNameStart: apiKeyName?.substring(0, 30) || 'MISSING',
    apiKeyPrivateStart: apiKeyPrivate?.substring(0, 30) || 'MISSING',
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  });
}
