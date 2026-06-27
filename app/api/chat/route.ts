import { openai, HVAC_SYSTEM_PROMPT } from '@/lib/openai';
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

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages } = await request.json();

    const stream = await openai.responses.create({
      model: 'gpt-5.4',
      instructions: HVAC_SYSTEM_PROMPT,
      tools: [{ type: 'web_search_preview' }],
      max_output_tokens: 1024,
      input: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      stream: true,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of stream) {
          if (event.type === 'response.output_text.delta') {
            controller.enqueue(encoder.encode(event.delta));
          }
          if (event.type === 'response.completed') {
            const usage = event.response?.usage;
            inputTokens = usage?.input_tokens || 0;
            outputTokens = usage?.output_tokens || 0;
          }
        }

        if (inputTokens || outputTokens) {
          const cost = calculateCost('gpt-5.4', inputTokens, outputTokens);
          const supabase = createServiceClient();
          Promise.resolve(supabase.from('agent_logs').insert({
            agent: 'ai_helper',
            action: 'chat',
            details: { model: 'gpt-5.4', input_tokens: inputTokens, output_tokens: outputTokens, cost },
          } as Record<string, unknown>)).catch((err: unknown) => console.error('Failed to log chat usage:', err));
        }

        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
