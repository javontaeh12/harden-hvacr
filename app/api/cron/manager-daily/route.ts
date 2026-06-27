import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport, buildManagerPrompt, formatReportEmbed } from '@/lib/agents/manager-agent';
import { sendToOwnChannel } from '@/lib/discord';

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

    const data = await generateDailyReport(supabase);
    const { summary, cost } = await buildManagerPrompt(data, 'daily');
    const embed = formatReportEmbed(summary, 'daily', data);

    // Post to #manager
    await sendToOwnChannel('manager', '', { embeds: [embed] });

    // Log the report
    await supabase.from('agent_logs').insert({
      agent: 'manager',
      action: 'daily_report',
      details: {
        bookings: data.bookings,
        completed: data.completedJobs,
        revenue: data.revenue,
        expenses: data.expenses,
        cost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, summary: summary.slice(0, 200) });
  } catch (error) {
    console.error('Manager daily cron error:', error);
    return NextResponse.json({ error: 'Manager daily report failed' }, { status: 500 });
  }
}
