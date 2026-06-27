import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { ContentPlan, MarketingCampaign, BRAND_RULES, Platform, ContentType } from './types';

export async function generateContentPlan(
  campaigns: MarketingCampaign[],
  weekStart: string
): Promise<ContentPlan> {
  const campaignSummary = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    type: c.campaign_type,
    platforms: c.target_platforms,
    services: c.target_services,
    audience: c.target_audience,
  }));

  const prompt = `You are the Content Planner AI for ${BRAND_RULES.company_name}.

CAMPAIGNS FOR THIS WEEK (starting ${weekStart}):
${JSON.stringify(campaignSummary, null, 2)}

Create a content calendar for Mon-Sat (days 1-6). For each campaign, schedule 1-2 content pieces per day across the target platforms.

Rules:
- Facebook: best times are 9:00, 12:00, 17:00
- Instagram: best times are 11:00, 14:00, 19:00
- Google Ads: run continuously, schedule for 08:00
- Max 3 posts per day total across all campaigns
- Mix content types: post, ad, story (Instagram only), email (max 1/week)
- Each piece needs a slot_label like "morning_post", "afternoon_ad", "evening_story"

Respond ONLY with valid JSON:
{
  "entries": [
    {
      "campaign_id": "uuid-from-above",
      "day_of_week": 1,
      "platform": "facebook|instagram|google_ads|email",
      "content_type": "post|ad|story|reel_script|email|blog",
      "slot_label": "string",
      "scheduled_time": "HH:MM",
      "notes": "brief description of what this content should be about"
    }
  ]
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a social media content planner. You MUST respond with valid JSON. Do not reason silently — always produce a text response.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 3000,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  const text = response.output_text || '{"entries":[]}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const salvaged = cleaned.replace(/[^}]*$/, '') + '}';
    try { parsed = JSON.parse(salvaged); } catch { parsed = { entries: [] }; }
  }

  return {
    entries: ((parsed.entries as Record<string, unknown>[]) || []).map((e: Record<string, unknown>) => ({
      campaign_id: e.campaign_id as string,
      day_of_week: Number(e.day_of_week),
      platform: e.platform as Platform,
      content_type: e.content_type as ContentType,
      slot_label: e.slot_label as string,
      scheduled_time: e.scheduled_time as string,
      notes: e.notes as string,
    })),
    cost,
  };
}
