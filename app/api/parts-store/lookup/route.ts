import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateCost } from '@/lib/ai-costs';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface LookupPart {
  name: string;
  part_number: string;
  category: string;
  estimated_cost: number | null;
  supplier_suggestions: string[];
  description: string;
  manufacturer: string;
}

interface LookupResult {
  unit_info: {
    manufacturer: string;
    model_number: string;
    serial_number?: string;
    unit_type: string;
    tonnage?: string;
    btu_cooling?: string;
    btu_heating?: string;
    seer?: string;
    eer?: string;
    hspf?: string;
    refrigerant?: string;
    voltage?: string;
    rla?: string;
    lra?: string;
    fla_outdoor_fan?: string;
    fla_indoor_blower?: string;
    mca?: string;
    mocp?: string;
    year?: string;
    compressor_type?: string;
    metering_device?: string;
    weight?: string;
  };
  common_parts: LookupPart[];
  search_links: { label: string; url: string }[];
}

// Fetch Google search snippets for real spec data
async function webSearch(query: string): Promise<string> {
  try {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    // Use Google Custom Search if available, otherwise scrape search results
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return '';

    const html = await res.text();

    // Extract text content from search result snippets
    // Remove HTML tags but keep text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    // Return first ~4000 chars of search content
    return textContent.slice(0, 4000);
  } catch (err) {
    console.error('Web search error:', err);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { brand, model_number, serial_number } = await request.json();

    if (!model_number) {
      return NextResponse.json({ error: 'Model number is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const brandStr = brand || '';

    // Run multiple web searches in parallel for real data
    const [specsResults, serialResults, electricalResults] = await Promise.all([
      webSearch(`${brandStr} ${model_number} specifications tonnage BTU SEER refrigerant`),
      webSearch(`${brandStr} serial number ${serial_number || model_number} age date manufactured decode`),
      webSearch(`${brandStr} ${model_number} electrical data amps voltage MCA MOCP RLA LRA`),
    ]);

    const webData = [
      specsResults ? `=== WEB SEARCH: Specs ===\n${specsResults}` : '',
      serialResults ? `=== WEB SEARCH: Serial/Age ===\n${serialResults}` : '',
      electricalResults ? `=== WEB SEARCH: Electrical ===\n${electricalResults}` : '',
    ].filter(Boolean).join('\n\n');

    const prompt = `You are an expert HVAC technician and parts specialist. Given the following equipment information AND web search results, identify the unit with precise specifications and list common replacement parts.

${brand ? `Brand/Manufacturer: ${brand}` : 'Brand: Unknown — identify from model number'}
Model Number: ${model_number}
${serial_number ? `Serial Number: ${serial_number}` : ''}

${brand ? `IMPORTANT: The user confirmed this is a ${brand} unit. Use "${brand}" as manufacturer.` : ''}

${webData ? `\nREAL WEB SEARCH DATA (use this for accurate specs — prioritize this over your training data):\n${webData}` : ''}

SERIAL NUMBER AGE DECODING INSTRUCTIONS:
For each major HVAC manufacturer, the serial number encodes the manufacture date differently:
- Carrier/Bryant/Payne: Weekly format — first 2 digits = week (01-52), next 2 digits = year (e.g., 2519 = week 25 of 2019)
- Trane/American Standard: Year letter code (eg. W=2008, X=2009, Y=2010, B=2012, C=2013... K=2019, L=2020, M=2021, N=2022)
- Lennox: First 2 digits = year, next 2 = week (5821 = 2058? No — check 4-digit year style or letter code)
- Goodman/Amana: First 2 digits = year (e.g., 19 = 2019, 20 = 2020)
- Rheem/Ruud: First 4 digits = month+year or week+year depending on era
- York/Coleman: Letters encode year (eg. W=1997... B=2002...)
- Daikin: First 2 digits = year
- Mitsubishi: Various formats depending on product line
Use the serial number AND the web search results to determine the most accurate manufacture date.

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "unit_info": {
    "manufacturer": "Brand name",
    "model_number": "${model_number}",
    ${serial_number ? `"serial_number": "${serial_number}",` : ''}
    "unit_type": "e.g. Split System AC, Heat Pump, Furnace, Package Unit, Mini Split, Condenser",
    "tonnage": "e.g. 3 Ton",
    "btu_cooling": "e.g. 36,000 BTU",
    "btu_heating": "e.g. 34,000 BTU (null if AC only)",
    "seer": "e.g. 14 SEER or 14 SEER2",
    "eer": "e.g. 12.2 EER (null if unknown)",
    "hspf": "e.g. 8.2 HSPF (null if not a heat pump)",
    "refrigerant": "e.g. R-410A",
    "voltage": "e.g. 208-230V/1Ph/60Hz",
    "rla": "e.g. 15.4A (Rated Load Amps of compressor)",
    "lra": "e.g. 96A (Locked Rotor Amps of compressor)",
    "fla_outdoor_fan": "e.g. 1.4A (outdoor fan motor Full Load Amps)",
    "fla_indoor_blower": "e.g. 5.0A (indoor blower FLA, null if outdoor-only unit)",
    "mca": "e.g. 22.3A (Minimum Circuit Ampacity)",
    "mocp": "e.g. 30A (Maximum Overcurrent Protection / breaker size)",
    "year": "e.g. 2019 or 2018-2019 (be specific based on serial decode)",
    "compressor_type": "e.g. Scroll, Reciprocating, Rotary, Inverter",
    "metering_device": "e.g. TXV, Fixed Orifice/Piston",
    "weight": "e.g. 185 lbs (null if unknown)"
  },
  "common_parts": [
    {
      "name": "Part name",
      "part_number": "OEM or universal part number",
      "category": "Capacitors|Contactors|Motors|Relays|Sensors|Valves|Compressors|Coils|Filters|Thermostats|Electrical|Refrigerants|Ignition|Transformers|Misc",
      "estimated_cost": 25.00,
      "supplier_suggestions": ["Johnstone Supply", "United Refrigeration", "Amazon"],
      "description": "Brief description",
      "manufacturer": "Part manufacturer"
    }
  ]
}

Include 10-15 commonly replaced parts for THIS SPECIFIC unit. For estimated_cost, use typical HVAC supply house cost. Use null for any field you truly cannot determine.
Return ONLY the JSON, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', errText);
      return NextResponse.json({ error: 'AI lookup failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const usage = aiData.usage || {};
    const content = aiData.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Log AI usage
    const cost = calculateCost('gpt-5.4', usage.prompt_tokens || 0, usage.completion_tokens || 0);
    const supabase = createServiceClient();
    supabase.from('agent_logs').insert({
      agent: 'parts_lookup',
      action: 'lookup',
      details: {
        model: 'gpt-5.4',
        brand: brand || null,
        model_number,
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        cost,
      },
    } as Record<string, unknown>).then(() => {});

    // Parse the JSON response (strip markdown code fences if present)
    const jsonStr = content.replace(/^```json?\s*/, '').replace(/```\s*$/, '');
    const result: LookupResult = JSON.parse(jsonStr);

    // Build search links for the user
    const manufacturer = result.unit_info?.manufacturer || brand || '';
    const encodedModel = encodeURIComponent(model_number);
    const encodedBrand = encodeURIComponent(manufacturer);
    result.search_links = [
      { label: `${manufacturer} Parts Lookup`, url: `https://www.google.com/search?q=${encodedBrand}+${encodedModel}+parts+list` },
      { label: 'AHRI Directory', url: `https://www.ahridirectory.org/Search/SearchHome?ReturnUrl=%2f&Ession=False` },
      { label: 'Johnstone Supply', url: `https://www.johnstonesupply.com/search#q=${encodedBrand}+${encodedModel}` },
      { label: 'United Refrigeration', url: `https://www.uri.com/search?q=${encodedBrand}+${encodedModel}` },
      { label: 'Amazon HVAC Parts', url: `https://www.amazon.com/s?k=${encodedBrand}+${encodedModel}+parts` },
      { label: 'RepairClinic', url: `https://www.repairclinic.com/Shop-For-Parts?q=${encodedBrand}+${encodedModel}` },
    ];

    return NextResponse.json(result);
  } catch (error) {
    console.error('Parts lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed. Please try again.' }, { status: 500 });
  }
}
