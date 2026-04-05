import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const logoPath = join(process.cwd(), 'public', 'logos', 'logo-white-background.jpg');
    const imageBuffer = await readFile(logoPath);

    // Resize to 32x32 for favicon
    const resizedBuffer = await sharp(imageBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(resizedBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving icon:', error);
    // Return a simple fallback icon
    return new NextResponse(null, { status: 404 });
  }
}
