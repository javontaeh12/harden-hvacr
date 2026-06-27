import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Fetch bot memories (optionally filter by bot)
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    if (!profile?.group_id) {
      return NextResponse.json({ error: 'No group' }, { status: 400 });
    }

    const bot = request.nextUrl.searchParams.get('bot');

    let query = supabase
      .from('bot_memories')
      .select('*')
      .eq('group_id', profile.group_id)
      .order('updated_at', { ascending: false });

    if (bot) {
      query = query.eq('bot', bot);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json({ memories: data || [] });
  } catch (error) {
    console.error('Memories GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

// DELETE: Remove a memory
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    if (!profile?.group_id) {
      return NextResponse.json({ error: 'No group' }, { status: 400 });
    }

    const { id } = await request.json();

    const { error } = await supabase
      .from('bot_memories')
      .delete()
      .eq('id', id)
      .eq('group_id', profile.group_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memories DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
