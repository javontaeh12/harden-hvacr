import { SupabaseClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

const GITHUB_OWNER = 'javontaeh12';
const GITHUB_REPO = 'harden-hvacr';
const PREVIEW_BRANCH = 'preview/dev-bot';
const BASE_BRANCH = 'main';

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// ── GitHub API helpers ─────────────────────────────────────────────────────

async function getFileSHA(path: string, branch: string): Promise<{ sha: string; content: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${branch}`,
    { headers: githubHeaders() }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf-8') };
}

async function ensurePreviewBranch(): Promise<boolean> {
  // Check if preview branch exists
  const checkRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${PREVIEW_BRANCH}`,
    { headers: githubHeaders() }
  );

  if (checkRes.ok) return true;

  // Get main branch SHA
  const mainRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${BASE_BRANCH}`,
    { headers: githubHeaders() }
  );
  if (!mainRes.ok) return false;
  const mainData = await mainRes.json();
  const sha = mainData.object.sha;

  // Create preview branch from main
  const createRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${PREVIEW_BRANCH}`, sha }),
    }
  );

  return createRes.ok;
}

async function pushFile(path: string, content: string, message: string): Promise<boolean> {
  // Get existing file SHA on preview branch (needed for updates)
  const existing = await getFileSHA(path, PREVIEW_BRANCH);

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: PREVIEW_BRANCH,
  };
  if (existing) body.sha = existing.sha;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify(body),
    }
  );

  return res.ok;
}

// ── Fix generators ─────────────────────────────────────────────────────────

interface FixableIssue {
  file: string;
  issue: string;
  fix: string;
  category: string;
}

export function identifyFixableIssues(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentLogs: any[]
): FixableIssue[] {
  const fixable: FixableIssue[] = [];

  for (const log of agentLogs) {
    const details = log.details as Record<string, unknown> | null;
    if (!details) continue;

    // SEO audit findings
    if (log.action === 'seo_audit' && details.score !== undefined && Number(details.score) < 90) {
      // The SEO agent stores findings — we re-audit to get specifics
      fixable.push({
        file: '__seo_reaudit__',
        issue: `SEO score is ${details.score}/100`,
        fix: 'Run targeted fixes for SEO issues',
        category: 'seo',
      });
    }

    // Security findings
    if (log.action === 'daily_security_scan' && details.status === 'warnings') {
      fixable.push({
        file: '__security_headers__',
        issue: 'Security headers need improvement',
        fix: 'Add security headers via next.config',
        category: 'security',
      });
    }
  }

  return fixable;
}

// Known files that commonly need SEO fixes
const SEO_FIX_TARGETS: { path: string; pageName: string }[] = [
  { path: 'app/request/page.tsx', pageName: 'Service Request page' },
  { path: 'app/page.tsx', pageName: 'Homepage' },
  { path: 'app/pricing/page.tsx', pageName: 'Pricing page' },
  { path: 'app/membership/page.tsx', pageName: 'Membership page' },
];

async function generateCodeFix(
  filePath: string,
  currentCode: string,
  issue: string,
  fixDescription: string
): Promise<{ newCode: string; cost: number } | null> {
  const prompt = `You are a Next.js web developer fixing SEO/code issues for Harden HVACR (hardenhvacr.com) — an HVAC and refrigeration company in Tallahassee and Quincy, FL.

FILE: ${filePath}
ISSUE: ${issue}
REQUIRED FIX: ${fixDescription}

CURRENT CODE:
\`\`\`tsx
${currentCode.slice(0, 8000)}
\`\`\`

RULES:
- Return ONLY the complete updated file content, no explanations
- Keep all existing functionality intact
- Use Next.js App Router conventions (export const metadata, etc.)
- For meta descriptions: include "Tallahassee", "Quincy", "FL", and relevant service keywords
- For JSON-LD schema: use LocalBusiness type with HVAC-specific fields
- Do NOT remove or change existing imports, components, or logic
- Do NOT add comments explaining your changes`;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are a senior Next.js developer. Return ONLY the updated file code, nothing else. No markdown fences.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 4000,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);
  const newCode = (response.output_text || '').replace(/^```(?:tsx?)?\s*/i, '').replace(/```\s*$/, '').trim();

  if (!newCode || newCode.length < 50) return null;
  return { newCode, cost };
}

// ── Main entry point ───────────────────────────────────────────────────────

export interface DevBotResult {
  fixesApplied: number;
  filesChanged: string[];
  totalCost: number;
  errors: string[];
}

export async function runDevBot(supabase: SupabaseClient): Promise<DevBotResult> {
  const result: DevBotResult = { fixesApplied: 0, filesChanged: [], totalCost: 0, errors: [] };

  // 1. Check for recent SEO/security findings
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .in('action', ['seo_audit', 'daily_security_scan'])
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(5);

  // 2. Re-run a quick SEO check to get specific page issues
  const { runSEOAudit } = await import('@/lib/agents/seo-agent');
  const seoResult = await runSEOAudit();
  result.totalCost += seoResult.aiCost;

  // Filter for fixable issues (errors and warnings that involve code changes)
  const codeFixable = seoResult.findings.filter(f =>
    f.severity !== 'good' && (
      f.category === 'meta' ||
      f.category === 'schema' ||
      f.category === 'social'
    )
  );

  if (codeFixable.length === 0 && (!recentLogs || recentLogs.length === 0)) {
    return result; // Nothing to fix
  }

  // 3. Ensure preview branch exists
  const branchReady = await ensurePreviewBranch();
  if (!branchReady) {
    result.errors.push('Could not create preview branch');
    return result;
  }

  // 4. Group issues by page/file
  const pageIssues: Record<string, { issues: string[]; fixes: string[] }> = {};
  for (const finding of codeFixable) {
    const target = SEO_FIX_TARGETS.find(t => finding.page === '/' ? t.path === 'app/page.tsx' : t.path === `app${finding.page}/page.tsx`);
    if (!target) continue;

    if (!pageIssues[target.path]) pageIssues[target.path] = { issues: [], fixes: [] };
    pageIssues[target.path].issues.push(finding.issue);
    pageIssues[target.path].fixes.push(finding.fix);
  }

  // Also check for missing sitemap.ts and robots.ts
  const sitemapFindings = seoResult.findings.filter(f => f.page === '/sitemap.xml' && f.severity !== 'good');
  const robotsFindings = seoResult.findings.filter(f => f.page === '/robots.txt' && f.severity !== 'good');

  if (sitemapFindings.length > 0) {
    pageIssues['app/sitemap.ts'] = {
      issues: ['Missing sitemap.xml'],
      fixes: ['Create app/sitemap.ts to auto-generate sitemap with all public pages'],
    };
  }

  if (robotsFindings.length > 0) {
    pageIssues['app/robots.ts'] = {
      issues: ['Missing or incomplete robots.txt'],
      fixes: ['Create app/robots.ts with proper Allow rules and sitemap reference'],
    };
  }

  // 5. Fix each file
  for (const [filePath, { issues, fixes }] of Object.entries(pageIssues)) {
    try {
      // For new files (sitemap.ts, robots.ts), generate from scratch
      if (filePath === 'app/sitemap.ts' || filePath === 'app/robots.ts') {
        const generated = await generateNewFile(filePath);
        if (generated) {
          const pushed = await pushFile(filePath, generated.code, `[dev-bot] Add ${filePath.split('/').pop()}`);
          if (pushed) {
            result.fixesApplied++;
            result.filesChanged.push(filePath);
            result.totalCost += generated.cost;
          }
        }
        continue;
      }

      // For existing files, read from GitHub and fix
      const file = await getFileSHA(filePath, BASE_BRANCH);
      if (!file) {
        result.errors.push(`Could not read ${filePath} from GitHub`);
        continue;
      }

      const fixResult = await generateCodeFix(
        filePath,
        file.content,
        issues.join('; '),
        fixes.join('; ')
      );

      if (!fixResult) {
        result.errors.push(`GPT could not generate fix for ${filePath}`);
        continue;
      }

      // Verify the fix is meaningfully different
      if (fixResult.newCode.trim() === file.content.trim()) continue;

      const pushed = await pushFile(filePath, fixResult.newCode, `[dev-bot] Fix: ${issues[0].slice(0, 50)}`);
      if (pushed) {
        result.fixesApplied++;
        result.filesChanged.push(filePath);
        result.totalCost += fixResult.cost;
      } else {
        result.errors.push(`Failed to push ${filePath}`);
      }
    } catch (e) {
      result.errors.push(`Error fixing ${filePath}: ${e}`);
    }
  }

  // 6. Check for security header fixes from next.config
  const securityLogs = (recentLogs || []).filter(l => l.action === 'daily_security_scan');
  if (securityLogs.length > 0) {
    const details = securityLogs[0].details as Record<string, unknown> | null;
    if (details?.warn && Number(details.warn) > 0) {
      try {
        const headerFix = await fixSecurityHeaders();
        if (headerFix) {
          const pushed = await pushFile('next.config.ts', headerFix.code, '[dev-bot] Add security headers');
          if (pushed) {
            result.fixesApplied++;
            result.filesChanged.push('next.config.ts');
            result.totalCost += headerFix.cost;
          }
        }
      } catch (e) {
        result.errors.push(`Security header fix error: ${e}`);
      }
    }
  }

  // Log AI cost
  await supabase.from('agent_logs').insert({
    agent: 'webdev',
    action: 'dev_bot_run',
    request_id: null,
    details: { fixes_applied: result.fixesApplied, files_changed: result.filesChanged, errors: result.errors.length, cost: result.totalCost },
  } as Record<string, unknown>);

  return result;
}

async function generateNewFile(filePath: string): Promise<{ code: string; cost: number } | null> {
  const templates: Record<string, string> = {
    'app/sitemap.ts': `Generate a Next.js App Router sitemap.ts file for hardenhvacr.com.
Include these pages: /, /pricing, /membership, /request, /services/emergency-repair, /services/tune-up, /services/diagnostics, /services/ac-repair, /services/heating, /services/commercial-refrigeration, /services/new-installation, /services/ductwork.
Set changeFrequency and priority appropriately. Homepage and services should have higher priority.
Return ONLY the TypeScript code, no explanations.`,

    'app/robots.ts': `Generate a Next.js App Router robots.ts file for hardenhvacr.com.
Allow all public pages. Disallow /admin/*, /portal/*, /api/*.
Include sitemap URL: https://hardenhvacr.com/sitemap.xml.
Return ONLY the TypeScript code, no explanations.`,
  };

  const prompt = templates[filePath];
  if (!prompt) return null;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are a senior Next.js developer. Return ONLY valid TypeScript code. No markdown fences.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 1000,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);
  const code = (response.output_text || '').replace(/^```(?:tsx?|typescript)?\s*/i, '').replace(/```\s*$/, '').trim();

  if (!code || code.length < 30) return null;
  return { code, cost };
}

async function fixSecurityHeaders(): Promise<{ code: string; cost: number } | null> {
  // Read current next.config from GitHub
  const existing = await getFileSHA('next.config.ts', BASE_BRANCH)
    || await getFileSHA('next.config.mjs', BASE_BRANCH)
    || await getFileSHA('next.config.js', BASE_BRANCH);

  const configPath = existing ? 'existing config' : 'new config';
  const currentCode = existing?.content || '';

  const prompt = `You are a Next.js developer. ${existing ? 'Update' : 'Create'} a next.config.ts that adds security headers.

${existing ? `CURRENT CONFIG:\n\`\`\`\n${currentCode.slice(0, 4000)}\n\`\`\`` : 'No existing config found.'}

Add these security headers to the headers() config:
- Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

IMPORTANT: Keep ALL existing config options intact. Only add/merge the headers.
Return ONLY the complete ${configPath} file code.`;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are a senior Next.js developer. Return ONLY the updated config file code. No markdown fences.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);
  const code = (response.output_text || '').replace(/^```(?:tsx?|javascript|mjs)?\s*/i, '').replace(/```\s*$/, '').trim();

  if (!code || code.length < 30) return null;
  return { code, cost };
}
