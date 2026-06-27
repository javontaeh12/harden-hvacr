// Manager Bot — Multi-million dollar operations manager
// Pulls live business data and injects into context every message

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function todayISO() { return new Date().toISOString().split('T')[0]; }
function monthStart() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); }
function weekAgo() { return new Date(Date.now() - 7*24*60*60*1000).toISOString(); }
function fmt$(n: number) { return `$${n.toFixed(2)}`; }

export async function buildManagerContext(): Promise<string> {
  const sb = supabase();
  const today = todayISO();
  const ms = monthStart();
  const wa = weekAgo();

  // Run all queries in parallel
  const [
    todayBookings, pendingRequests, activeWorkOrders, completedThisMonth,
    monthIncome, monthExpenses, weekIncome,
    customerCount, newCustomersMonth, activeContracts,
    lowStock, recentPayments, upcomingFollowUps,
    techProfiles, recentAgentCosts, pendingQuotes,
    activeCampaigns, recentTrips
  ] = await Promise.all([
    sb.from('bookings').select('id, service_type, start_time, status', { count: 'exact', head: false }).gte('start_time', today + 'T00:00:00').lte('start_time', today + 'T23:59:59'),
    sb.from('service_requests').select('id, name, service_type, urgency, status', { count: 'exact', head: false }).eq('status', 'pending'),
    sb.from('work_orders').select('id, status, priority, scheduled_date').in('status', ['assigned', 'en_route', 'in_progress']),
    sb.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', ms),
    sb.from('income').select('amount').gte('date', ms.split('T')[0]),
    sb.from('expenses').select('amount, category').gte('date', ms.split('T')[0]),
    sb.from('income').select('amount').gte('date', wa.split('T')[0]),
    sb.from('customers').select('id', { count: 'exact', head: true }),
    sb.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', ms),
    sb.from('contracts').select('id, title, end_date, total_value, status').eq('status', 'active'),
    sb.from('inventory_items').select('name, quantity, min_quantity').lt('quantity', 5),
    sb.from('payments').select('amount, method, status').gte('created_at', wa).eq('status', 'paid'),
    sb.from('follow_ups').select('id, description, due_date, status').eq('status', 'pending').gte('due_date', today).order('due_date', { ascending: true }).limit(10),
    sb.from('profiles').select('full_name, role, status').in('role', ['tech', 'admin']).eq('status', 'approved'),
    sb.from('agent_logs').select('agent, details').gte('created_at', ms).order('created_at', { ascending: false }).limit(50),
    sb.from('quotes').select('id, total, status').eq('status', 'sent'),
    sb.from('marketing_campaigns').select('id, name, status').eq('status', 'active'),
    sb.from('bouncie_trips').select('distance_miles, fuel_used_gallons').gte('start_time', ms),
  ]);

  // Calculate financials
  const monthRevenue = (monthIncome.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const monthExp = (monthExpenses.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const weekRevenue = (weekIncome.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const netProfit = monthRevenue - monthExp;
  const profitMargin = monthRevenue > 0 ? (netProfit / monthRevenue * 100) : 0;

  // Expense breakdown
  const expByCategory: Record<string, number> = {};
  (monthExpenses.data || []).forEach(e => {
    expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount;
  });
  const topExpenses = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // AI costs this month
  const totalAiCost = (recentAgentCosts.data || []).reduce((s, l) => {
    const d = l.details as Record<string, unknown> | null;
    return s + (typeof d?.cost === 'number' ? d.cost : 0);
  }, 0);

  // Payments this week
  const weekPayments = (recentPayments.data || []).reduce((s, p) => s + (p.amount || 0), 0);

  // Fleet this month
  const fleetMiles = (recentTrips.data || []).reduce((s, t) => s + (t.distance_miles || 0), 0);
  const fleetFuel = (recentTrips.data || []).reduce((s, t) => s + (t.fuel_used_gallons || 0), 0);

  // Pending quotes value
  const pendingQuoteValue = (pendingQuotes.data || []).reduce((s, q) => s + (q.total || 0), 0);

  // Contract renewals in next 30 days
  const soon = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
  const renewals = (activeContracts.data || []).filter(c => c.end_date && c.end_date <= soon);

  return `
=== LIVE BUSINESS DATA (as of ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}) ===

FINANCIAL SNAPSHOT (This Month):
• Revenue: ${fmt$(monthRevenue)} | Expenses: ${fmt$(monthExp)} | Net Profit: ${fmt$(netProfit)}
• Profit Margin: ${profitMargin.toFixed(1)}%
• Revenue This Week: ${fmt$(weekRevenue)}
• Payments Collected (7 days): ${fmt$(weekPayments)}
• AI/Bot Costs: ${fmt$(totalAiCost)}
• Top Expenses: ${topExpenses.map(([cat, amt]) => `${cat}: ${fmt$(amt)}`).join(', ') || 'None'}

OPERATIONS TODAY:
• Bookings Today: ${todayBookings.data?.length || 0}${todayBookings.data?.length ? ' — ' + todayBookings.data.map(b => `${b.service_type} (${b.status})`).join(', ') : ''}
• Pending Service Requests: ${pendingRequests.data?.length || 0}${pendingRequests.data?.length ? ' — ' + pendingRequests.data.slice(0, 5).map(r => `${r.name}: ${r.service_type} (${r.urgency})`).join('; ') : ''}
• Active Work Orders: ${activeWorkOrders.data?.length || 0}
• Jobs Completed This Month: ${completedThisMonth.count || 0}

SALES PIPELINE:
• Pending Quotes: ${pendingQuotes.data?.length || 0} (${fmt$(pendingQuoteValue)} total value)
• Active Contracts: ${activeContracts.data?.length || 0}
• Contracts Expiring in 30 Days: ${renewals.length}${renewals.length ? ' — ' + renewals.map(c => c.title).join(', ') : ''}

CUSTOMERS:
• Total Customers: ${customerCount.count || 0}
• New This Month: ${newCustomersMonth.count || 0}

TEAM:
• Active Staff: ${(techProfiles.data || []).map(p => `${p.full_name} (${p.role})`).join(', ') || 'None loaded'}

FLEET (This Month):
• Total Miles Driven: ${Math.round(fleetMiles).toLocaleString()}
• Fuel Used: ${fleetFuel.toFixed(1)} gallons
• Avg MPG: ${fleetFuel > 0 ? (fleetMiles / fleetFuel).toFixed(1) : 'N/A'}

INVENTORY ALERTS:
${(lowStock.data || []).length > 0
  ? (lowStock.data || []).map(i => `• LOW STOCK: ${i.name} — ${i.quantity} remaining (min: ${i.min_quantity})`).join('\n')
  : '• All inventory levels OK'}

UPCOMING FOLLOW-UPS:
${(upcomingFollowUps.data || []).length > 0
  ? (upcomingFollowUps.data || []).slice(0, 5).map(f => `• ${f.due_date}: ${f.description}`).join('\n')
  : '• No pending follow-ups'}

MARKETING:
• Active Campaigns: ${activeCampaigns.data?.length || 0}${activeCampaigns.data?.length ? ' — ' + activeCampaigns.data.map(c => c.name).join(', ') : ''}
`.trim();
}

export const MANAGER_SYSTEM_PROMPT = `You are the Chief Operations Manager for Harden HVAC & Refrigeration — a multi-million dollar level operations executive who manages every aspect of this HVAC and refrigeration service business. You report directly to the owner, Javontae Harden.

YOUR EXPERTISE:
- **Financial Management**: P&L analysis, cash flow optimization, pricing strategy, tax planning, expense control, revenue forecasting
- **Sales & Revenue**: Quote follow-up strategy, customer conversion, upselling, membership growth, contract renewal optimization
- **Marketing**: Campaign ROI analysis, lead generation strategy, seasonal promotions, customer retention programs
- **Operations**: Scheduling optimization, technician utilization, fleet management, inventory control, workflow efficiency
- **Business Strategy**: Growth planning, competitive analysis, market positioning, scalability, process improvement

YOUR PERSONALITY:
- You think like a CEO running a $2M+ operation — every dollar matters, every customer matters
- You're direct, data-driven, and action-oriented — never vague
- You proactively identify problems and opportunities from the data
- You prioritize by impact: what moves the needle most RIGHT NOW
- You give specific, actionable recommendations — not generic business advice
- When asked for a report, you deliver organized, formatted analysis with numbers
- You track KPIs and call out trends (positive and negative)
- You're the owner's right hand — anticipate what they need before they ask

HOW YOU WORK:
1. Every message includes LIVE BUSINESS DATA injected below. Use it to ground every response in reality.
2. When the owner asks "how's business?", give a concise executive briefing with key numbers and action items.
3. When asked to generate a report, format it professionally with sections, bullet points, and key metrics.
4. When given a task, break it into actionable steps and identify what you can do vs what needs the owner's action.
5. Flag urgent items proactively: late follow-ups, expiring contracts, low stock, pending requests piling up.
6. For financial questions, show the math — revenue, costs, margins, comparisons.
7. Keep responses focused and scannable — use headers, bullets, and bold for key numbers.

COMPANY CONTEXT:
- Business: Harden HVAC & Refrigeration (residential + commercial HVAC and refrigeration)
- Location: Tallahassee/Quincy, FL — Leon, Gadsden, Wakulla, Jefferson counties
- Phone: (910) 546-6485
- Website: hardenhvacr.com
- Services: Emergency repair, tune-ups, diagnostics, cooling, heating, ductless, inverter heat pumps, commercial refrigeration, refrigerator/freezer repair
- Revenue sources: Service calls, maintenance agreements, memberships, contracts, parts sales, installs
- Tech stack: Next.js app with Supabase, AI agents (dispatch, marketing, finance, security), Bouncie GPS fleet tracking`;
