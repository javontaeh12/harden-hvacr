import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveJoin(data: any): Record<string, any> | null {
  const d = Array.isArray(data) ? data[0] : data;
  return d || null;
}

interface ReportData {
  bookings: number;
  completedJobs: number;
  pendingRequests: number;
  revenue: number;
  expenses: number;
  aiCost: number;
  lowStockItems: { name: string; quantity: number }[];
  techPerformance: { name: string; jobs: number }[];
  customerCount: number;
  contractRenewals: number;
}

export async function generateDailyReport(supabase: SupabaseClient): Promise<ReportData> {
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;

  const [
    { count: bookingsCount },
    { data: completedLogs },
    { count: pendingCount },
    { data: todayIncome },
    { data: todayExpenses },
    { data: agentLogs },
    { data: lowStock },
    { data: workOrders },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'scheduled').gte('start_time', todayStart).lte('start_time', todayEnd),
    supabase.from('agent_logs').select('*').eq('action', 'job_completed').gte('created_at', todayStart),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('income').select('amount').eq('date', today),
    supabase.from('expenses').select('amount').eq('date', today),
    supabase.from('agent_logs').select('details').gte('created_at', todayStart),
    supabase.from('inventory_items').select('name, quantity').lt('quantity', 5),
    supabase.from('work_orders').select('assigned_tech_id, profiles(full_name)').eq('scheduled_date', today).eq('status', 'completed'),
  ]);

  const revenue = (todayIncome || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const expenses = (todayExpenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  let aiCost = 0;
  for (const log of agentLogs || []) {
    const details = log.details as Record<string, unknown> | null;
    if (details?.cost) aiCost += Number(details.cost);
  }

  // Aggregate tech performance
  const techMap: Record<string, { name: string; jobs: number }> = {};
  for (const wo of workOrders || []) {
    const id = wo.assigned_tech_id;
    const name = resolveJoin(wo.profiles)?.full_name || 'Unknown';
    if (id) {
      if (!techMap[id]) techMap[id] = { name, jobs: 0 };
      techMap[id].jobs++;
    }
  }

  return {
    bookings: bookingsCount || 0,
    completedJobs: (completedLogs || []).length,
    pendingRequests: pendingCount || 0,
    revenue,
    expenses,
    aiCost,
    lowStockItems: (lowStock || []).map(i => ({ name: i.name, quantity: i.quantity })),
    techPerformance: Object.values(techMap),
    customerCount: 0,
    contractRenewals: 0,
  };
}

export async function generateWeeklyReport(supabase: SupabaseClient): Promise<ReportData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString();

  const [
    { count: bookingsCount },
    { data: completedLogs },
    { count: pendingCount },
    { data: weekIncome },
    { data: weekExpenses },
    { data: agentLogs },
    { data: lowStock },
    { data: workOrders },
    { count: newCustomers },
    { data: contracts },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('start_time', weekAgoStr),
    supabase.from('agent_logs').select('*').eq('action', 'job_completed').gte('created_at', weekAgoStr),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('income').select('amount').gte('date', weekAgo.toISOString().split('T')[0]),
    supabase.from('expenses').select('amount').gte('date', weekAgo.toISOString().split('T')[0]),
    supabase.from('agent_logs').select('details').gte('created_at', weekAgoStr),
    supabase.from('inventory_items').select('name, quantity').lt('quantity', 5),
    supabase.from('work_orders').select('assigned_tech_id, profiles(full_name), status').gte('scheduled_date', weekAgo.toISOString().split('T')[0]),
    supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
    supabase.from('contracts').select('*').eq('status', 'active'),
  ]);

  const revenue = (weekIncome || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const expenses = (weekExpenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  let aiCost = 0;
  for (const log of agentLogs || []) {
    const details = log.details as Record<string, unknown> | null;
    if (details?.cost) aiCost += Number(details.cost);
  }

  const techMap: Record<string, { name: string; jobs: number }> = {};
  for (const wo of workOrders || []) {
    const id = wo.assigned_tech_id;
    const name = resolveJoin(wo.profiles)?.full_name || 'Unknown';
    if (id) {
      if (!techMap[id]) techMap[id] = { name, jobs: 0 };
      techMap[id].jobs++;
    }
  }

  // Count contracts expiring within 30 days
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const renewals = (contracts || []).filter(c => {
    const end = c.end_date;
    return end && end <= thirtyDaysOut;
  }).length;

  return {
    bookings: bookingsCount || 0,
    completedJobs: (completedLogs || []).length,
    pendingRequests: pendingCount || 0,
    revenue,
    expenses,
    aiCost,
    lowStockItems: (lowStock || []).map(i => ({ name: i.name, quantity: i.quantity })),
    techPerformance: Object.values(techMap),
    customerCount: newCustomers || 0,
    contractRenewals: renewals,
  };
}

export async function generateMonthlyReport(supabase: SupabaseClient): Promise<ReportData & { prevMonthRevenue: number; prevMonthExpenses: number; topCustomers: { name: string; revenue: number }[] }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    { count: bookingsCount },
    { data: completedLogs },
    { count: pendingCount },
    { data: monthIncome },
    { data: monthExpenses },
    { data: agentLogs },
    { data: lowStock },
    { data: workOrders },
    { count: newCustomers },
    { data: contracts },
    { data: prevIncome },
    { data: prevExpenses },
    { data: topCustomerIncome },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('start_time', monthStart.toISOString()),
    supabase.from('agent_logs').select('*').eq('action', 'job_completed').gte('created_at', monthStart.toISOString()),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('income').select('amount').gte('date', monthStart.toISOString().split('T')[0]),
    supabase.from('expenses').select('amount').gte('date', monthStart.toISOString().split('T')[0]),
    supabase.from('agent_logs').select('details').gte('created_at', monthStart.toISOString()),
    supabase.from('inventory_items').select('name, quantity').lt('quantity', 5),
    supabase.from('work_orders').select('assigned_tech_id, profiles(full_name), status').gte('scheduled_date', monthStart.toISOString().split('T')[0]),
    supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('contracts').select('*').eq('status', 'active'),
    supabase.from('income').select('amount').gte('date', prevMonthStart.toISOString().split('T')[0]).lte('date', prevMonthEnd.toISOString().split('T')[0]),
    supabase.from('expenses').select('amount').gte('date', prevMonthStart.toISOString().split('T')[0]).lte('date', prevMonthEnd.toISOString().split('T')[0]),
    supabase.from('income').select('amount, customer_id, customers(full_name)').gte('date', monthStart.toISOString().split('T')[0]).not('customer_id', 'is', null),
  ]);

  const revenue = (monthIncome || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const expenses = (monthExpenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const prevMonthRevenue = (prevIncome || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const prevMonthExpenses = (prevExpenses || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  let aiCost = 0;
  for (const log of agentLogs || []) {
    const details = log.details as Record<string, unknown> | null;
    if (details?.cost) aiCost += Number(details.cost);
  }

  const techMap: Record<string, { name: string; jobs: number }> = {};
  for (const wo of workOrders || []) {
    const id = wo.assigned_tech_id;
    const name = resolveJoin(wo.profiles)?.full_name || 'Unknown';
    if (id) {
      if (!techMap[id]) techMap[id] = { name, jobs: 0 };
      techMap[id].jobs++;
    }
  }

  // Top customers by revenue
  const customerRevMap: Record<string, { name: string; revenue: number }> = {};
  for (const inc of topCustomerIncome || []) {
    const id = inc.customer_id;
    const name = resolveJoin(inc.customers)?.full_name || 'Unknown';
    if (id) {
      if (!customerRevMap[id]) customerRevMap[id] = { name, revenue: 0 };
      customerRevMap[id].revenue += Number(inc.amount || 0);
    }
  }
  const topCustomers = Object.values(customerRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const renewals = (contracts || []).filter(c => c.end_date && c.end_date <= thirtyDaysOut).length;

  return {
    bookings: bookingsCount || 0,
    completedJobs: (completedLogs || []).length,
    pendingRequests: pendingCount || 0,
    revenue,
    expenses,
    aiCost,
    lowStockItems: (lowStock || []).map(i => ({ name: i.name, quantity: i.quantity })),
    techPerformance: Object.values(techMap),
    customerCount: newCustomers || 0,
    contractRenewals: renewals,
    prevMonthRevenue,
    prevMonthExpenses,
    topCustomers,
  };
}

export async function buildManagerPrompt(data: ReportData, type: 'daily' | 'weekly' | 'monthly'): Promise<{ summary: string; cost: number }> {
  const prompt = `You are the Operations Manager AI for Harden HVACR. Write a concise ${type} executive summary.

DATA:
- Bookings: ${data.bookings}
- Completed Jobs: ${data.completedJobs}
- Pending Requests: ${data.pendingRequests}
- Revenue: $${data.revenue.toFixed(2)}
- Expenses: $${data.expenses.toFixed(2)}
- Net Profit: $${(data.revenue - data.expenses).toFixed(2)}
- AI Operations Cost: $${data.aiCost.toFixed(4)}
- New Customers: ${data.customerCount}
- Contract Renewals Due: ${data.contractRenewals}
- Low Stock Items: ${data.lowStockItems.length > 0 ? data.lowStockItems.map(i => `${i.name} (${i.quantity} left)`).join(', ') : 'None'}
- Tech Performance: ${data.techPerformance.length > 0 ? data.techPerformance.map(t => `${t.name}: ${t.jobs} jobs`).join(', ') : 'No data'}

Write 3-5 bullet points with actionable insights. Flag anything that needs attention. Keep it under 300 words.`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are an HVAC business operations manager. Be direct and actionable.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 500,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  // Log AI cost
  const supabase = getServiceClient();
  supabase.from('agent_logs').insert({
    agent: 'manager',
    action: `${type}_report`,
    request_id: null,
    details: { type, bookings: data.bookings, completed: data.completedJobs, revenue: data.revenue, cost },
  } as Record<string, unknown>).then(() => {}, () => {});

  return { summary: response.output_text || 'No summary generated.', cost };
}

export function formatReportEmbed(summary: string, type: 'daily' | 'weekly' | 'monthly', data: ReportData) {
  const colors = { daily: 0x1e40af, weekly: 0x7c3aed, monthly: 0x059669 };
  const titles = { daily: 'Daily Operations Report', weekly: 'Weekly Operations Report', monthly: 'Monthly Operations Report' };

  return {
    title: titles[type],
    color: colors[type],
    description: summary.slice(0, 4096),
    fields: [
      { name: 'Bookings', value: String(data.bookings), inline: true },
      { name: 'Completed', value: String(data.completedJobs), inline: true },
      { name: 'Pending', value: String(data.pendingRequests), inline: true },
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Expenses', value: `$${data.expenses.toFixed(2)}`, inline: true },
      { name: 'Net Profit', value: `$${(data.revenue - data.expenses).toFixed(2)}`, inline: true },
      ...(data.lowStockItems.length > 0 ? [{ name: 'Low Stock Alert', value: data.lowStockItems.map(i => `${i.name} (${i.quantity})`).join(', ').slice(0, 1024) }] : []),
    ],
    footer: { text: `AI Cost: $${data.aiCost.toFixed(4)}` },
    timestamp: new Date().toISOString(),
  };
}
