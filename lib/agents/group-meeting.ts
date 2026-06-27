import { SupabaseClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { sendToGroupMeeting, type AgentName } from '@/lib/discord';

interface AgentSummary {
  agent: AgentName;
  actionCount: number;
  topActions: { action: string; count: number }[];
  totalCost: number;
}

export async function collectAgentSummaries(
  supabase: SupabaseClient,
  since: string
): Promise<AgentSummary[]> {
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('agent, action, details')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const agentMap: Record<string, { actions: Record<string, number>; totalCost: number; count: number }> = {};

  for (const log of logs || []) {
    const agent = log.agent as string;
    if (!agentMap[agent]) agentMap[agent] = { actions: {}, totalCost: 0, count: 0 };
    agentMap[agent].count++;
    agentMap[agent].actions[log.action] = (agentMap[agent].actions[log.action] || 0) + 1;

    const details = log.details as Record<string, unknown> | null;
    if (details?.cost) agentMap[agent].totalCost += Number(details.cost);
  }

  // Map agent log names to Discord agent names
  const agentNameMap: Record<string, AgentName> = {
    dispatch: 'dispatch',
    follow_up: 'marketing',
    marketing: 'marketing',
    report: 'manager',
    manager: 'manager',
    finance: 'finance',
    security: 'security',
    discord: 'dispatch',
    inbound_email: 'dispatch',
    webdev: 'webdev',
    seo: 'seo',
  };

  const summaries: AgentSummary[] = [];
  for (const [agent, data] of Object.entries(agentMap)) {
    const topActions = Object.entries(data.actions)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    summaries.push({
      agent: agentNameMap[agent] || 'manager',
      actionCount: data.count,
      topActions,
      totalCost: data.totalCost,
    });
  }

  return summaries;
}

export async function buildMeetingPrompt(summaries: AgentSummary[]): Promise<{ minutes: string; cost: number }> {
  const summaryText = summaries.map(s => {
    const actions = s.topActions.map(a => `  - ${a.action}: ${a.count}`).join('\n');
    return `${s.agent.toUpperCase()} (${s.actionCount} actions, $${s.totalCost.toFixed(4)} AI cost):\n${actions}`;
  }).join('\n\n');

  const prompt = `You are the Manager AI for Harden HVACR running a weekly team meeting. Write "meeting minutes" based on each agent's activity.

AGENT ACTIVITY (past 7 days):
${summaryText || 'No activity logged this week.'}

Write:
1. A brief overview (2 sentences)
2. Each agent's highlights (1-2 sentences each)
3. Cross-agent insights (e.g., "Dispatch scheduled 12 jobs, and Marketing followed up on 10 of them")
4. Recommendations for next week (2-3 bullets)

Keep it under 400 words. Be professional but concise.`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are an HVAC business operations manager running a team meeting. Write clear, actionable minutes.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 600,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  return { minutes: response.output_text || 'No meeting minutes generated.', cost };
}

export async function runGroupMeeting(supabase: SupabaseClient): Promise<{ ok: boolean; cost: number }> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const summaries = await collectAgentSummaries(supabase, weekAgo);

  // Each bot posts their own section
  const agentSections: Record<AgentName, AgentSummary[]> = {
    dispatch: [],
    marketing: [],
    manager: [],
    finance: [],
    security: [],
    webdev: [],
    seo: [],
  };

  for (const s of summaries) {
    if (agentSections[s.agent]) {
      agentSections[s.agent].push(s);
    }
  }

  for (const [agent, sections] of Object.entries(agentSections) as [AgentName, AgentSummary[]][]) {
    if (sections.length === 0) {
      await sendToGroupMeeting(agent, '', {
        embeds: [{
          title: `${agent.charAt(0).toUpperCase() + agent.slice(1)} — Weekly Update`,
          description: 'No activity this week.',
          color: 0x6b7280,
          timestamp: new Date().toISOString(),
        }],
      });
      continue;
    }

    const totalActions = sections.reduce((sum, s) => sum + s.actionCount, 0);
    const totalCost = sections.reduce((sum, s) => sum + s.totalCost, 0);
    const topActions = sections.flatMap(s => s.topActions).slice(0, 5);

    await sendToGroupMeeting(agent, '', {
      embeds: [{
        title: `${agent.charAt(0).toUpperCase() + agent.slice(1)} — Weekly Update`,
        color: getAgentColor(agent),
        fields: [
          { name: 'Total Actions', value: String(totalActions), inline: true },
          { name: 'AI Cost', value: `$${totalCost.toFixed(4)}`, inline: true },
          { name: 'Top Activities', value: topActions.map(a => `${a.action} (${a.count})`).join('\n') || 'None' },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Manager posts closing AI-generated cross-agent insights
  const { minutes, cost } = await buildMeetingPrompt(summaries);
  await sendToGroupMeeting('manager', '', {
    embeds: [{
      title: 'Meeting Minutes — Cross-Agent Insights',
      description: minutes.slice(0, 4096),
      color: 0x1e40af,
      footer: { text: `AI Cost: $${cost.toFixed(4)}` },
      timestamp: new Date().toISOString(),
    }],
  });

  // Log the meeting
  await supabase.from('agent_logs').insert({
    agent: 'manager',
    action: 'group_meeting',
    details: { summaries_count: summaries.length, cost },
  } as Record<string, unknown>);

  return { ok: true, cost };
}

function getAgentColor(agent: AgentName): number {
  const colors: Record<AgentName, number> = {
    dispatch: 0x1e40af,
    marketing: 0x7c3aed,
    manager: 0x059669,
    finance: 0xf59e0b,
    security: 0xdc2626,
    webdev: 0x06b6d4,
    seo: 0x8b5cf6,
  };
  return colors[agent];
}
