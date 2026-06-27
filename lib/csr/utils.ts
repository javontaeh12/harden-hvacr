/**
 * Robustly extract JSON from AI-generated text.
 * Handles markdown code blocks, extra text before/after JSON, and common formatting issues.
 */
export function parseAIJson<T = unknown>(text: string): T {
  // Strip markdown code blocks
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  // Find the outermost { ... }
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`No JSON object found in AI response: ${text.slice(0, 200)}`);
  }
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

  // Try parsing as-is first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through to repair attempts
  }

  // Repair attempt: remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // Repair attempt: fix unescaped newlines in string values
  cleaned = cleaned.replace(/:\s*"([^"]*)\n([^"]*?)"/g, (_, a, b) => `: "${a}\\n${b}"`);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through
  }

  // Last resort: replace control characters inside strings
  cleaned = cleaned.replace(/[\x00-\x1f\x7f]/g, (ch) => {
    if (ch === '\n') return '\\n';
    if (ch === '\r') return '\\r';
    if (ch === '\t') return '\\t';
    return '';
  });

  return JSON.parse(cleaned) as T;
}

// OpenAI pricing per 1M tokens (March 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.4':    { input: 2.50,  output: 15.00 },
  'gpt-5.2':    { input: 1.75,  output: 14.00 },
  'gpt-5-mini': { input: 0.25,  output: 2.00  },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING['gpt-5.4'];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function extractUsage(response: Record<string, unknown>): {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
} {
  const usage = response.usage as Record<string, number> | undefined;
  return {
    input_tokens: usage?.input_tokens || usage?.prompt_tokens || 0,
    output_tokens: usage?.output_tokens || usage?.completion_tokens || 0,
    total_tokens: usage?.total_tokens || 0,
  };
}

/** Extract text from OpenAI responses.create() result */
export function extractAIText(response: Record<string, unknown>): string {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }
  let aiText = '';
  if (Array.isArray(response.output)) {
    for (const item of response.output as Array<Record<string, unknown>>) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content as Array<Record<string, unknown>>) {
          if (c.type === 'output_text' || c.type === 'text') aiText += (c.text || '') as string;
        }
      }
    }
  }
  return aiText;
}

/** Create a Supabase service role client for server-side operations */
export function createServiceClient() {
  // Dynamic import to avoid bundling in client — this file is server-only
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
