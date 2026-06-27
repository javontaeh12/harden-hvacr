import { createServerSupabaseClient, getProfile } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    // Only admins can approve users
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, action } = await request.json();

    if (!userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Only allow updating users in the same group
    const { error } = await supabase
      .from('profiles')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', userId)
      .eq('group_id', profile.group_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
