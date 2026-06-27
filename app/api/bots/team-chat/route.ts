import { openai } from '@/lib/openai';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';
import { calculateCost } from '@/lib/ai-costs';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BOT_ROLES: Record<string, { name: string; keywords: string[]; agent: string }> = {
  manager: {
    name: 'Business Manager',
    agent: 'bot_manager',
    keywords: ['strategy', 'operations', 'schedule', 'hiring', 'growth', 'plan', 'team', 'employee', 'workflow', 'process', 'sop', 'procedure', 'manage', 'kpi', 'goal', 'meeting', 'performance', 'business', 'expand', 'organize', 'delegate'],
  },
  marketing: {
    name: 'Marketing Expert',
    agent: 'bot_marketing',
    keywords: ['marketing', 'social media', 'ads', 'advertising', 'campaign', 'brand', 'review', 'seo', 'website', 'email campaign', 'newsletter', 'referral', 'promotion', 'facebook', 'instagram', 'google ads', 'content', 'post', 'flyer', 'leads'],
  },
  security: {
    name: 'Security & Compliance',
    agent: 'bot_security',
    keywords: ['security', 'compliance', 'osha', 'epa', 'safety', 'insurance', 'policy', 'liability', 'regulation', 'risk', 'audit', 'cyber', 'password', 'data', 'privacy', 'fire', 'lockout', 'tagout', 'refrigerant tracking', 'section 608'],
  },
  finance: {
    name: 'Financial Advisor',
    agent: 'bot_finance',
    keywords: ['price', 'pricing', 'profit', 'revenue', 'cost', 'budget', 'tax', 'cash flow', 'invoice', 'payment', 'markup', 'margin', 'expense', 'payroll', 'financial', 'accounting', 'roi', 'loan', 'lease', 'money', 'charge', 'rate'],
  },
  tech: {
    name: 'Tech Assistant',
    agent: 'bot_tech',
    keywords: ['troubleshoot', 'diagnose', 'repair', 'hvac', 'refrigerant', 'compressor', 'condenser', 'evaporator', 'thermostat', 'wiring', 'pressure', 'superheat', 'subcooling', 'amp', 'voltage', 'capacitor', 'motor', 'furnace', 'heat pump', 'mini split', 'error code', 'fault'],
  },
};

const BOT_PROMPTS: Record<string, string> = {
  manager: `You are the Business Manager on a team of AI advisors for an HVAC and refrigeration service company. You handle strategy, operations, scheduling, hiring, and growth planning. Be direct and practical. You understand trades businesses.`,
  marketing: `You are the Marketing Expert on a team of AI advisors for an HVAC and refrigeration service company. You handle social media, ads, email campaigns, branding, and lead generation. Write ready-to-use content.`,
  security: `You are the Security & Compliance advisor on a team of AI advisors for an HVAC and refrigeration service company. You handle OSHA, EPA, insurance, cybersecurity, and policies. Reference specific regulations but explain in plain language.`,
  finance: `You are the Financial Advisor on a team of AI advisors for an HVAC and refrigeration service company. You handle pricing, profitability, cash flow, taxes, and budgeting. Include specific numbers and formulas.`,
  tech: `You are the Tech Assistant on a team of AI advisors for an HVAC and refrigeration service company. You help with field troubleshooting, diagnostics, error codes, and repair procedures. Think like you're standing next to the tech at the unit.`,
};

function detectBots(message: string): string[] {
  const lower = message.toLowerCase();
  const scores: [string, number][] = [];

  for (const [botId, config] of Object.entries(BOT_ROLES)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) score += keyword.includes(' ') ? 3 : 1;
    }
    if (score > 0) scores.push([botId, score]);
  }

  // Sort by score descending, return matching bots
  scores.sort((a, b) => b[1] - a[1]);

  // If no match, default to manager
  if (scores.length === 0) return ['manager'];

  // Return top matches (max 2 bots per message to keep responses focused)
  return scores.slice(0, 2).map(s => s[0]);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user's group_id
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    const groupId = profile?.group_id;

    const { message, history } = await request.json();

    // Detect which bots should respond
    const respondingBots = detectBots(message);

    // Load memories for responding bots
    const memories: Record<string, string[]> = {};
    if (groupId) {
      const { data: mems } = await supabase
        .from('bot_memories')
        .select('bot, content')
        .eq('group_id', groupId)
        .in('bot', respondingBots)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (mems) {
        for (const m of mems) {
          if (!memories[m.bot]) memories[m.bot] = [];
          memories[m.bot].push(m.content);
        }
      }
    }

    // Build responses from each bot
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < respondingBots.length; i++) {
          const botId = respondingBots[i];
          const botName = BOT_ROLES[botId].name;
          const botPrompt = BOT_PROMPTS[botId];

          // Add separator between bot responses
          if (i > 0) {
            controller.enqueue(encoder.encode('\n\n---\n\n'));
          }

          // Bot header
          controller.enqueue(encoder.encode(`**${botName}:**\n`));

          // Build system prompt with memories
          let systemPrompt = botPrompt;
          const botMemories = memories[botId];
          if (botMemories && botMemories.length > 0) {
            systemPrompt += `\n\nYour persistent memories from previous conversations with this business:\n${botMemories.map((m, j) => `${j + 1}. ${m}`).join('\n')}\n\nUse these memories to provide more personalized, contextual advice. Reference relevant memories naturally.`;
          }

          systemPrompt += `\n\nIMPORTANT: You are responding in a team chat where multiple advisors may respond. Keep your answer focused on YOUR area of expertise. Be concise but thorough. If the user's message has a part that another advisor would handle better, briefly note that and focus on your specialty.`;

          systemPrompt += `\n\nIf the user shares important business information (like their team size, revenue numbers, goals, preferences, or key decisions), end your response with a line starting with "MEMORY:" followed by a brief factual note to remember. Only do this for genuinely important, reusable information — not for every message.`;

          // Build conversation input
          const input = [
            ...(history || []).map((m: { role: string; content: string; bot?: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.bot ? `[${BOT_ROLES[m.bot]?.name || m.bot}]: ${m.content}` : m.content,
            })),
            { role: 'user' as const, content: message },
          ];

          try {
            const stream = await openai.responses.create({
              model: 'gpt-5.4',
              instructions: systemPrompt,
              tools: [{ type: 'web_search_preview' }],
              max_output_tokens: 1500,
              input,
              stream: true,
            });

            let inputTokens = 0;
            let outputTokens = 0;
            let fullResponse = '';

            for await (const event of stream) {
              if (event.type === 'response.output_text.delta') {
                controller.enqueue(encoder.encode(event.delta));
                fullResponse += event.delta;
              }
              if (event.type === 'response.completed') {
                const usage = event.response?.usage;
                inputTokens = usage?.input_tokens || 0;
                outputTokens = usage?.output_tokens || 0;
              }
            }

            // Extract and save memory if present
            const memoryMatch = fullResponse.match(/MEMORY:\s*(.+?)$/m);
            if (memoryMatch && groupId) {
              const memoryContent = memoryMatch[1].trim();
              Promise.resolve(supabase.from('bot_memories').insert({
                group_id: groupId,
                bot: botId,
                content: memoryContent,
                category: 'general',
              } as Record<string, unknown>)).catch(err => console.error('Failed to save memory:', err));
            }

            // Log cost
            if (inputTokens || outputTokens) {
              const cost = calculateCost('gpt-5.4', inputTokens, outputTokens);
              Promise.resolve(supabase.from('agent_logs').insert({
                agent: BOT_ROLES[botId].agent,
                action: 'team_chat',
                details: {
                  bot_name: botName,
                  model: 'gpt-5.4',
                  input_tokens: inputTokens,
                  output_tokens: outputTokens,
                  cost,
                },
              } as Record<string, unknown>)).catch(err => console.error('Failed to log bot usage:', err));
            }
          } catch (err) {
            console.error(`Error from ${botName}:`, err);
            controller.enqueue(encoder.encode(`*Error getting response. Please try again.*`));
          }
        }

        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Responding-Bots': respondingBots.join(','),
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Team chat API error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
