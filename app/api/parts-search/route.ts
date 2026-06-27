import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateCost } from '@/lib/ai-costs';
import { buildFallbackLinks, type SearchResult } from '@/lib/supplier-search';
import crypto from 'crypto';

export const maxDuration = 60;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { query, suppliers } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query is required (min 2 characters)' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const normalizedQuery = query.trim().toLowerCase();
    const queryHash = crypto.createHash('md5').update(normalizedQuery).digest('hex');
    const supabase = createServiceClient();

    // Check cache first
    const { data: cached } = await supabase
      .from('parts_search_cache')
      .select('results, result_count')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      let results = cached.results as SearchResult[];
      if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
        results = results.filter(r => suppliers.includes(r.supplier_key));
      }
      return NextResponse.json({
        results,
        total: cached.result_count,
        cached: true,
        fallback_links: buildFallbackLinks(query.trim()),
      });
    }

    // Use OpenAI with web_search_preview tool — the AI searches the web itself
    const prompt = `Search for the HVAC part "${query.trim()}" across multiple suppliers and return structured product listings.

Search these supplier websites for this part:
1. Johnstone Supply (johnstonesupply.com)
2. United Refrigeration (uri.com)
3. Carrier Enterprise (carrierenterprise.com)
4. Amazon (amazon.com)
5. SupplyHouse (supplyhouse.com)
6. RepairClinic (repairclinic.com)
7. Google Shopping

For each product found, return a JSON object with:
- name: Product/part name
- part_number: Part number or SKU (null if not found)
- price: Numeric price in USD (null if not found)
- price_text: Original price text like "$45.99" (null if not found)
- supplier: Full supplier name
- supplier_key: One of: johnstone, uri, carrier, lennox, trane, gemaire, amazon, supplyhouse, repairclinic, google
- url: Direct product URL
- in_stock: true/false/null
- relevance: 1-10 score (10 = exact match)

Return ONLY a JSON array. No markdown, no explanation. Example: [{"name":"...","part_number":"...","price":45.99,...}]
If nothing found, return: []`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
        max_output_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', errText);
      return NextResponse.json({
        results: [],
        total: 0,
        error: `Search failed (${response.status}): ${errText.substring(0, 200)}`,
        fallback_links: buildFallbackLinks(query.trim()),
      });
    }

    const aiData = await response.json();
    const usage = aiData.usage || {};

    // Extract text content from the responses API format
    let content = '';
    if (aiData.output && Array.isArray(aiData.output)) {
      for (const block of aiData.output) {
        if (block.type === 'message' && block.content) {
          for (const part of block.content) {
            if (part.type === 'output_text') {
              content += part.text;
            }
          }
        }
      }
    }
    content = content.trim();

    let results: SearchResult[] = [];

    if (content) {
      try {
        // Strip markdown fences if present
        const jsonStr = content.replace(/^```json?\s*/, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          results = parsed.map((r: Record<string, unknown>) => ({
            name: String(r.name || ''),
            part_number: r.part_number ? String(r.part_number) : null,
            price: typeof r.price === 'number' ? r.price : null,
            price_text: r.price_text ? String(r.price_text) : null,
            supplier: String(r.supplier || 'Unknown'),
            supplier_key: String(r.supplier_key || 'google'),
            url: String(r.url || ''),
            in_stock: typeof r.in_stock === 'boolean' ? r.in_stock : null,
            relevance: typeof r.relevance === 'number' ? r.relevance : 5,
          })).filter((r: SearchResult) => r.name.length > 0);
        }
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr, 'Content:', content.substring(0, 500));
      }
    }

    // Deduplicate by part_number + supplier_key
    const seen = new Set<string>();
    results = results.filter(r => {
      const key = `${(r.part_number || r.name).toLowerCase()}-${r.supplier_key}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by relevance descending
    results.sort((a, b) => b.relevance - a.relevance);

    // Cache results
    supabase.from('parts_search_cache').upsert({
      query_hash: queryHash,
      query_text: normalizedQuery,
      results: results,
      result_count: results.length,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as Record<string, unknown>, { onConflict: 'query_hash' }).then(() => {});

    // Log AI cost
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cost = calculateCost('gpt-5-mini', inputTokens, outputTokens);
    supabase.from('agent_logs').insert({
      agent: 'parts_search',
      action: 'supplier_search',
      details: {
        model: 'gpt-5-mini',
        query: query.trim(),
        result_count: results.length,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
      },
    } as Record<string, unknown>).then(() => {});

    // Filter by selected suppliers if specified
    let filteredResults = results;
    if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
      filteredResults = results.filter(r => suppliers.includes(r.supplier_key));
    }

    return NextResponse.json({
      results: filteredResults,
      total: results.length,
      cached: false,
      cost,
      fallback_links: buildFallbackLinks(query.trim()),
    });
  } catch (error) {
    console.error('Parts search error:', error);
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
