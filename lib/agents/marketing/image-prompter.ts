import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { ImagePromptResult, MarketingContent, BRAND_RULES } from './types';

// Exact brand identity pulled from hardenhvacr.com
const BRAND_IDENTITY = {
  companyName: 'Harden HVAC & Refrigeration',
  tagline: "Tallahassee & Quincy's Trusted HVAC & Refrigeration Experts",
  subheading: 'Licensed, insured, and ready to serve. Fast response, honest pricing, and guaranteed work — every time.',
  badge: 'Veteran Owned Business',
  phone: '(910) 546-6485',
  website: 'hardenhvacr.com',
  serviceArea: 'Tallahassee, Quincy, FL & Surrounding Areas',
  hours: 'Mon–Fri 7AM–6PM | Sat 8AM–2PM',
  trustBadges: ['Licensed & Insured', 'Quick Service', '5-Star Rated', '10+ Years Experience', 'Veteran Owned'],
  colors: {
    navy: '#0a1f3f',
    navyLight: '#122e5c',
    accent: '#42a5f5',
    gold: '#f5a623',
    ember: '#e55b2b',
    ice: '#dceaf8',
    white: '#ffffff',
  },
  logo: {
    description: '"HARDEN" in large blue-to-orange gradient text with "HVAC & Refrigeration" in a navy banner below. Modern dynamic design with a swoosh accent.',
  },
  fonts: {
    display: 'Bebas Neue — bold, uppercase, wide-tracked',
    body: 'Bricolage Grotesque — clean, modern sans-serif',
  },
};

export async function generateImagePrompt(
  content: MarketingContent
): Promise<ImagePromptResult> {
  const brief = content.creative_brief as Record<string, unknown>;

  const platformSpecs: Record<string, string> = {
    facebook: `Landscape 16:9 flyer. Left 45% is a deep navy (#0a1f3f) panel with the headline, CTA button, phone number, and logo. Right 55% is the hero image. Diagonal or curved divider between sections with a gold (#f5a623) accent line.`,
    instagram: content.content_type === 'story'
      ? `Vertical 9:16 flyer. Top 25% is navy (#0a1f3f) with the logo. Middle is the hero image. Bottom 30% is navy with headline, CTA, and phone number.`
      : `Square 1:1 flyer. Top band is navy (#0a1f3f) with the logo. Center is the hero image. Bottom band is navy with headline, CTA, phone number, and website.`,
    google_ads: `Landscape banner flyer. Left side is a navy (#0a1f3f) panel with headline, CTA, and phone. Right side is the HVAC service scene. Sharp diagonal cut with gold accent.`,
    email: `Wide landscape email banner. Left 40% is navy (#0a1f3f) with headline, CTA, and logo. Right 60% is the hero image with a gradient transition.`,
  };

  const prompt = `You are a graphic designer creating a DALL-E prompt for a COMPLETE, FINISHED advertising flyer.

THIS IS FOR: ${BRAND_IDENTITY.companyName}
WEBSITE: ${BRAND_IDENTITY.website}
PHONE: ${BRAND_IDENTITY.phone}

AD CONTENT:
- Platform: ${content.platform}
- Type: ${content.content_type}
- Headline: "${content.headline || ''}"
- CTA: "${content.cta || ''}"

CREATIVE DIRECTION:
- Visual Concept: ${brief.visual_concept || 'Professional HVAC service'}
- Mood: ${brief.mood || 'Professional, trustworthy'}
- Key Elements: ${Array.isArray(brief.key_elements) ? (brief.key_elements as string[]).join(', ') : 'HVAC equipment, technician, comfortable home'}

PLATFORM LAYOUT:
${platformSpecs[content.platform] || platformSpecs.facebook}

=== EXACT BRAND IDENTITY (MUST FOLLOW PRECISELY) ===

LOGO: ${BRAND_IDENTITY.logo.description}
- "HARDEN" appears in a gradient from blue to orange
- "HVAC & Refrigeration" appears in a navy banner underneath
- Place the logo prominently in the navy section of the flyer

COLORS (USE THESE EXACT HEX VALUES):
- Navy (main background panels): ${BRAND_IDENTITY.colors.navy}
- Gold (accent lines, CTA buttons, dividers): ${BRAND_IDENTITY.colors.gold}
- Light Blue (subtle glow effects, highlights): ${BRAND_IDENTITY.colors.accent}
- Ember/Orange-Red (secondary accent): ${BRAND_IDENTITY.colors.ember}
- Ice Blue (light backgrounds): ${BRAND_IDENTITY.colors.ice}
- White: text on navy backgrounds

TYPOGRAPHY STYLE:
- Headlines: ${BRAND_IDENTITY.fonts.display} — all caps, wide letter spacing, bold
- Body/CTA: ${BRAND_IDENTITY.fonts.body} — clean, modern

TEXT TO RENDER IN THE IMAGE:
1. HEADLINE (large, prominent, white on navy): "${content.headline || ''}"
2. CTA (gold button with dark text): "${content.cta || ''}"
3. PHONE NUMBER: ${BRAND_IDENTITY.phone}
4. WEBSITE: ${BRAND_IDENTITY.website}
5. BADGE (small, in corner or near logo): "Veteran Owned"

=== WHAT THE FLYER MUST LOOK LIKE ===

- A COMPLETE, PROFESSIONAL AD FLYER — not a stock photo
- Split layout: navy branded panel + HVAC service imagery
- The navy panel has the logo, headline text, CTA button, phone number, and website
- Geometric design elements: diagonal cuts, gold accent lines, subtle patterns
- The imagery section shows real HVAC scenes: technicians, modern equipment, happy homeowners, comfortable North Florida homes
- Warm, inviting photography style — golden hour, lush Florida greenery
- Everything looks premium, clean, and professional
- The overall design should match the quality of a national HVAC brand campaign

Write one detailed DALL-E prompt (200-300 words) for this COMPLETE AD FLYER.

Respond ONLY with valid JSON:
{
  "prompt": "the full DALL-E prompt with all text, colors, and layout instructions",
  "style_notes": "brief layout notes"
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: 'You create DALL-E prompts for complete, finished ad flyers with exact brand colors, logo descriptions, and text rendered in the image. Respond only with valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
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
    prompt: (parsed.prompt as string) || '',
    style_notes: (parsed.style_notes as string) || '',
    cost,
  };
}
