import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { ValidationResult, MarketingContent, BRAND_RULES } from './types';

export async function validateContent(
  content: MarketingContent
): Promise<ValidationResult> {
  const charLimit = BRAND_RULES.platform_limits[content.platform]?.[content.content_type] || 500;

  const prompt = `You are the Brand Compliance Validator for ${BRAND_RULES.company_name}.

Review this marketing content for compliance with brand rules and platform requirements.

CONTENT:
- Platform: ${content.platform}
- Type: ${content.content_type}
- Headline: ${content.headline || 'MISSING'}
- Body Copy: ${content.body_copy || 'MISSING'}
- CTA: ${content.cta || 'MISSING'}
- Hashtags: ${content.hashtags?.join(', ') || 'None'}
- Image Prompt: ${content.image_prompt || 'None'}

CHARACTER LIMIT for ${content.platform} ${content.content_type}: ${charLimit}
Actual body length: ${(content.body_copy || '').length} characters

BRAND RULES TO CHECK:
1. Company name must be "Harden HVAC & Refrigeration" (no wrong abbreviations)
2. Service area is Tallahassee and Quincy, FL only — no other locations mentioned
3. No fabricated credentials, testimonials, prices, or warranties
4. No emergency/same-day promises unless explicitly noted
5. Professional tone — no slang, no ALL CAPS sentences, no excessive exclamation marks
6. Body copy within platform character limit
7. CTA must be clear and actionable
8. Hashtags relevant and not excessive (max 10 for Instagram, max 3 for Facebook)

Respond ONLY with valid JSON:
{
  "passed": true/false,
  "issues": ["list of issues found, empty if passed"],
  "suggestions": ["list of improvement suggestions"]
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You are a brand compliance validator. Be strict. Respond only with valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 1000,
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
    passed: (parsed.passed as boolean) ?? false,
    issues: (parsed.issues as string[]) || [],
    suggestions: (parsed.suggestions as string[]) || [],
    cost,
  };
}
