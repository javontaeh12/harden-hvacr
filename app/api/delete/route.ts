import { createServerSupabaseClient, getProfile } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// Allowed tables and their required role for deletion
const TABLE_PERMISSIONS: Record<string, string[]> = {
  inventory_items: ['admin', 'tech'],
  custom_parts: ['admin'],
  group_stock_parts: ['admin'],
  document_groups: ['admin', 'manager'],
  documents: ['admin', 'manager', 'tech'],
};

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { table, id } = await request.json();

    if (!table || !id) {
      return NextResponse.json({ error: 'table and id are required' }, { status: 400 });
    }

    const allowedRoles = TABLE_PERMISSIONS[table];
    if (!allowedRoles) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify the item belongs to the user's group
    if (['inventory_items', 'custom_parts', 'group_stock_parts', 'document_groups'].includes(table)) {
      const { data: item } = await supabase
        .from(table)
        .select('group_id')
        .eq('id', id)
        .single();

      if (!item || item.group_id !== profile.group_id) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
    }

    // For documents, verify via parent document_group
    if (table === 'documents') {
      const { data: doc } = await supabase
        .from('documents')
        .select('group_id')
        .eq('id', id)
        .single();

      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const { data: docGroup } = await supabase
        .from('document_groups')
        .select('group_id')
        .eq('id', doc.group_id)
        .single();

      if (!docGroup || docGroup.group_id !== profile.group_id) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error(`Delete error (${table}):`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
