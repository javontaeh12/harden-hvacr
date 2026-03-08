// OpenAI pricing per 1M tokens (standard tier, March 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.4':     { input: 2.50,  output: 15.00 },
  'gpt-5.2':     { input: 1.75,  output: 14.00 },
  'gpt-5-mini':  { input: 0.25,  output: 2.00  },
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
