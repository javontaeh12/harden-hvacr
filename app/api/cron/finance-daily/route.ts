import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { autoLogPayments, generateFinancialSnapshot, buildFinancePrompt, buildTaxEstimate } from '@/lib/agents/finance-agent';
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

    // Auto-log any completed payments
    const logged = await autoLogPayments(supabase);

    // Generate today's snapshot
    const todaySnapshot = await generateFinancialSnapshot(supabase, 'today');
    const monthSnapshot = await generateFinancialSnapshot(supabase, 'month');

    // AI analysis
    const { analysis, cost } = await buildFinancePrompt(todaySnapshot);

    // Post to #finance
    await sendToOwnChannel('finance', '', {
      embeds: [{
        title: `Daily Finance Report — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        description: analysis.slice(0, 4096),
        color: 0xf59e0b,
        fields: [
          { name: "Today's Revenue", value: `$${todaySnapshot.grossRevenue.toFixed(2)}`, inline: true },
          { name: "Today's Expenses", value: `$${todaySnapshot.totalExpenses.toFixed(2)}`, inline: true },
          { name: "Today's Net", value: `$${todaySnapshot.netProfit.toFixed(2)}`, inline: true },
          { name: 'Month-to-Date Revenue', value: `$${monthSnapshot.grossRevenue.toFixed(2)}`, inline: true },
          { name: 'Month-to-Date Expenses', value: `$${monthSnapshot.totalExpenses.toFixed(2)}`, inline: true },
          { name: 'MTD Net Profit', value: `$${monthSnapshot.netProfit.toFixed(2)}`, inline: true },
          { name: 'Payments Auto-Logged', value: String(logged), inline: true },
        ],
        footer: { text: `AI Cost: $${cost.toFixed(4)}` },
        timestamp: new Date().toISOString(),
      }],
    });

    // On 15th or last day of month: generate tax estimate
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    let taxEstimate = null;

    if (today.getDate() === 15 || today.getDate() === lastDayOfMonth) {
      const quarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;
      taxEstimate = await buildTaxEstimate(supabase, quarter);

      await sendToOwnChannel('finance', '', {
        embeds: [{
          title: `Tax Estimate — ${quarter}`,
          color: 0xdc2626,
          fields: [
            { name: 'Estimated Tax', value: `$${taxEstimate.estimatedTax.toFixed(2)}`, inline: true },
            { name: 'Net Profit (QTD)', value: `$${taxEstimate.netProfit.toFixed(2)}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    }

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'finance',
      action: 'daily_finance_report',
      details: {
        logged_payments: logged,
        today_revenue: todaySnapshot.grossRevenue,
        today_expenses: todaySnapshot.totalExpenses,
        mtd_revenue: monthSnapshot.grossRevenue,
        tax_estimate: taxEstimate?.estimatedTax,
        cost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      logged,
      todayRevenue: todaySnapshot.grossRevenue,
      taxEstimate: taxEstimate?.estimatedTax,
    });
  } catch (error) {
    console.error('Finance daily cron error:', error);
    return NextResponse.json({ error: 'Finance daily failed' }, { status: 500 });
  }
}
