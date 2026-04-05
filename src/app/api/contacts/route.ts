import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { createContactSchema, validateInput, normalizeAddress, normalizePhoneNumber } from '@/lib/validation';

/**
 * GET /api/contacts — List contacts for authenticated user
 * Supports: ?search=, ?favorites=true, ?limit=
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('contact')
      .select('*')
      .eq('user_id', user.id);

    if (favorites === 'true') {
      query = query.eq('is_favorite', true);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`name.ilike.${searchTerm},wallet_address.ilike.${searchTerm},phone_number.ilike.${searchTerm}`);
    }

    // Order: favorites first, then most recently used, then alphabetical
    query = query
      .order('is_favorite', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(limit);

    const { data: contacts, error } = await query;

    if (error) {
      console.error('[CONTACTS] Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json(contacts || []);
  } catch (error: any) {
    console.error('[CONTACTS] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/contacts — Create a new contact
 * If a transaction-sourced contact with the same address/phone exists, upgrades it to manual.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateInput(createContactSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, walletAddress, phoneNumber, isFavorite, notes } = validation.data;

    const normalizedAddress = walletAddress ? normalizeAddress(walletAddress) : null;
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

    // Check for existing contact with same identifier
    let existingQuery = supabase
      .from('contact')
      .select('*')
      .eq('user_id', user.id);

    if (normalizedAddress) {
      existingQuery = existingQuery.eq('wallet_address', normalizedAddress);
    } else if (normalizedPhone) {
      existingQuery = existingQuery.eq('phone_number', normalizedPhone);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      if (existing.source === 'transaction') {
        // Upgrade transaction contact to manual
        const { data: updated, error: updateError } = await supabase
          .from('contact')
          .update({
            name,
            source: 'manual',
            is_favorite: isFavorite || existing.is_favorite,
            notes: notes || existing.notes,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('[CONTACTS] Error upgrading contact:', updateError);
          return NextResponse.json({ error: 'Failed to upgrade contact' }, { status: 500 });
        }

        return NextResponse.json(updated, { status: 200 });
      }

      // Manual duplicate exists
      return NextResponse.json({ error: 'A contact with this identifier already exists' }, { status: 409 });
    }

    // Create new contact
    const contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { data: contact, error: insertError } = await supabase
      .from('contact')
      .insert({
        id: contactId,
        user_id: user.id,
        name,
        wallet_address: normalizedAddress,
        phone_number: normalizedPhone,
        is_favorite: isFavorite || false,
        source: 'manual',
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CONTACTS] Error creating contact:', insertError);
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error('[CONTACTS] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
