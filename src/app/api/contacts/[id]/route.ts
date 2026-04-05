import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { updateContactSchema, validateInput, normalizeAddress, normalizePhoneNumber } from '@/lib/validation';

/**
 * PUT /api/contacts/[id] — Update a contact
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('contact')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateInput(updateContactSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const data = validation.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.isFavorite !== undefined) updates.is_favorite = data.isFavorite;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.walletAddress !== undefined) {
      updates.wallet_address = data.walletAddress ? normalizeAddress(data.walletAddress) : null;
    }
    if (data.phoneNumber !== undefined) {
      updates.phone_number = data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }

    const { data: updated, error: updateError } = await supabase
      .from('contact')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[CONTACTS] Error updating contact:', updateError);
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[CONTACTS] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id] — Delete a contact
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('contact')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[CONTACTS] Error deleting contact:', deleteError);
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CONTACTS] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
