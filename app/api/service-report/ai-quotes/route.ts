import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseAIJson, extractAIText, extractUsage, calculateCost } from '@/lib/csr/utils';

interface QuoteGenerationRequest {
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
  upgrades: Array<{
    name: string;
    price: number;
    benefits: string[];
  }>;
  ai_summary: {
    findings_summary: string;
    urgency_explanation: string;
    recommendation: string;
  };
}

export interface AIQuoteOption {
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
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteGenerationRequest = await request.json();
    const { units, tech_notes, upgrades, ai_summary } = body;

    if (!units?.length && !tech_notes && !ai_summary) {
      return NextResponse.json(
        { error: 'At least one of units, tech_notes, or ai_summary is required' },
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

    const upgradesText = (upgrades || []).length > 0
      ? `AVAILABLE UPGRADES (include these in Option C at the listed prices):\n${upgrades.map(u => `- ${u.name}: $${u.price.toFixed(2)} — ${u.benefits.join(', ')}`).join('\n')}`
      : '';

    const summaryText = ai_summary
      ? `AI SUMMARY:\n- Findings: ${ai_summary.findings_summary}\n- Urgency: ${ai_summary.urgency_explanation}\n- Recommendation: ${ai_summary.recommendation}`
      : '';

    const prompt = `You are an HVAC service pricing expert. Based on the technician's inspection data and AI summary, generate 3 tiered quote options for the customer.

TECHNICIAN NOTES:
${tech_notes || 'No additional notes'}

EQUIPMENT INSPECTED:
${unitsText || 'No equipment details'}

${summaryText}

${upgradesText}

Generate 3 quote options as JSON. Each option must have realistic line items with appropriate pricing for residential HVAC service.

PRICING GUIDELINES:
- Labor: $85-150/hr depending on complexity
- Diagnostic/service call fees: $79-129
- Common parts (capacitors, contactors, relays): $15-85 for parts, markup to $45-185 installed
- Motors (blower, condenser fan): $150-450 for parts, markup to $350-750 installed
- Compressors: $400-1200 for parts, markup to $1200-2500 installed
- Refrigerant (R-410A): $35-75/lb
- Refrigerant (R-22): $75-150/lb
- Filters, belts, misc supplies: $10-50
- Coil cleaning: $150-350
- Drain line service: $75-175

THE 3 OPTIONS:
- Option A "Essential Repair": Addresses ONLY the primary problem found. Minimum work to resolve the customer's immediate concern. This is the cheapest option. Include only the necessary parts and labor for the main issue.
- Option B "Recommended Service": Main issue PLUS the most important secondary problems. This is the recommended option and best value. Include parts, labor, and any preventive items that make sense.
- Option C "Complete Solution": Everything — all issues, all secondary problems, plus any selected upgrades from the AVAILABLE UPGRADES list. Use the EXACT prices listed for upgrades. Most comprehensive and premium option.

Return ONLY valid JSON in this exact format:
[
  {
    "label": "A",
    "name": "Essential Repair",
    "items": [
      {
        "description": "Clear description of the work or part",
        "category": "service|part|upgrade",
        "quantity": 1,
        "unit_price": 125.00,
        "total": 125.00
      }
    ],
    "subtotal": 125.00,
    "is_recommended": false
  },
  {
    "label": "B",
    "name": "Recommended Service",
    "items": [...],
    "subtotal": 450.00,
    "is_recommended": true
  },
  {
    "label": "C",
    "name": "Complete Solution",
    "items": [...],
    "subtotal": 850.00,
    "is_recommended": false
  }
]

RULES:
- Each item's total must equal quantity * unit_price
- Each option's subtotal must equal the sum of all item totals
- Option A subtotal < Option B subtotal < Option C subtotal
- Only Option B should have is_recommended: true
- Use category "upgrade" for any items from the AVAILABLE UPGRADES list, "part" for parts, "service" for labor/service work
- Be specific in descriptions — name the actual part or service, not generic placeholders
- Return ONLY the JSON array, no markdown, no explanation`;

    const response = await openai.responses.create({
      model,
      instructions: 'Generate 3 tiered HVAC quote options. Return only valid JSON.',
      input: [{ role: 'user', content: prompt }],
      max_output_tokens: 2000,
    });

    const resp = response as unknown as Record<string, unknown>;
    const aiText = extractAIText(resp);
    const usage = extractUsage(resp);
    const aiCost = calculateCost(model, usage.input_tokens, usage.output_tokens);

    const options = parseAIJson<AIQuoteOption[]>(aiText);

    return NextResponse.json({ ok: true, options, ai_cost: aiCost });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[ai-quotes] Error:', errMsg);
    return NextResponse.json(
      { error: 'Quote generation failed', detail: errMsg },
      { status: 500 }
    );
  }
}
