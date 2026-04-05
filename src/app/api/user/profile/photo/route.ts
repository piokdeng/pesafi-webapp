import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate base64 image
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    console.log('[Photo API] Uploading photo for user:', user.id);

    // Extract image data and file extension
    const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const [, fileExtension, base64Data] = matches;
    const fileName = `avatar-${user.id}.${fileExtension}`;
    const filePath = `avatars/${fileName}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large. Maximum size is 2MB.' }, { status: 413 });
    }

    // Upload to Supabase Storage
    const adminSupabase = createAdminSupabaseClient();
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('user-uploads')
      .upload(filePath, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: true, // Replace existing file
      });

    if (uploadError) {
      console.error('[Photo API] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from('user-uploads')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update user metadata with only the URL (not base64 data)
    const { data: updatedUser, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          avatar_url: avatarUrl, // Store only the URL, not base64 data
        },
      }
    );

    if (updateError) {
      console.error('[Photo API] Error updating user metadata:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('[Photo API] Upload successful, URL:', avatarUrl);

    // Verify token size is still reasonable after update
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && session.access_token.length > 10000) {
      console.warn('[Photo API] Token size warning:', session.access_token.length, 'bytes');
      // This shouldn't happen anymore with URL storage, but log for monitoring
    }

    return NextResponse.json({ image: avatarUrl });
  } catch (error: any) {
    console.error('[Photo API] Error uploading photo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
