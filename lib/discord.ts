const DISCORD_API = 'https://discord.com/api/v10';

// ── Agent Definitions ──────────────────────────────────────────────────────
export type AgentName = 'manager' | 'finance' | 'security' | 'marketing' | 'dispatch' | 'webdev' | 'seo';

export interface AgentConfig {
  name: AgentName;
  label: string;
  description: string;
  token: string;
  applicationId: string;
  publicKey: string;
  channelId: string;
}

// Each agent has its own Discord bot application, token, and dedicated channel
export const AGENTS: Record<AgentName, AgentConfig> = {
  manager: {
    name: 'manager',
    label: 'Manager',
    description: 'Operations oversight, weekly reports, staff coordination, business decisions',
    token: process.env.DISCORD_BOT_TOKEN_MANAGER || '',
    applicationId: process.env.DISCORD_APP_ID_MANAGER || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_MANAGER || '',
    channelId: process.env.DISCORD_CHANNEL_MANAGER || '',
  },
  finance: {
    name: 'finance',
    label: 'Finance',
    description: 'Invoicing, payment tracking, cost analysis, AI spend tracking, revenue reports',
    token: process.env.DISCORD_BOT_TOKEN_FINANCE || '',
    applicationId: process.env.DISCORD_APP_ID_FINANCE || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_FINANCE || '',
    channelId: process.env.DISCORD_CHANNEL_FINANCE || '',
  },
  security: {
    name: 'security',
    label: 'Security',
    description: 'System monitoring, access alerts, audit logs, suspicious activity detection',
    token: process.env.DISCORD_BOT_TOKEN_SECURITY || '',
    applicationId: process.env.DISCORD_APP_ID_SECURITY || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_SECURITY || '',
    channelId: process.env.DISCORD_CHANNEL_SECURITY || '',
  },
  marketing: {
    name: 'marketing',
    label: 'Marketing',
    description: 'Customer follow-ups, review requests, retention campaigns, promotions',
    token: process.env.DISCORD_BOT_TOKEN_MARKETING || '',
    applicationId: process.env.DISCORD_APP_ID_MARKETING || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_MARKETING || '',
    channelId: process.env.DISCORD_CHANNEL_MARKETING || '',
  },
  dispatch: {
    name: 'dispatch',
    label: 'Dispatch & Scheduling',
    description: 'Job scheduling, tech assignment, conflict resolution, calendar management',
    token: process.env.DISCORD_BOT_TOKEN_DISPATCH || '',
    applicationId: process.env.DISCORD_APP_ID_DISPATCH || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_DISPATCH || '',
    channelId: process.env.DISCORD_CHANNEL_DISPATCH || '',
  },
  webdev: {
    name: 'webdev',
    label: 'Web Developer',
    description: 'Auto-fixes SEO issues, schema markup, meta tags, code improvements, pushes to preview branch',
    token: process.env.DISCORD_BOT_TOKEN_WEBDEV || '',
    applicationId: process.env.DISCORD_APP_ID_WEBDEV || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_WEBDEV || '',
    channelId: process.env.DISCORD_CHANNEL_WEBDEV || '',
  },
  seo: {
    name: 'seo',
    label: 'SEO',
    description: 'Weekly site audits, Google ranking checks, Facebook OG, meta tags, schema markup analysis',
    token: process.env.DISCORD_BOT_TOKEN_SEO || '',
    applicationId: process.env.DISCORD_APP_ID_SEO || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY_SEO || '',
    channelId: process.env.DISCORD_CHANNEL_SEO || '',
  },
};

// Group meeting channel — all bots can post here
export const GROUP_MEETING_CHANNEL = process.env.DISCORD_CHANNEL_GROUP_MEETING || '';

// ── Backwards-compatible channel map ───────────────────────────────────────
export const CHANNELS = {
  dispatch: AGENTS.dispatch.channelId,
  manager: AGENTS.manager.channelId,
  finance: AGENTS.finance.channelId,
  security: AGENTS.security.channelId,
  marketing: AGENTS.marketing.channelId,
  webdev: AGENTS.webdev.channelId,
  seo: AGENTS.seo.channelId,
  groupMeeting: GROUP_MEETING_CHANNEL,
  // Legacy aliases (used by existing code)
  followups: AGENTS.marketing.channelId,
  reports: AGENTS.manager.channelId,
  inbound: AGENTS.finance.channelId,
  alerts: AGENTS.security.channelId,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Get the bot token for a specific agent (falls back to dispatch token if agent has none) */
export function getAgentToken(agent: AgentName): string {
  const token = AGENTS[agent].token;
  if (token) return token;
  // Fallback: use dispatch token so all bots can post even before their own app is created
  return AGENTS.dispatch.token;
}

/** Get agent config by application ID (for webhook verification) */
export function getAgentByAppId(applicationId: string): AgentConfig | undefined {
  return Object.values(AGENTS).find(a => a.applicationId === applicationId);
}

/** Get agent config by public key (for signature verification) */
export function getAgentByPublicKey(publicKey: string): AgentConfig | undefined {
  return Object.values(AGENTS).find(a => a.publicKey === publicKey);
}

/** Get all public keys for webhook verification */
export function getAllPublicKeys(): { publicKey: string; applicationId: string; agent: AgentName }[] {
  return Object.values(AGENTS)
    .filter(a => a.publicKey)
    .map(a => ({ publicKey: a.publicKey, applicationId: a.applicationId, agent: a.name }));
}

// ── Message Sending ────────────────────────────────────────────────────────

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

/** Send a message as a specific agent to any channel */
export async function sendMessageAs(
  agent: AgentName,
  channelId: string,
  content: string,
  options?: { embeds?: DiscordEmbed[]; components?: unknown[] }
) {
  const token = getAgentToken(agent);
  if (!token) {
    console.error(`No bot token for agent: ${agent}`);
    return null;
  }
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      embeds: options?.embeds,
      components: options?.components,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Discord post failed for ${agent} in channel ${channelId}:`, data);
  }
  return data;
}

/** Send a message to an agent's own channel */
export async function sendToOwnChannel(
  agent: AgentName,
  content: string,
  options?: { embeds?: DiscordEmbed[]; components?: unknown[] }
) {
  const channelId = AGENTS[agent].channelId;
  if (!channelId) {
    console.error(`No channel configured for agent: ${agent}`);
    return null;
  }
  return sendMessageAs(agent, channelId, content, options);
}

/** Send a message to the group meeting channel as a specific agent */
export async function sendToGroupMeeting(
  agent: AgentName,
  content: string,
  options?: { embeds?: DiscordEmbed[]; components?: unknown[] }
) {
  if (!GROUP_MEETING_CHANNEL) {
    console.error('No group meeting channel configured');
    return null;
  }
  return sendMessageAs(agent, GROUP_MEETING_CHANNEL, content, options);
}

/** Legacy sendMessage — uses dispatch bot by default */
export async function sendMessage(
  channelId: string,
  content: string,
  options?: { embeds?: DiscordEmbed[]; components?: unknown[] }
) {
  // Determine which agent owns this channel
  const agent = Object.values(AGENTS).find(a => a.channelId === channelId);
  const agentName = agent?.name || 'dispatch';
  return sendMessageAs(agentName, channelId, content, options);
}

/** Edit an interaction response (works for any bot since interaction tokens are global) */
export async function editInteractionResponse(
  interactionToken: string,
  applicationId: string,
  data: { content?: string; embeds?: DiscordEmbed[]; components?: unknown[] }
) {
  await fetch(
    `${DISCORD_API}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
}

// ── Colors ─────────────────────────────────────────────────────────────────
const COLORS = {
  red: 0xdc2626,
  green: 0x059669,
  blue: 0x1e40af,
  yellow: 0xf59e0b,
  purple: 0x7c3aed,
  orange: 0xea580c,
};

// ── Embed Builders ─────────────────────────────────────────────────────────

export function buildConflictEmbed(data: {
  requestName: string;
  requestService: string;
  requestDate: string;
  requestIssue: string;
  aiAnalysis: string;
  suggestedPlan: string;
}): DiscordEmbed {
  return {
    title: `Dispatch Conflict — ${data.requestName}`,
    color: COLORS.red,
    fields: [
      { name: 'Service', value: data.requestService, inline: true },
      { name: 'Requested Date', value: data.requestDate, inline: true },
      { name: 'Issue', value: data.requestIssue.slice(0, 1024) },
      { name: 'AI Analysis', value: data.aiAnalysis.slice(0, 1024) },
      { name: 'Suggested Plan', value: data.suggestedPlan.slice(0, 1024) },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildFollowUpEmbed(data: {
  customerName: string;
  email: string;
  serviceType: string;
  techName: string;
  status: string;
}): DiscordEmbed {
  return {
    title: `Follow-Up Sent — ${data.customerName}`,
    color: COLORS.green,
    fields: [
      { name: 'Customer', value: data.customerName, inline: true },
      { name: 'Email', value: data.email, inline: true },
      { name: 'Service', value: data.serviceType, inline: true },
      { name: 'Tech', value: data.techName, inline: true },
      { name: 'Status', value: data.status },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildReportEmbed(stats: {
  autoScheduled: number;
  conflicts: number;
  followUps: number;
  replyActions: number;
  totalCost: number;
}): DiscordEmbed {
  return {
    title: 'Weekly AI Agent Report',
    color: COLORS.blue,
    fields: [
      { name: 'Auto-Scheduled', value: String(stats.autoScheduled), inline: true },
      { name: 'Conflicts', value: String(stats.conflicts), inline: true },
      { name: 'Follow-Ups Sent', value: String(stats.followUps), inline: true },
      { name: 'Replies Processed', value: String(stats.replyActions), inline: true },
      { name: 'AI Spend', value: `$${stats.totalCost.toFixed(4)}`, inline: true },
    ],
    footer: { text: 'Reply with instructions to adjust agent behavior' },
    timestamp: new Date().toISOString(),
  };
}

export function buildFinanceEmbed(data: {
  title: string;
  items: { name: string; value: string; inline?: boolean }[];
}): DiscordEmbed {
  return {
    title: data.title,
    color: COLORS.yellow,
    fields: data.items,
    timestamp: new Date().toISOString(),
  };
}

export function buildSecurityEmbed(data: {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}): DiscordEmbed {
  const severityColors = { low: COLORS.blue, medium: COLORS.yellow, high: COLORS.orange, critical: COLORS.red };
  return {
    title: data.title,
    description: data.description,
    color: severityColors[data.severity],
    footer: { text: `Severity: ${data.severity.toUpperCase()}` },
    timestamp: new Date().toISOString(),
  };
}

export function buildMarketingEmbed(data: {
  title: string;
  customerName: string;
  details: string;
}): DiscordEmbed {
  return {
    title: data.title,
    color: COLORS.purple,
    fields: [
      { name: 'Customer', value: data.customerName, inline: true },
      { name: 'Details', value: data.details },
    ],
    timestamp: new Date().toISOString(),
  };
}

// ── Extended Embed Builders (Agent System) ────────────────────────────────

export function buildDailyScheduleEmbed(data: {
  date: string;
  totalJobs: number;
  areas: number;
  jobs: { name: string; value: string }[];
}): DiscordEmbed {
  return {
    title: `Daily Schedule — ${data.date}`,
    color: COLORS.blue,
    fields: [
      { name: 'Total Jobs', value: String(data.totalJobs), inline: true },
      { name: 'Service Areas', value: String(data.areas), inline: true },
      ...data.jobs,
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildDailyReportEmbed(data: {
  summary: string;
  bookings: number;
  completed: number;
  pending: number;
  revenue: number;
  expenses: number;
  aiCost: number;
}): DiscordEmbed {
  return {
    title: 'Daily Operations Report',
    description: data.summary.slice(0, 4096),
    color: COLORS.blue,
    fields: [
      { name: 'Bookings', value: String(data.bookings), inline: true },
      { name: 'Completed', value: String(data.completed), inline: true },
      { name: 'Pending', value: String(data.pending), inline: true },
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Expenses', value: `$${data.expenses.toFixed(2)}`, inline: true },
      { name: 'Net', value: `$${(data.revenue - data.expenses).toFixed(2)}`, inline: true },
    ],
    footer: { text: `AI Cost: $${data.aiCost.toFixed(4)}` },
    timestamp: new Date().toISOString(),
  };
}

export function buildMonthlyReportEmbed(data: {
  summary: string;
  revenue: number;
  expenses: number;
  prevRevenue: number;
  topCustomers: string;
  contractRenewals: number;
}): DiscordEmbed {
  const change = data.prevRevenue > 0
    ? (((data.revenue - data.prevRevenue) / data.prevRevenue) * 100).toFixed(1)
    : '0';
  return {
    title: 'Monthly Operations Report',
    description: data.summary.slice(0, 4096),
    color: COLORS.green,
    fields: [
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Expenses', value: `$${data.expenses.toFixed(2)}`, inline: true },
      { name: 'MoM Change', value: `${change}%`, inline: true },
      { name: 'Top Customers', value: data.topCustomers || 'None' },
      { name: 'Contract Renewals', value: String(data.contractRenewals), inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildWeeklyFinanceEmbed(data: {
  revenue: number;
  expenses: number;
  profitMargin: number;
  prevRevenue: number;
  categories: { name: string; value: string; inline?: boolean }[];
}): DiscordEmbed {
  return {
    title: 'Weekly Finance Report',
    color: COLORS.yellow,
    fields: [
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Expenses', value: `$${data.expenses.toFixed(2)}`, inline: true },
      { name: 'Profit Margin', value: `${data.profitMargin.toFixed(1)}%`, inline: true },
      { name: 'Prev Week Revenue', value: `$${data.prevRevenue.toFixed(2)}`, inline: true },
      ...data.categories,
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildGroupMeetingEmbed(data: {
  agent: string;
  actions: number;
  cost: number;
  highlights: string;
}): DiscordEmbed {
  return {
    title: `${data.agent} — Weekly Update`,
    color: COLORS.purple,
    fields: [
      { name: 'Total Actions', value: String(data.actions), inline: true },
      { name: 'AI Cost', value: `$${data.cost.toFixed(4)}`, inline: true },
      { name: 'Highlights', value: data.highlights || 'No activity' },
    ],
    timestamp: new Date().toISOString(),
  };
}

// ── Button & Modal Builders ────────────────────────────────────────────────

export function buildActionButtons(threadToken: string) {
  return [
    {
      type: 1, // ACTION_ROW
      components: [
        { type: 2, style: 3, label: 'Approve', custom_id: `approve_${threadToken}` },
        { type: 2, style: 1, label: 'Reschedule', custom_id: `reschedule_${threadToken}` },
        { type: 2, style: 4, label: 'Cancel', custom_id: `cancel_${threadToken}` },
        { type: 2, style: 2, label: 'Custom Reply', custom_id: `custom_${threadToken}` },
      ],
    },
  ];
}

export function buildResolvedButtons(summary: string) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 2, label: `Resolved: ${summary.slice(0, 70)}`, custom_id: 'resolved_noop', disabled: true },
      ],
    },
  ];
}

export function buildCustomReplyModal(threadToken: string) {
  return {
    title: 'Custom Instruction',
    custom_id: `modal_${threadToken}`,
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 4, // TEXT_INPUT
            custom_id: 'instruction',
            label: 'What should I do?',
            style: 2, // PARAGRAPH
            placeholder: 'e.g., "Schedule for next Tuesday 8 AM" or "Reassign to Mike"',
            required: true,
            max_length: 1000,
          },
        ],
      },
    ],
  };
}
