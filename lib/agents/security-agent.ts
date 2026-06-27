import { SupabaseClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

interface Finding {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

const TIMEOUT_MS = 8000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hardenhvacr.com';
const DOMAIN = new URL(SITE_URL).hostname;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export async function checkHTTPHeaders(): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const res = await withTimeout(fetch(SITE_URL, { method: 'HEAD' }), TIMEOUT_MS);
    const headers = res.headers;

    const checks: { header: string; name: string }[] = [
      { header: 'strict-transport-security', name: 'HSTS' },
      { header: 'x-content-type-options', name: 'X-Content-Type-Options' },
      { header: 'x-frame-options', name: 'X-Frame-Options' },
      { header: 'content-security-policy', name: 'Content-Security-Policy' },
      { header: 'referrer-policy', name: 'Referrer-Policy' },
    ];

    for (const check of checks) {
      const value = headers.get(check.header);
      findings.push({
        check: check.name,
        status: value ? 'pass' : 'warn',
        detail: value ? `Present: ${value.slice(0, 100)}` : `Missing ${check.name} header`,
      });
    }
  } catch (e) {
    findings.push({ check: 'HTTP Headers', status: 'fail', detail: `Could not check headers: ${e}` });
  }
  return findings;
}

export async function checkSSLCertificate(): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    // Use a HEAD request to verify SSL is working
    const res = await withTimeout(fetch(`https://${DOMAIN}`, { method: 'HEAD' }), TIMEOUT_MS);
    if (res.ok || res.status === 301 || res.status === 308) {
      findings.push({ check: 'SSL Certificate', status: 'pass', detail: 'SSL connection successful' });
    } else {
      findings.push({ check: 'SSL Certificate', status: 'warn', detail: `SSL responded with status ${res.status}` });
    }
  } catch (e) {
    findings.push({ check: 'SSL Certificate', status: 'fail', detail: `SSL check failed: ${e}` });
  }
  return findings;
}

export async function checkAuthAudit(supabase: SupabaseClient): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check for dormant accounts (no login in 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dormant, count: dormantCount } = await supabase
    .from('profiles')
    .select('full_name, email', { count: 'exact' })
    .lt('updated_at', ninetyDaysAgo)
    .eq('status', 'approved');

  if (dormantCount && dormantCount > 0) {
    const names = (dormant || []).slice(0, 3).map(p => p.full_name || p.email).join(', ');
    findings.push({
      check: 'Dormant Accounts',
      status: 'warn',
      detail: `${dormantCount} account(s) inactive 90+ days: ${names}${dormantCount > 3 ? '...' : ''}`,
    });
  } else {
    findings.push({ check: 'Dormant Accounts', status: 'pass', detail: 'No dormant accounts found' });
  }

  // Check for unauthorized admin roles
  const { data: admins, count: adminCount } = await supabase
    .from('profiles')
    .select('full_name, email', { count: 'exact' })
    .eq('role', 'admin');

  findings.push({
    check: 'Admin Accounts',
    status: (adminCount || 0) > 3 ? 'warn' : 'pass',
    detail: `${adminCount || 0} admin account(s) found${admins ? ': ' + admins.map(a => a.full_name || a.email).join(', ') : ''}`,
  });

  return findings;
}

export async function checkAPIExposure(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const endpoints = [
    '/api/dispatch',
    '/api/pricing',
    '/api/cron/follow-up',
    '/api/cron/agent-reports',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await withTimeout(
        fetch(`${SITE_URL}${endpoint}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
        TIMEOUT_MS
      );
      if (res.status === 401 || res.status === 403 || res.status === 405) {
        findings.push({ check: `API ${endpoint}`, status: 'pass', detail: `Protected (${res.status})` });
      } else {
        findings.push({ check: `API ${endpoint}`, status: 'warn', detail: `Returned ${res.status} — may be accessible without auth` });
      }
    } catch (e) {
      findings.push({ check: `API ${endpoint}`, status: 'warn', detail: `Could not reach endpoint: ${e}` });
    }
  }

  return findings;
}

export async function runSecurityScan(supabase: SupabaseClient): Promise<{
  status: 'passed' | 'warnings' | 'critical';
  findings: Finding[];
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  aiCost: number;
}> {
  // Run all checks in parallel
  const results = await Promise.allSettled([
    withTimeout(checkHTTPHeaders(), TIMEOUT_MS),
    withTimeout(checkSSLCertificate(), TIMEOUT_MS),
    withTimeout(checkAuthAudit(supabase), TIMEOUT_MS),
    withTimeout(checkAPIExposure(), TIMEOUT_MS),
  ]);

  const allFindings: Finding[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allFindings.push(...result.value);
    } else {
      allFindings.push({ check: 'Check Failed', status: 'fail', detail: String(result.reason) });
    }
  }

  const failCount = allFindings.filter(f => f.status === 'fail').length;
  const warnCount = allFindings.filter(f => f.status === 'warn').length;

  let status: 'passed' | 'warnings' | 'critical' = 'passed';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (failCount > 0) { status = 'critical'; severity = 'critical'; }
  else if (warnCount > 0) { status = 'warnings'; severity = warnCount > 3 ? 'high' : 'medium'; }

  // AI summary
  const { summary, cost } = await buildSecurityPrompt(allFindings);

  // Save to security_scans table
  await supabase.from('security_scans').insert({
    scan_type: 'full_daily',
    status,
    findings: allFindings,
    summary,
    severity,
  } as Record<string, unknown>);

  // Log AI cost to agent_logs
  await supabase.from('agent_logs').insert({
    agent: 'security',
    action: 'daily_security_scan',
    request_id: null,
    details: { status, severity, findings_count: allFindings.length, fail_count: failCount, warn_count: warnCount, cost },
  } as Record<string, unknown>);

  return { status, findings: allFindings, summary, severity, aiCost: cost };
}

export async function buildSecurityPrompt(findings: Finding[]): Promise<{ summary: string; cost: number }> {
  const findingsSummary = findings.map(f => `[${f.status.toUpperCase()}] ${f.check}: ${f.detail}`).join('\n');

  const prompt = `You are the Security AI for Harden HVACR. Analyze these scan results and write a brief security status report.

FINDINGS:
${findingsSummary}

Write a plain-English summary (3-5 sentences). Prioritize any failures or warnings. If everything passes, confirm the system is healthy. Include specific fix recommendations for any issues found.`;

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You are a cybersecurity analyst for a small business. Be clear and actionable.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 300,
  });

  const usage = extractUsage(response as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);

  return { summary: response.output_text || 'No summary generated.', cost };
}
