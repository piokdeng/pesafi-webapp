import { NextResponse } from 'next/server';
import { getPublicFxQuote } from '@/lib/fx-ssp';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getPublicFxQuote());
}
