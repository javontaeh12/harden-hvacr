import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateFinancialSnapshot,
  categorizeExpenses,
  calculatePayrollSummary,
  buildFinancePrompt,
} from '@/lib/agents/finance-agent';
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
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    const prevStartDate = prevWeekStart.toISOString().split('T')[0];

    // Current week snapshot
    const weekSnapshot = await generateFinancialSnapshot(supabase, 'week');

    // Previous week for comparison
    const [{ data: prevIncome }, { data: prevExpenses }] = await Promise.all([
      supabase.from('income').select('amount').gte('date', prevStartDate).lt('date', startDate),
      supabase.from('expenses').select('amount').gte('date', prevStartDate).lt('date', startDate),
    ]);

    const prevRevenue = (prevIncome || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const prevExpensesTotal = (prevExpenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Expense categories & payroll
    const { categories, taxDeductibleTotal } = await categorizeExpenses(supabase, startDate, endDate);
    const { totalLaborCost, techBreakdown } = await calculatePayrollSummary(supabase, startDate, endDate);

    // AI analysis
    const { analysis, cost } = await buildFinancePrompt(weekSnapshot);

    // Revenue by source
    const sourceFields = Object.entries(weekSnapshot.revenueBySource).map(([src, amt]) => ({
      name: src.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: `$${amt.toFixed(2)}`,
      inline: true,
    }));

    // Expense category fields
    const expenseFields = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([cat, amt]) => ({
        name: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: `$${amt.toFixed(2)}`,
        inline: true,
      }));

    // Post to #finance
    await sendToOwnChannel('finance', '', {
      embeds: [
        {
          title: `Weekly Finance Report — ${startDate} to ${endDate}`,
          description: analysis.slice(0, 4096),
          color: 0xf59e0b,
          fields: [
            { name: 'Revenue', value: `$${weekSnapshot.grossRevenue.toFixed(2)}`, inline: true },
            { name: 'Expenses', value: `$${weekSnapshot.totalExpenses.toFixed(2)}`, inline: true },
            { name: 'Net Profit', value: `$${weekSnapshot.netProfit.toFixed(2)}`, inline: true },
            { name: 'Profit Margin', value: `${weekSnapshot.profitMargin.toFixed(1)}%`, inline: true },
            { name: 'Prev Week Revenue', value: `$${prevRevenue.toFixed(2)}`, inline: true },
            { name: 'Revenue Change', value: `${prevRevenue > 0 ? (((weekSnapshot.grossRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : '0'}%`, inline: true },
          ],
          footer: { text: `AI Cost: $${cost.toFixed(4)}` },
          timestamp: new Date().toISOString(),
        },
        {
          title: 'Revenue by Source',
          color: 0x059669,
          fields: sourceFields.length > 0 ? sourceFields : [{ name: 'No Data', value: 'No revenue recorded this week' }],
        },
        {
          title: 'Expenses by Category',
          color: 0xdc2626,
          fields: [
            ...expenseFields,
            { name: 'Tax Deductible Total', value: `$${taxDeductibleTotal.toFixed(2)}`, inline: true },
          ],
        },
        ...(totalLaborCost > 0 ? [{
          title: 'Payroll Summary',
          color: 0x7c3aed,
          fields: [
            { name: 'Total Labor Cost', value: `$${totalLaborCost.toFixed(2)}`, inline: true },
            ...techBreakdown.map(t => ({
              name: t.name,
              value: `$${t.grossPay.toFixed(2)} (${t.hours}h)`,
              inline: true,
            })),
          ],
        }] : []),
      ],
    });

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'finance',
      action: 'weekly_finance_report',
      details: {
        revenue: weekSnapshot.grossRevenue,
        expenses: weekSnapshot.totalExpenses,
        profit_margin: weekSnapshot.profitMargin,
        prev_revenue: prevRevenue,
        prev_expenses: prevExpensesTotal,
        labor_cost: totalLaborCost,
        cost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, revenue: weekSnapshot.grossRevenue, profitMargin: weekSnapshot.profitMargin });
  } catch (error) {
    console.error('Finance weekly cron error:', error);
    return NextResponse.json({ error: 'Finance weekly failed' }, { status: 500 });
  }
}
