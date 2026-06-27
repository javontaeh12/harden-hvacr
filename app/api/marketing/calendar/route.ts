import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week_start');

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('marketing_calendar')
      .select('*, marketing_content(*), marketing_campaigns(name, campaign_type)')
      .eq('week_start', weekStart)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET calendar error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}
