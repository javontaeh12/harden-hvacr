import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { StrategyResult, PipelineContext, BRAND_RULES } from './types';

export async function generateWeeklyStrategy(context: PipelineContext): Promise<StrategyResult> {
  const prompt = `You are the Marketing Strategist AI for ${BRAND_RULES.company_name}, a professional HVAC and refrigeration company serving ${BRAND_RULES.service_area}.

CONTEXT:
- Week starting: ${context.week_start}
- Season: ${context.season}
- Services in high demand: ${context.services_in_demand.join(', ') || 'General'}
- Recent weather: ${context.recent_weather || 'Normal for season'}
- Active promotions: ${context.active_promotions.join(', ') || 'None'}

BRAND RULES:
${BRAND_RULES.never.map(r => `- ${r}`).join('\n')}

Generate 2-4 marketing campaigns for this week. For each campaign provide:
1. A clear campaign name
2. Brief description of strategy and rationale
3. Campaign type (one of: seasonal, weather_reactive, promotion, awareness, retention, referral)
4. Target services (e.g., ac_repair, heating, maintenance, refrigeration, installation)
5. Target platforms (facebook, instagram, google_ads)
6. Target audience description
7. Start and end dates (within this week or extending 1-2 weeks)
8. Suggested daily budget in dollars (keep total under $50/week for a small business)

Focus on what makes sense for the season, weather, and current demand. Prioritize high-ROI platforms for a local HVAC business.

Respond ONLY with valid JSON in this exact format:
{
  "campaigns": [
    {
      "name": "string",
      "description": "string",
      "campaign_type": "seasonal|weather_reactive|promotion|awareness|retention|referral",
      "target_services": ["string"],
      "target_platforms": ["facebook"|"instagram"|"google_ads"],
      "target_audience": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "budget": 0.00
    }
  ],
  "rationale": "string explaining overall strategy"
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a marketing strategist for a local HVAC company. Respond only with valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 1500,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  const text = response.output_text || '{"campaigns":[],"rationale":"No strategy generated"}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    campaigns: parsed.campaigns || [],
    rationale: parsed.rationale || '',
    cost,
  };
}

export function getSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function getSeasonalServices(season: string): string[] {
  switch (season) {
    case 'summer': return ['ac_repair', 'ac_maintenance', 'refrigeration', 'indoor_air_quality'];
    case 'winter': return ['heating', 'furnace_repair', 'heat_pump', 'maintenance'];
    case 'spring': return ['ac_tuneup', 'maintenance', 'installation', 'indoor_air_quality'];
    case 'fall': return ['heating_tuneup', 'maintenance', 'furnace_inspection', 'heat_pump'];
    default: return ['maintenance', 'repair'];
  }
}
