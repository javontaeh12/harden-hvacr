import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runGroupMeeting } from '@/lib/agents/group-meeting';

export const maxDuration = 60;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await runGroupMeeting(supabase);

    return NextResponse.json({ ok: result.ok, cost: result.cost });
  } catch (error) {
    console.error('Group meeting cron error:', error);
    return NextResponse.json({ error: 'Group meeting failed' }, { status: 500 });
  }
}
