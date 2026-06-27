import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { buildDailyScheduleEmbed } from '@/lib/agents/dispatch-agent';
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
    const scheduleEmbed = await buildDailyScheduleEmbed(supabase);

    // Get work orders with addresses for route optimization
    const today = new Date().toISOString().split('T')[0];
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('*, customers(full_name, address, city, zip), profiles(full_name)')
      .eq('scheduled_date', today)
      .in('status', ['assigned', 'en_route', 'in_progress'])
      .order('scheduled_date', { ascending: true });

    let routeSuggestion = '';
    let aiCost = 0;

    if (workOrders && workOrders.length > 1) {
      const jobList = workOrders.map(wo => {
        const addr = wo.customers?.address || 'Unknown';
        const city = wo.customers?.city || '';
        const zip = wo.customers?.zip || '';
        const tech = wo.profiles?.full_name || 'Unassigned';
        return `${wo.customers?.full_name || 'Unknown'} — ${addr}, ${city} ${zip} — Tech: ${tech}`;
      }).join('\n');

      const response = await openai.responses.create({
        model: 'gpt-5-mini',
        instructions: 'You are a dispatch route optimizer. Be concise.',
        input: [{ role: 'user', content: `Optimize the route order for these ${workOrders.length} HVAC service jobs today. Group by area and suggest the most efficient drive order:\n\n${jobList}\n\nGive a numbered route order with brief reasoning. Under 150 words.` }],
        max_output_tokens: 300,
      });

      routeSuggestion = response.output_text || '';
      const usage = extractUsage(response as unknown as Record<string, unknown>);
      aiCost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);
    }

    // Post schedule to #dispatch
    await sendToOwnChannel('dispatch', '', { embeds: [scheduleEmbed] });

    // Post route suggestion if available
    if (routeSuggestion) {
      await sendToOwnChannel('dispatch', '', {
        embeds: [{
          title: 'Route Optimization',
          description: routeSuggestion.slice(0, 4096),
          color: 0x059669,
          footer: { text: `AI Cost: $${aiCost.toFixed(4)}` },
          timestamp: new Date().toISOString(),
        }],
      });
    }

    // Log the action
    await supabase.from('agent_logs').insert({
      agent: 'dispatch',
      action: 'daily_schedule_posted',
      details: { jobs: workOrders?.length || 0, route_optimized: !!routeSuggestion, cost: aiCost },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, jobs: workOrders?.length || 0 });
  } catch (error) {
    console.error('Dispatch daily cron error:', error);
    return NextResponse.json({ error: 'Dispatch daily failed' }, { status: 500 });
  }
}
