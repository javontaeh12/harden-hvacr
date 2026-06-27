import OpenAI from 'openai';
import { findServiceByKeyword, getServicesSummary } from '../knowledgebase/services';
import { getPricingSummary } from '../knowledgebase/pricing';
import { parseAIJson, calculateCost, extractUsage, extractAIText } from '../utils';

export interface KBAnswer {
  answer: string;
  matched_service: string | null;
  model: string;
  cost: number;
}

export async function answerQuestion(
  question: string,
  context?: string,
): Promise<KBAnswer> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = 'gpt-5-mini';

  const services = getServicesSummary();
  const pricing = await getPricingSummary();

  // Try direct service match first
  const keywords = question.split(/\s+/).filter(w => w.length > 3);
  let matchedService: string | null = null;
  for (const kw of keywords) {
    const match = findServiceByKeyword(kw);
    if (match) { matchedService = match.title; break; }
  }

  const prompt = `You are the AI phone receptionist for Harden HVAC & Refrigeration in Tallahassee, FL.
Answer the customer's question using ONLY the information below. If you don't know, say so and offer to connect them with a technician.

CUSTOMER QUESTION: ${question}
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

OUR SERVICES:
${services}

PRICING:
${pricing}

BUSINESS INFO:
- Location: Tallahassee, FL area (Leon, Gadsden, Wakulla, Jefferson counties)
- Hours: Mon-Fri 8 AM - 5 PM, Sat 8 AM - 12 PM (emergency service available)
- Emergency line: 24/7 for Priority Members
- Website: hardenhvacr.com

RULES:
- Be friendly, professional, and concise
- Give specific pricing when available
- For complex questions, offer to schedule a diagnostic visit
- Never make up information

Return JSON:
{
  "answer": "Your response to the customer",
  "matched_service": "service name if relevant, null otherwise"
}`;

  const response = await openai.responses.create({
    model,
    instructions: 'You are a helpful HVAC receptionist. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
  });

  const resp = response as unknown as Record<string, unknown>;
  const aiText = extractAIText(resp);
  const usage = extractUsage(resp);
  const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseAIJson(aiText) as any;

  return {
    answer: raw.answer,
    matched_service: raw.matched_service || matchedService,
    model,
    cost,
  };
}
