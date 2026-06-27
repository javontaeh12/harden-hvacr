import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { CreativeBrief, MarketingContent, MarketingCampaign, BRAND_RULES } from './types';

export async function generateCreativeBrief(
  content: MarketingContent,
  campaign: MarketingCampaign
): Promise<CreativeBrief> {
  const prompt = `You are the Creative Director AI for ${BRAND_RULES.company_name}.

CONTENT TO VISUALIZE:
- Platform: ${content.platform}
- Type: ${content.content_type}
- Headline: ${content.headline || 'TBD'}
- Body: ${content.body_copy || 'TBD'}
- CTA: ${content.cta || 'TBD'}
- Campaign: ${campaign.name} (${campaign.campaign_type})
- Target Services: ${campaign.target_services.join(', ')}

BRAND GUIDELINES:
- Primary color: ${BRAND_RULES.colors.primary} (blue)
- Secondary color: ${BRAND_RULES.colors.secondary} (red)
- Tone: ${BRAND_RULES.tone}
- Service area: ${BRAND_RULES.service_area}

Create a creative brief for the visual assets. Consider platform best practices:
- Facebook: 1200x628 for posts, 1080x1080 for feed ads
- Instagram: 1080x1080 for posts, 1080x1920 for stories
- Google Ads: various banner sizes

Respond ONLY with valid JSON:
{
  "visual_concept": "description of the visual concept",
  "layout": "description of layout and composition",
  "color_palette": ["hex colors to use"],
  "mood": "the overall mood/feeling",
  "key_elements": ["list of visual elements to include"]
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a creative director for HVAC marketing. Respond only with valid JSON.',
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
    // Try to salvage truncated JSON
    const salvaged = cleaned.replace(/[^}]*$/, '') + '}';
    try { parsed = JSON.parse(salvaged); } catch { parsed = {}; }
  }

  return {
    content_id: content.id,
    visual_concept: (parsed.visual_concept as string) || '',
    layout: (parsed.layout as string) || '',
    color_palette: (parsed.color_palette as string[]) || [BRAND_RULES.colors.primary, BRAND_RULES.colors.secondary],
    mood: (parsed.mood as string) || '',
    key_elements: (parsed.key_elements as string[]) || [],
    cost,
  };
}
