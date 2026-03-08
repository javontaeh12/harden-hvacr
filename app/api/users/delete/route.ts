import { getProfile } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL || 'javontaedharden@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile || profile.role !== 'admin' || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, force } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === profile.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If force flag is set, only the developer can use it (cross-group deletion)
    if (force) {
      if (profile.email !== DEVELOPER_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized: force delete restricted' }, { status: 403 });
      }
    } else {
      // Regular admin: verify target user is in the same group
      const { data: targetUser, error: lookupError } = await adminClient
        .from('profiles')
        .select('group_id')
        .eq('id', userId)
        .single();

      if (lookupError || !targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (targetUser.group_id !== profile.group_id) {
        return NextResponse.json({ error: 'Cannot delete users outside your group' }, { status: 403 });
      }
    }

    // Delete the auth user (profile row cascades via FK)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
