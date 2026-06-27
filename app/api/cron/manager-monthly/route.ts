import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyReport, buildManagerPrompt, formatReportEmbed } from '@/lib/agents/manager-agent';
import { sendToOwnChannel, sendToGroupMeeting } from '@/lib/discord';

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

    const data = await generateMonthlyReport(supabase);
    const { summary, cost } = await buildManagerPrompt(data, 'monthly');
    const embed = formatReportEmbed(summary, 'monthly', data);

    // Add month-over-month comparison fields
    const momFields = [
      { name: 'Prev Month Revenue', value: `$${data.prevMonthRevenue.toFixed(2)}`, inline: true },
      { name: 'Prev Month Expenses', value: `$${data.prevMonthExpenses.toFixed(2)}`, inline: true },
      { name: 'Revenue Change', value: `${data.prevMonthRevenue > 0 ? (((data.revenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100).toFixed(1) : '0'}%`, inline: true },
    ];

    if (data.topCustomers.length > 0) {
      momFields.push({
        name: 'Top Customers',
        value: data.topCustomers.map(c => `${c.name}: $${c.revenue.toFixed(2)}`).join('\n'),
        inline: false,
      });
    }

    if (data.contractRenewals > 0) {
      momFields.push({
        name: 'Contracts Expiring Soon',
        value: `${data.contractRenewals} contract(s) due for renewal within 30 days`,
        inline: false,
      });
    }

    embed.fields = [...(embed.fields || []), ...momFields];

    // Post to #manager
    await sendToOwnChannel('manager', '', { embeds: [embed] });

    // Also post to #group-meeting
    await sendToGroupMeeting('manager', '', { embeds: [embed] });

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'manager',
      action: 'monthly_report',
      details: {
        revenue: data.revenue,
        expenses: data.expenses,
        prevMonthRevenue: data.prevMonthRevenue,
        topCustomers: data.topCustomers.length,
        contractRenewals: data.contractRenewals,
        cost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, summary: summary.slice(0, 200) });
  } catch (error) {
    console.error('Manager monthly cron error:', error);
    return NextResponse.json({ error: 'Manager monthly report failed' }, { status: 500 });
  }
}
