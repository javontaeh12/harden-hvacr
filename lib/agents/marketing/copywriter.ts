import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { CopyResult, MarketingContent, MarketingCampaign, BRAND_RULES } from './types';

export async function generateCopy(
  content: MarketingContent,
  campaign: MarketingCampaign
): Promise<CopyResult> {
  const charLimit = BRAND_RULES.platform_limits[content.platform]?.[content.content_type] || 500;

  const prompt = `You are the Copywriter AI for ${BRAND_RULES.company_name}, serving ${BRAND_RULES.service_area}.

CAMPAIGN: ${campaign.name}
Type: ${campaign.campaign_type}
Target Services: ${campaign.target_services.join(', ')}
Target Audience: ${campaign.target_audience || 'Local homeowners and businesses'}

CONTENT BRIEF:
- Platform: ${content.platform}
- Content Type: ${content.content_type}
- Character Limit: ${charLimit} characters for body
- Scheduled: ${content.scheduled_date} at ${content.scheduled_time}

BRAND RULES:
- Company name: ${BRAND_RULES.company_name}
- Tone: ${BRAND_RULES.tone}
${BRAND_RULES.never.map(r => `- ${r}`).join('\n')}

Write compelling copy for this ${content.content_type} on ${content.platform}.

Respond ONLY with valid JSON:
{
  "headline": "short attention-grabbing headline",
  "body_copy": "main copy text within character limit",
  "cta": "clear call to action",
  "hashtags": ["relevant", "hashtags", "for", "platform"]
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a marketing copywriter for a local HVAC company. Respond only with valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 1500,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  const text = response.output_text || '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const salvaged = cleaned.replace(/[^}]*$/, '') + '}';
    try { parsed = JSON.parse(salvaged); } catch { parsed = {}; }
  }

  return {
    content_id: content.id,
    headline: (parsed.headline as string) || '',
    body_copy: (parsed.body_copy as string) || '',
    cta: (parsed.cta as string) || '',
    hashtags: (parsed.hashtags as string[]) || [],
    cost,
  };
}

export async function generateVariant(
  content: MarketingContent,
  campaign: MarketingCampaign,
  variantLabel: string
): Promise<CopyResult> {
  const prompt = `You are the Copywriter AI for ${BRAND_RULES.company_name}.

Create an A/B variant (${variantLabel}) of this existing copy. Make it notably different in tone/angle while keeping the same core message.

ORIGINAL:
- Headline: ${content.headline}
- Body: ${content.body_copy}
- CTA: ${content.cta}
- Platform: ${content.platform}
- Campaign: ${campaign.name} (${campaign.campaign_type})

BRAND RULES:
- Company name: ${BRAND_RULES.company_name}
- Tone: ${BRAND_RULES.tone}
- Service area: ${BRAND_RULES.service_area}
${BRAND_RULES.never.map(r => `- ${r}`).join('\n')}

For variant ${variantLabel}, try a different angle:
- If original is benefit-focused, try urgency or social proof
- If original is formal, try conversational
- Keep platform character limits

Respond ONLY with valid JSON:
{
  "headline": "string",
  "body_copy": "string",
  "cta": "string",
  "hashtags": ["string"]
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a marketing copywriter creating A/B test variants. Respond only with valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 1500,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

  const text = response.output_text || '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const salvaged = cleaned.replace(/[^}]*$/, '') + '}';
    try { parsed = JSON.parse(salvaged); } catch { parsed = {}; }
  }

  return {
    content_id: content.id,
    headline: (parsed.headline as string) || '',
    body_copy: (parsed.body_copy as string) || '',
    cta: (parsed.cta as string) || '',
    hashtags: (parsed.hashtags as string[]) || [],
    cost,
  };
}
