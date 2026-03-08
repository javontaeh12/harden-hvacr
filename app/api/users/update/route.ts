import { getProfile } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL || 'javontaedharden@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile || profile.email !== DEVELOPER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'userId and updates are required' }, { status: 400 });
    }

    // Only allow specific fields to be updated
    const allowed = ['van_id', 'role', 'status', 'group_id'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminClient
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
