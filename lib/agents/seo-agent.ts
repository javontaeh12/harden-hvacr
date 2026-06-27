import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hardenhvacr.com';
const TIMEOUT_MS = 10000;

interface SEOFinding {
  page: string;
  category: 'meta' | 'content' | 'performance' | 'social' | 'technical' | 'schema';
  severity: 'good' | 'warning' | 'error';
  issue: string;
  fix: string;
}

interface SEOAuditResult {
  findings: SEOFinding[];
  score: number;
  summary: string;
  aiCost: number;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

// Pages to audit (public-facing pages that matter for SEO)
const AUDIT_PAGES = [
  '/',
  '/pricing',
  '/membership',
  '/request',
  '/services/emergency-repair',
  '/services/tune-up',
  '/services/diagnostics',
  '/services/ac-repair',
  '/services/heating',
  '/services/commercial-refrigeration',
  '/services/new-installation',
  '/services/ductwork',
];

async function auditPage(path: string): Promise<SEOFinding[]> {
  const findings: SEOFinding[] = [];
  const url = `${SITE_URL}${path}`;

  try {
    const startTime = Date.now();
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    const loadTime = Date.now() - startTime;
    const html = await res.text();

    // --- Meta Tags ---
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch?.[1] || '';
    if (!title) {
      findings.push({ page: path, category: 'meta', severity: 'error', issue: 'Missing <title> tag', fix: 'Add a unique title tag (50-60 chars) with primary keyword' });
    } else if (title.length < 30) {
      findings.push({ page: path, category: 'meta', severity: 'warning', issue: `Title too short (${title.length} chars): "${title}"`, fix: 'Expand title to 50-60 characters with location + service keywords' });
    } else if (title.length > 65) {
      findings.push({ page: path, category: 'meta', severity: 'warning', issue: `Title too long (${title.length} chars) — may be truncated in search results`, fix: 'Shorten title to under 60 characters' });
    } else {
      findings.push({ page: path, category: 'meta', severity: 'good', issue: `Title OK (${title.length} chars)`, fix: '' });
    }

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
      || html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
    const desc = descMatch?.[1] || '';
    if (!desc) {
      findings.push({ page: path, category: 'meta', severity: 'error', issue: 'Missing meta description', fix: 'Add a meta description (150-160 chars) with service + location keywords' });
    } else if (desc.length < 100) {
      findings.push({ page: path, category: 'meta', severity: 'warning', issue: `Meta description too short (${desc.length} chars)`, fix: 'Expand to 150-160 characters with a call-to-action' });
    } else if (desc.length > 165) {
      findings.push({ page: path, category: 'meta', severity: 'warning', issue: `Meta description too long (${desc.length} chars)`, fix: 'Trim to under 160 characters to avoid truncation' });
    } else {
      findings.push({ page: path, category: 'meta', severity: 'good', issue: `Meta description OK (${desc.length} chars)`, fix: '' });
    }

    // --- Headings ---
    const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
    if (h1Matches.length === 0) {
      findings.push({ page: path, category: 'content', severity: 'error', issue: 'Missing H1 tag', fix: 'Add exactly one H1 with the primary keyword for this page' });
    } else if (h1Matches.length > 1) {
      findings.push({ page: path, category: 'content', severity: 'warning', issue: `Multiple H1 tags (${h1Matches.length})`, fix: 'Use only one H1 per page. Convert extras to H2' });
    }

    // --- Images without alt text ---
    const imgTags = html.match(/<img[^>]*>/gi) || [];
    const missingAlt = imgTags.filter(img => !img.match(/alt=["'][^"']+["']/i));
    if (missingAlt.length > 0) {
      findings.push({ page: path, category: 'content', severity: 'warning', issue: `${missingAlt.length} image(s) missing alt text`, fix: 'Add descriptive alt text to all images for accessibility and image search ranking' });
    }

    // --- Open Graph ---
    const ogTitle = html.match(/<meta\s+property=["']og:title["']/i);
    const ogDesc = html.match(/<meta\s+property=["']og:description["']/i);
    const ogImage = html.match(/<meta\s+property=["']og:image["']/i);
    if (!ogTitle || !ogDesc || !ogImage) {
      const missing = [!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image'].filter(Boolean).join(', ');
      findings.push({ page: path, category: 'social', severity: 'warning', issue: `Missing Open Graph tags: ${missing}`, fix: 'Add OG tags so Facebook/social shares show a preview with image and description' });
    } else {
      findings.push({ page: path, category: 'social', severity: 'good', issue: 'Open Graph tags present', fix: '' });
    }

    // --- Twitter Card ---
    const twitterCard = html.match(/<meta\s+(name|property)=["']twitter:card["']/i);
    if (!twitterCard) {
      findings.push({ page: path, category: 'social', severity: 'warning', issue: 'Missing Twitter/X card meta tags', fix: 'Add twitter:card, twitter:title, twitter:description for better social sharing' });
    }

    // --- Canonical URL ---
    const canonical = html.match(/<link[^>]+rel=["']canonical["']/i);
    if (!canonical) {
      findings.push({ page: path, category: 'technical', severity: 'warning', issue: 'Missing canonical URL', fix: 'Add <link rel="canonical"> to prevent duplicate content issues' });
    }

    // --- Schema / Structured Data ---
    const jsonLd = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) || [];
    if (jsonLd.length === 0) {
      findings.push({ page: path, category: 'schema', severity: 'warning', issue: 'No structured data (JSON-LD) found', fix: 'Add LocalBusiness + Service schema for rich snippets in Google results' });
    } else {
      findings.push({ page: path, category: 'schema', severity: 'good', issue: `${jsonLd.length} JSON-LD block(s) found`, fix: '' });
    }

    // --- Performance hints ---
    if (loadTime > 3000) {
      findings.push({ page: path, category: 'performance', severity: 'error', issue: `Slow page load: ${loadTime}ms`, fix: 'Optimize images, reduce JavaScript, enable caching' });
    } else if (loadTime > 1500) {
      findings.push({ page: path, category: 'performance', severity: 'warning', issue: `Page load: ${loadTime}ms (aim for under 1.5s)`, fix: 'Consider lazy loading images and deferring non-critical JS' });
    } else {
      findings.push({ page: path, category: 'performance', severity: 'good', issue: `Fast load: ${loadTime}ms`, fix: '' });
    }

    // --- Keyword presence (local SEO) ---
    const lowerHtml = html.toLowerCase();
    const localKeywords = ['tallahassee', 'quincy', 'hvac', 'air conditioning', 'heating', 'refrigeration'];
    const missing = localKeywords.filter(kw => !lowerHtml.includes(kw));
    if (missing.length > 2 && path === '/') {
      findings.push({ page: path, category: 'content', severity: 'warning', issue: `Missing local keywords: ${missing.join(', ')}`, fix: 'Include location and service keywords naturally in the page content for local SEO' });
    }

    // --- Internal links ---
    const internalLinks = (html.match(/href=["']\/((?!_next|api|favicon|icon|manifest|sw\.js)[^"']*?)["']/gi) || []);
    if (internalLinks.length < 3 && path === '/') {
      findings.push({ page: path, category: 'content', severity: 'warning', issue: `Only ${internalLinks.length} internal links on homepage`, fix: 'Add more internal links to service pages, pricing, and membership for better crawlability' });
    }

  } catch (e) {
    findings.push({ page: path, category: 'technical', severity: 'error', issue: `Could not fetch page: ${e}`, fix: 'Check if the page is accessible and returning 200 status' });
  }

  return findings;
}

async function checkRobotsTxt(): Promise<SEOFinding[]> {
  const findings: SEOFinding[] = [];
  try {
    const res = await fetchWithTimeout(`${SITE_URL}/robots.txt`, TIMEOUT_MS);
    if (res.status === 200) {
      const text = await res.text();
      if (!text.includes('Sitemap:')) {
        findings.push({ page: '/robots.txt', category: 'technical', severity: 'warning', issue: 'robots.txt missing Sitemap directive', fix: 'Add "Sitemap: https://hardenhvacr.com/sitemap.xml" to robots.txt' });
      } else {
        findings.push({ page: '/robots.txt', category: 'technical', severity: 'good', issue: 'robots.txt has Sitemap reference', fix: '' });
      }
      if (text.includes('Disallow: /')) {
        // Check it's not blocking everything
        if (text.match(/Disallow:\s*\/\s*$/m)) {
          findings.push({ page: '/robots.txt', category: 'technical', severity: 'error', issue: 'robots.txt is blocking all crawlers!', fix: 'Remove "Disallow: /" to allow Google to crawl the site' });
        }
      }
    } else {
      findings.push({ page: '/robots.txt', category: 'technical', severity: 'warning', issue: `robots.txt returned ${res.status}`, fix: 'Create a robots.txt file in the public/ directory' });
    }
  } catch {
    findings.push({ page: '/robots.txt', category: 'technical', severity: 'warning', issue: 'Could not fetch robots.txt', fix: 'Create a robots.txt file' });
  }
  return findings;
}

async function checkSitemap(): Promise<SEOFinding[]> {
  const findings: SEOFinding[] = [];
  try {
    const res = await fetchWithTimeout(`${SITE_URL}/sitemap.xml`, TIMEOUT_MS);
    if (res.status === 200) {
      const text = await res.text();
      const urlCount = (text.match(/<url>/gi) || []).length;
      if (urlCount < 5) {
        findings.push({ page: '/sitemap.xml', category: 'technical', severity: 'warning', issue: `Sitemap only has ${urlCount} URLs`, fix: 'Ensure all public pages are included in the sitemap' });
      } else {
        findings.push({ page: '/sitemap.xml', category: 'technical', severity: 'good', issue: `Sitemap has ${urlCount} URLs`, fix: '' });
      }
    } else {
      findings.push({ page: '/sitemap.xml', category: 'technical', severity: 'error', issue: 'No sitemap.xml found', fix: 'Add a sitemap.xml (Next.js can auto-generate via app/sitemap.ts)' });
    }
  } catch {
    findings.push({ page: '/sitemap.xml', category: 'technical', severity: 'error', issue: 'Could not fetch sitemap.xml', fix: 'Create app/sitemap.ts to auto-generate a sitemap' });
  }
  return findings;
}

async function checkGooglePresence(): Promise<SEOFinding[]> {
  const findings: SEOFinding[] = [];
  // Check if Google can reach key pages by verifying they return 200
  const criticalPages = ['/', '/pricing', '/membership', '/request'];
  for (const page of criticalPages) {
    try {
      const res = await fetchWithTimeout(`${SITE_URL}${page}`, TIMEOUT_MS);
      if (res.status !== 200) {
        findings.push({ page, category: 'technical', severity: 'error', issue: `Page returned ${res.status} — Google will not index this`, fix: 'Ensure the page returns 200 status' });
      }
      // Check for noindex
      const html = await res.text();
      if (html.match(/<meta[^>]+noindex/i)) {
        findings.push({ page, category: 'technical', severity: 'error', issue: 'Page has noindex meta tag — Google will NOT show this in search', fix: 'Remove noindex if this page should appear in Google' });
      }
    } catch {
      findings.push({ page, category: 'technical', severity: 'error', issue: 'Page unreachable', fix: 'Check server and DNS configuration' });
    }
  }
  return findings;
}

async function checkFacebookOG(): Promise<SEOFinding[]> {
  const findings: SEOFinding[] = [];
  try {
    const res = await fetchWithTimeout(SITE_URL, TIMEOUT_MS);
    const html = await res.text();

    // Check all OG tags that Facebook needs
    const requiredOG = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
    for (const tag of requiredOG) {
      const found = html.match(new RegExp(`<meta\\s+property=["']${tag}["']`, 'i'))
        || html.match(new RegExp(`<meta\\s+content=["'][^"']*["']\\s+property=["']${tag}["']`, 'i'));
      if (!found) {
        findings.push({ page: '/', category: 'social', severity: tag === 'og:image' ? 'error' : 'warning', issue: `Missing ${tag} — Facebook shares will look bad`, fix: `Add ${tag} meta tag for better Facebook/social sharing` });
      }
    }

    // Check OG image is absolute URL
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i)
      || html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
    if (ogImageMatch) {
      const ogUrl = ogImageMatch[1];
      if (!ogUrl.startsWith('http')) {
        findings.push({ page: '/', category: 'social', severity: 'warning', issue: `OG image is relative URL (${ogUrl})`, fix: 'Use absolute URL for og:image (e.g., https://hardenhvacr.com/og-image.png)' });
      }
    }

    // Check for Facebook domain verification
    const fbVerify = html.match(/<meta\s+name=["']facebook-domain-verification["']/i);
    if (!fbVerify) {
      findings.push({ page: '/', category: 'social', severity: 'warning', issue: 'No Facebook domain verification meta tag', fix: 'Add facebook-domain-verification if you use Facebook Ads or want verified domain sharing' });
    }

  } catch {
    findings.push({ page: '/', category: 'social', severity: 'error', issue: 'Could not fetch homepage for OG check', fix: 'Ensure site is accessible' });
  }
  return findings;
}

export async function runSEOAudit(): Promise<SEOAuditResult> {
  // Run page audits in parallel (batched to avoid overwhelming the server)
  const batch1 = AUDIT_PAGES.slice(0, 6);
  const batch2 = AUDIT_PAGES.slice(6);

  const [pageResults1, robotsResult, sitemapResult, googleResult, facebookResult] = await Promise.allSettled([
    Promise.all(batch1.map(p => auditPage(p))),
    checkRobotsTxt(),
    checkSitemap(),
    checkGooglePresence(),
    checkFacebookOG(),
  ]);

  const pageResults2 = batch2.length > 0
    ? await Promise.allSettled([Promise.all(batch2.map(p => auditPage(p)))])
    : [];

  const allFindings: SEOFinding[] = [];

  // Collect page findings
  if (pageResults1.status === 'fulfilled') allFindings.push(...pageResults1.value.flat());
  if (pageResults2.length > 0 && pageResults2[0].status === 'fulfilled') allFindings.push(...pageResults2[0].value.flat());
  if (robotsResult.status === 'fulfilled') allFindings.push(...robotsResult.value);
  if (sitemapResult.status === 'fulfilled') allFindings.push(...sitemapResult.value);
  if (googleResult.status === 'fulfilled') allFindings.push(...googleResult.value);
  if (facebookResult.status === 'fulfilled') allFindings.push(...facebookResult.value);

  // Calculate score
  const errors = allFindings.filter(f => f.severity === 'error').length;
  const warnings = allFindings.filter(f => f.severity === 'warning').length;
  const goods = allFindings.filter(f => f.severity === 'good').length;
  const total = allFindings.length;
  const score = total > 0 ? Math.round(((goods * 1 + warnings * 0.5) / total) * 100) : 0;

  // AI summary with prioritized recommendations
  const { summary, cost } = await buildSEOPrompt(allFindings, score);

  // Log AI cost
  const supabase = getServiceClient();
  supabase.from('agent_logs').insert({
    agent: 'seo',
    action: 'seo_audit',
    request_id: null,
    details: { score, errors: errors, warnings: warnings, pages_audited: AUDIT_PAGES.length, cost },
  } as Record<string, unknown>).then(() => {}, () => {});

  return { findings: allFindings, score, summary, aiCost: cost };
}

async function buildSEOPrompt(findings: SEOFinding[], score: number): Promise<{ summary: string; cost: number }> {
  const errorFindings = findings.filter(f => f.severity === 'error');
  const warningFindings = findings.filter(f => f.severity === 'warning');

  const prompt = `You are an SEO expert analyzing Harden HVACR's website (hardenhvacr.com) — an HVAC and refrigeration company in Tallahassee/Quincy, FL.

SEO SCORE: ${score}/100

CRITICAL ISSUES (${errorFindings.length}):
${errorFindings.map(f => `- [${f.page}] ${f.issue} → Fix: ${f.fix}`).join('\n') || 'None'}

WARNINGS (${warningFindings.length}):
${warningFindings.map(f => `- [${f.page}] ${f.issue} → Fix: ${f.fix}`).join('\n') || 'None'}

Write a prioritized action plan:
1. Top 3 fixes that will have the BIGGEST impact on Google rankings
2. Facebook/social sharing improvements
3. Local SEO recommendations (Google Business Profile, local keywords, schema markup)
4. Content suggestions (blog topics, service pages to add)

Be specific to HVAC/refrigeration in Tallahassee FL. Under 400 words.`;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are an SEO specialist for local service businesses. Be specific, actionable, and prioritize by impact.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 600,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);

  return { summary: response.output_text || 'No SEO analysis generated.', cost };
}
