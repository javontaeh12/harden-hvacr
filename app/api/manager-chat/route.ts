import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { calculateCost } from '@/lib/ai-costs';
import { buildManagerContext, MANAGER_SYSTEM_PROMPT } from '@/lib/manager-bot';

export const maxDuration = 30;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array required', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('AI service not configured', { status: 500 });
    }

    const liveContext = await buildManagerContext();
    const fullSystemPrompt = `${MANAGER_SYSTEM_PROMPT}\n\n${liveContext}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        instructions: fullSystemPrompt,
        input: messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        max_output_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return new Response('AI error', { status: 500 });
    }

    const encoder = new TextEncoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              if (event.type === 'response.output_text.delta') {
                controller.enqueue(encoder.encode(event.delta));
              }
              if (event.type === 'response.completed') {
                const usage = event.response?.usage;
                inputTokens = usage?.input_tokens || 0;
                outputTokens = usage?.output_tokens || 0;
              }
            } catch {
              // skip
            }
          }
        }

        if (inputTokens || outputTokens) {
          const cost = calculateCost('gpt-5-mini', inputTokens, outputTokens);
          const sb = createServiceClient();
          sb.from('agent_logs').insert({
            agent: 'manager_chat',
            action: 'chat',
            details: { model: 'gpt-5-mini', input_tokens: inputTokens, output_tokens: outputTokens, cost },
          } as Record<string, unknown>).then(() => {});
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
    console.error('Manager chat error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
