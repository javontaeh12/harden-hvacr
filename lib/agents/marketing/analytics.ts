import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { AnalyticsResult, MarketingCampaign, MarketingContent } from './types';

export async function analyzeCampaignPerformance(
  campaign: MarketingCampaign,
  contentItems: MarketingContent[]
): Promise<AnalyticsResult> {
  const contentSummary = contentItems.map(c => ({
    platform: c.platform,
    type: c.content_type,
    status: c.status,
    headline: c.headline,
    variant: c.variant_label,
    rejected: c.rejection_reason,
  }));

  const prompt = `You are the Marketing Analytics AI for Harden HVAC & Refrigeration.

Analyze this campaign and provide optimization recommendations.

CAMPAIGN:
- Name: ${campaign.name}
- Type: ${campaign.campaign_type}
- Status: ${campaign.status}
- Platforms: ${campaign.target_platforms.join(', ')}
- Budget: $${campaign.budget || 0}
- AI Cost: $${campaign.ai_cost.toFixed(4)}

CONTENT ITEMS (${contentItems.length} total):
${JSON.stringify(contentSummary, null, 2)}

CONTENT STATS:
- Total: ${contentItems.length}
- Approved: ${contentItems.filter(c => c.status === 'approved').length}
- Rejected: ${contentItems.filter(c => c.status === 'rejected').length}
- Pending: ${contentItems.filter(c => c.status === 'pending_review').length}

Provide:
1. A brief performance summary
2. 3-5 specific recommendations for improvement
3. A quality score (0-100) based on content approval rate and diversity

Respond ONLY with valid JSON:
{
  "summary": "brief performance analysis",
  "recommendations": ["actionable recommendation 1", "..."],
  "score": 0
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a marketing analytics specialist. Respond only with valid JSON.',
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
    campaign_id: campaign.id,
    summary: (parsed.summary as string) || '',
    recommendations: (parsed.recommendations as string[]) || [],
    score: (parsed.score as number) || 0,
    cost,
  };
}
