import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Sync completed payments to income table (avoids duplicates via invoice_number check)
export async function autoLogPayments(supabase: SupabaseClient): Promise<number> {
  const { data: payments } = await supabase
    .from('payments')
    .select('*, work_orders(customer_id, description)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!payments || payments.length === 0) return 0;

  let logged = 0;
  for (const payment of payments) {
    const invoiceNum = `PAY-${payment.id}`;

    // Check for duplicate
    const { count } = await supabase
      .from('income')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_number', invoiceNum);

    if (count && count > 0) continue;

    await supabase.from('income').insert({
      source: 'service_call',
      description: payment.work_orders?.description?.slice(0, 200) || 'Service payment',
      amount: payment.amount,
      customer_id: payment.work_orders?.customer_id || null,
      work_order_id: payment.work_order_id || null,
      payment_method: payment.method || 'unknown',
      date: payment.paid_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      invoice_number: invoiceNum,
    } as Record<string, unknown>);
    logged++;
  }

  return logged;
}

export interface FinancialSnapshot {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueBySource: Record<string, number>;
  period: string;
}

export async function generateFinancialSnapshot(
  supabase: SupabaseClient,
  period: 'today' | 'week' | 'month' | 'quarter'
): Promise<FinancialSnapshot> {
  const now = new Date();
  let startDate: string;

  switch (period) {
    case 'today':
      startDate = now.toISOString().split('T')[0];
      break;
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
      break;
    }
  }

  const [{ data: incomeRows }, { data: expenseRows }] = await Promise.all([
    supabase.from('income').select('amount, source').gte('date', startDate),
    supabase.from('expenses').select('amount').gte('date', startDate),
  ]);

  const grossRevenue = (incomeRows || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = (expenseRows || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const netProfit = grossRevenue - totalExpenses;
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const revenueBySource: Record<string, number> = {};
  for (const row of incomeRows || []) {
    const src = row.source || 'other';
    revenueBySource[src] = (revenueBySource[src] || 0) + Number(row.amount || 0);
  }

  return { grossRevenue, totalExpenses, netProfit, profitMargin, revenueBySource, period };
}

export async function categorizeExpenses(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<{ categories: Record<string, number>; taxDeductibleTotal: number }> {
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, tax_deductible')
    .gte('date', startDate)
    .lte('date', endDate);

  const categories: Record<string, number> = {};
  let taxDeductibleTotal = 0;

  for (const exp of expenses || []) {
    const cat = exp.category || 'other';
    categories[cat] = (categories[cat] || 0) + Number(exp.amount || 0);
    if (exp.tax_deductible) taxDeductibleTotal += Number(exp.amount || 0);
  }

  return { categories, taxDeductibleTotal };
}

export async function calculatePayrollSummary(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<{ totalLaborCost: number; techBreakdown: { name: string; grossPay: number; hours: number }[] }> {
  const { data: payroll } = await supabase
    .from('payroll')
    .select('gross_pay, hours_worked, tech_id, profiles(full_name)')
    .gte('pay_period_start', startDate)
    .lte('pay_period_end', endDate);

  let totalLaborCost = 0;
  const techMap: Record<string, { name: string; grossPay: number; hours: number }> = {};

  for (const p of payroll || []) {
    const gross = Number(p.gross_pay || 0);
    totalLaborCost += gross;
    const id = p.tech_id;
    if (id) {
      if (!techMap[id]) techMap[id] = { name: ((Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { full_name: string } | null)?.full_name || 'Unknown', grossPay: 0, hours: 0 };
      techMap[id].grossPay += gross;
      techMap[id].hours += Number(p.hours_worked || 0);
    }
  }

  return { totalLaborCost, techBreakdown: Object.values(techMap) };
}

export async function buildTaxEstimate(
  supabase: SupabaseClient,
  quarter: string
): Promise<{ estimatedTax: number; netProfit: number }> {
  const year = parseInt(quarter.split('-')[0]);
  const q = parseInt(quarter.split('Q')[1]);
  const startMonth = (q - 1) * 3;
  const startDate = new Date(year, startMonth, 1).toISOString().split('T')[0];
  const endDate = new Date(year, startMonth + 3, 0).toISOString().split('T')[0];

  const [{ data: income }, { data: expenses }] = await Promise.all([
    supabase.from('income').select('amount').gte('date', startDate).lte('date', endDate),
    supabase.from('expenses').select('amount, tax_deductible').gte('date', startDate).lte('date', endDate),
  ]);

  const totalIncome = (income || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const deductions = (expenses || []).filter(e => e.tax_deductible).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const taxableIncome = totalIncome - deductions;
  const taxRate = 0.25; // Estimated 25% effective rate for small business
  const estimatedTax = Math.max(0, taxableIncome * taxRate);

  // Save to tax_estimates table
  await supabase.from('tax_estimates').upsert({
    period: quarter,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    estimated_tax: estimatedTax,
    tax_rate: taxRate * 100,
    deductions_total: deductions,
  } as Record<string, unknown>, { onConflict: 'period' }).select();

  return { estimatedTax, netProfit };
}

export async function buildFinancePrompt(snapshot: FinancialSnapshot): Promise<{ analysis: string; cost: number }> {
  const sourceSummary = Object.entries(snapshot.revenueBySource)
    .map(([src, amt]) => `${src}: $${amt.toFixed(2)}`)
    .join(', ');

  const prompt = `You are the Finance AI for Harden HVACR. Analyze these ${snapshot.period} financials:

- Gross Revenue: $${snapshot.grossRevenue.toFixed(2)}
- Total Expenses: $${snapshot.totalExpenses.toFixed(2)}
- Net Profit: $${snapshot.netProfit.toFixed(2)}
- Profit Margin: ${snapshot.profitMargin.toFixed(1)}%
- Revenue by Source: ${sourceSummary || 'No data'}

Give 2-3 bullet points on cash flow health and any concerns. Keep it under 150 words.`;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are a small business financial analyst. Be direct and practical.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 300,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);

  // Log AI cost
  const supabase = getServiceClient();
  supabase.from('agent_logs').insert({
    agent: 'finance',
    action: 'financial_analysis',
    request_id: null,
    details: { period: snapshot.period, revenue: snapshot.grossRevenue, expenses: snapshot.totalExpenses, cost },
  } as Record<string, unknown>).then(() => {}, () => {});

  return { analysis: response.output_text || 'No analysis generated.', cost };
}
