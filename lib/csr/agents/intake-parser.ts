import OpenAI from 'openai';
import { parseAIJson, calculateCost, extractUsage, extractAIText } from '../utils';
import { getServicesSummary } from '../knowledgebase/services';

export interface ParsedIntent {
  intent: 'book_service' | 'get_quote' | 'check_status' | 'emergency' | 'general_question' | 'complaint' | 'cancel' | 'reschedule';
  confidence: number;
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  service_type: string | null;
  issue_summary: string;
  caller_name: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  equipment_mentioned: string | null;
  address_mentioned: string | null;
  raw_reasoning: string;
}

export interface IntakeResult {
  intent: ParsedIntent;
  model: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

export async function parseIntent(transcript: string): Promise<IntakeResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = 'gpt-5-mini';
  const servicesList = getServicesSummary();

  const prompt = `You are the AI phone receptionist for Harden HVAC & Refrigeration in Tallahassee, FL.

Analyze this phone call transcript and extract the caller's intent.

TRANSCRIPT:
${transcript}

SERVICES WE OFFER:
${servicesList}

Return ONLY valid JSON matching this schema:
{
  "intent": "book_service" | "get_quote" | "check_status" | "emergency" | "general_question" | "complaint" | "cancel" | "reschedule",
  "confidence": 0.0-1.0,
  "urgency": "routine" | "soon" | "urgent" | "emergency",
  "service_type": "string or null — which service matches best",
  "issue_summary": "1-2 sentence summary of the caller's issue/request",
  "caller_name": "caller's full name if they provided it, otherwise null",
  "preferred_date": "YYYY-MM-DD if mentioned, otherwise null",
  "preferred_time": "morning/afternoon/specific time if mentioned, otherwise null",
  "equipment_mentioned": "AC, furnace, heat pump, etc. if mentioned",
  "address_mentioned": "full address if caller provided one",
  "raw_reasoning": "brief explanation of your classification"
}

RULES:
- "emergency" = no heat in winter, no AC in extreme heat, gas smell, flooding, electrical burning smell
- "book_service" = caller wants to schedule any type of service visit
- "get_quote" = caller wants pricing info without booking
- "check_status" = caller asking about existing appointment or work order
- If confidence < 0.75, set intent to "general_question" — we'll escalate to a human
- Default urgency to "routine" unless symptoms indicate otherwise`;

  const response = await openai.responses.create({
    model,
    instructions: 'You classify HVAC customer call intents. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
  });

  const resp = response as unknown as Record<string, unknown>;
  const aiText = extractAIText(resp);
  const usage = extractUsage(resp);
  const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

  if (!aiText) {
    throw new Error(`Empty AI response from ${model}`);
  }

  const intent = parseAIJson<ParsedIntent>(aiText);

  return { intent, model, cost, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens };
}
