import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseAIJson, extractAIText, extractUsage, calculateCost } from '@/lib/csr/utils';

interface SummaryRequest {
  units: Array<{
    equipment_type: string;
    make: string;
    model: string;
    condition: string;
    problem_found: string;
    secondary_problems: string[];
    severity: string;
    symptoms: string[];
    areas_affected: string[];
    health_ratings: Record<string, number>;
  }>;
  tech_notes: string;
  quote_options: Array<{
    label: string;
    name: string;
    items: Array<{
      description: string;
      category: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    subtotal: number;
    is_recommended: boolean;
  }>;
  upgrades: Array<{
    name: string;
    price: number;
    benefits: string[];
  }>;
  customer_name: string;
}

export interface AISummaryResponse {
  findings_summary: string;
  urgency_explanation: string;
  options_breakdown: Array<{
    label: string;
    name: string;
    summary: string;
    includes_upgrades: string[];
    total: number;
    value_note: string;
  }>;
  recommendation: string;
  ai_cost: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SummaryRequest = await request.json();
    const { units, tech_notes, quote_options, upgrades, customer_name } = body;

    if (!units?.length && !tech_notes && !quote_options?.length) {
      return NextResponse.json(
        { error: 'At least one of units, tech_notes, or quote_options is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const model = 'gpt-5-mini';

    const unitsText = (units || []).map((u, i) => `
UNIT ${i + 1}: ${u.equipment_type} (${u.make} ${u.model})
- Condition: ${u.condition}
- Problem Found: ${u.problem_found}
- Secondary Issues: ${u.secondary_problems?.join(', ') || 'None'}
- Severity: ${u.severity}
- Symptoms: ${u.symptoms?.join(', ') || 'None'}
- Areas Affected: ${u.areas_affected?.join(', ') || 'N/A'}
- Health Ratings: ${Object.entries(u.health_ratings || {}).map(([k, v]) => `${k}: ${v}/5`).join(', ') || 'N/A'}
`).join('\n');

    const optionsText = (quote_options || []).map(opt => `
OPTION ${opt.label} — "${opt.name}" ${opt.is_recommended ? '(RECOMMENDED)' : ''}
Items:
${opt.items.map(item => `  - ${item.description} (${item.category}) — ${item.quantity}x $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`).join('\n')}
Subtotal: $${opt.subtotal.toFixed(2)}
`).join('\n');

    const upgradesText = (upgrades || []).length > 0
      ? `AVAILABLE UPGRADES:\n${upgrades.map(u => `- ${u.name}: $${u.price.toFixed(2)} — ${u.benefits.join(', ')}`).join('\n')}`
      : '';

    const prompt = `You are writing a customer-facing summary for an HVAC service call for ${customer_name || 'the customer'}.
The technician has completed their inspection and created repair options. Your job is to translate the technical findings into clear, plain English that helps the customer understand:
1. What was found wrong with their system
2. Why it failed or is failing
3. Why it's important to fix now (consequences of waiting)
4. A clear breakdown of each repair option so they can compare and choose

TECHNICIAN NOTES:
${tech_notes || 'No additional notes'}

EQUIPMENT INSPECTED:
${unitsText || 'No equipment details'}

REPAIR OPTIONS:
${optionsText || 'No options provided'}

${upgradesText}

Return JSON in this exact format:
{
  "findings_summary": "2-4 sentences explaining what was found wrong in plain English. No jargon. Be specific about the problem — name the failing part and what it does. Write as if speaking directly to the homeowner.",
  "urgency_explanation": "2-3 sentences about why this needs attention now. Mention real consequences like higher energy bills, system damage, safety risks, or comfort issues. Be honest, not fear-mongering.",
  "options_breakdown": [
    {
      "label": "A",
      "name": "Option name",
      "summary": "1-2 sentences describing what this option includes and who it's best for. If it includes upgrades, explain the added value naturally.",
      "includes_upgrades": ["Air Scrubber", "..."],
      "total": 450.00,
      "value_note": "Brief note about value — e.g., 'Most affordable fix' or 'Best long-term value with added protection'"
    }
  ],
  "recommendation": "1-2 sentences with your professional recommendation. Reference the recommended option by name. Explain WHY it's the best choice for this situation."
}

RULES:
- Write at a 7th grade reading level — no HVAC jargon
- Be warm and professional, not salesy or pushy
- Be honest about what's needed vs. what's optional
- When an option includes an upgrade (like Air Scrubber, UV Light, etc.), explain the benefit naturally within the option summary
- Make price differences between options clear
- The recommendation should feel like advice from a trusted professional, not a sales pitch`;

    const response = await openai.responses.create({
      model,
      instructions: 'Generate a customer-facing HVAC service summary. Return only valid JSON.',
      input: [{ role: 'user', content: prompt }],
      max_output_tokens: 2000,
    });

    const resp = response as unknown as Record<string, unknown>;
    const aiText = extractAIText(resp);
    const usage = extractUsage(resp);
    const aiCost = calculateCost(model, usage.input_tokens, usage.output_tokens);

    const parsed = parseAIJson<AISummaryResponse>(aiText);
    parsed.ai_cost = aiCost;

    return NextResponse.json({ ok: true, summary: parsed });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[ai-summary] Error:', errMsg);
    return NextResponse.json(
      { error: 'Summary generation failed', detail: errMsg },
      { status: 500 }
    );
  }
}
