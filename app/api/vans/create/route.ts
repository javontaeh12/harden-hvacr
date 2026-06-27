import { createServerSupabaseClient, getProfile } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved users can create vans' }, { status: 403 });
    }

    const { van_number, group_id } = await request.json();

    if (!van_number || typeof van_number !== 'string' || van_number.trim().length === 0) {
      return NextResponse.json({ error: 'van_number is required' }, { status: 400 });
    }

    const effectiveGroupId = group_id || profile.group_id;

    if (!effectiveGroupId) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    if (effectiveGroupId !== profile.group_id) {
      return NextResponse.json({ error: 'Cannot create van in another group' }, { status: 403 });
    }

    // Use service role client to bypass RLS for bulk inserts
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const trimmedVanNumber = van_number.trim();

    // Create the van
    const { data: van, error: vanError } = await adminClient
      .from('vans')
      .insert({
        name: `Van ${trimmedVanNumber}`,
        van_number: trimmedVanNumber,
        group_id: effectiveGroupId,
      })
      .select()
      .single();

    if (vanError) {
      const message = vanError.code === '23505'
        ? `Van number "${trimmedVanNumber}" already exists`
        : vanError.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Auto-assign this van to the creator's profile if they don't have one
    if (!profile.van_id) {
      await adminClient
        .from('profiles')
        .update({ van_id: van.id })
        .eq('id', profile.id);
    }

    // Fetch group's stock parts
    const { data: groupParts, error: partsError } = await adminClient
      .from('group_stock_parts')
      .select('item, description, category')
      .eq('group_id', effectiveGroupId);

    if (partsError) {
      return NextResponse.json({ error: 'Failed to fetch group stock parts' }, { status: 500 });
    }

    if (!groupParts || groupParts.length === 0) {
      return NextResponse.json({
        van,
        parts_count: 0,
        total_parts: 0,
        warning: 'No stock parts defined for this group.',
      });
    }

    // Batch-insert all group parts with quantity 0
    const inventoryRows = groupParts.map((part) => ({
      van_id: van.id,
      name: part.description || part.item,
      description: part.description,
      part_number: part.item,
      quantity: 0,
      min_quantity: 1,
      category: part.category || 'Misc',
      group_id: effectiveGroupId,
    }));

    let insertedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < inventoryRows.length; i += batchSize) {
      const batch = inventoryRows.slice(i, i + batchSize);
      const { error: insertError } = await adminClient
        .from('inventory_items')
        .insert(batch);

      if (insertError) {
        console.error(`Batch insert error at offset ${i}:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    return NextResponse.json({
      van,
      parts_count: insertedCount,
      total_parts: groupParts.length,
    });
  } catch (error) {
    console.error('Van creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
