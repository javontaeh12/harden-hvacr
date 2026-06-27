'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import {
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Mail,
  Calendar,
  ChevronDown,
  ChevronRight,
  Activity,
  DollarSign,
  MessageSquare,
  Cpu,
  Search,
  Sparkles,
  Briefcase,
  Megaphone,
  Shield,
} from 'lucide-react';

interface AgentLog {
  id: string;
  agent: string;
  action: string;
  request_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface AgentSummary {
  total: number;
  actions: Record<string, number>;
}

const AGENT_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Bot }> = {
  dispatch:       { label: 'Dispatch Agent',    color: 'text-blue-600',   bgColor: 'bg-blue-50',   icon: Truck },
  ai_helper:      { label: 'AI Helper',         color: 'text-purple-600', bgColor: 'bg-purple-50', icon: MessageSquare },
  tag_reader:     { label: 'Tag Reader',         color: 'text-amber-600',  bgColor: 'bg-amber-50',  icon: Cpu },
  parts_lookup:   { label: 'Parts Lookup',       color: 'text-green-600',  bgColor: 'bg-green-50',  icon: Search },
  bot_manager:    { label: 'Business Manager',   color: 'text-blue-600',   bgColor: 'bg-blue-50',   icon: Briefcase },
  bot_marketing:  { label: 'Marketing Bot',      color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Megaphone },
  bot_security:   { label: 'Security Bot',       color: 'text-green-600',  bgColor: 'bg-green-50',  icon: Shield },
  bot_finance:    { label: 'Finance Bot',        color: 'text-amber-600',  bgColor: 'bg-amber-50',  icon: DollarSign },
  bot_tech:       { label: 'Tech Assistant',     color: 'text-red-600',    bgColor: 'bg-red-50',    icon: Sparkles },
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  auto_schedule:  { label: 'Auto Scheduled',   icon: Calendar,       color: 'text-green-600' },
  conflict:       { label: 'Conflict Flagged',  icon: AlertTriangle,  color: 'text-amber-600' },
  job_completed:  { label: 'Job Completed',     icon: CheckCircle2,   color: 'text-blue-600' },
  chat:           { label: 'Chat',              icon: MessageSquare,  color: 'text-purple-600' },
  scan:           { label: 'Tag Scan',          icon: Cpu,            color: 'text-amber-600' },
  lookup:         { label: 'Parts Lookup',      icon: Search,         color: 'text-green-600' },
  email_sent:     { label: 'Email Sent',        icon: Mail,           color: 'text-gray-600' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCost(cost: number) {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export default function AgentsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [summary, setSummary] = useState<Record<string, AgentSummary>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filter !== 'all') params.set('agent', filter);
      const res = await fetch(`/api/agent-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setSummary(data.summary || {});
    } catch (e) {
      console.error('Failed to fetch agent logs:', e);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Calculate cost totals from logs
  const totalCost = logs.reduce((sum, log) => sum + (Number(log.details?.cost) || 0), 0);
  const totalTokens = logs.reduce((sum, log) => sum + (Number(log.details?.input_tokens) || 0) + (Number(log.details?.output_tokens) || 0), 0);
  const totalActions = Object.values(summary).reduce((sum, s) => sum + s.total, 0);

  // Per-agent cost breakdown
  const agentCosts: Record<string, { cost: number; tokens: number; calls: number }> = {};
  for (const log of logs) {
    const agent = log.agent;
    if (!agentCosts[agent]) agentCosts[agent] = { cost: 0, tokens: 0, calls: 0 };
    agentCosts[agent].cost += Number(log.details?.cost) || 0;
    agentCosts[agent].tokens += (Number(log.details?.input_tokens) || 0) + (Number(log.details?.output_tokens) || 0);
    agentCosts[agent].calls++;
  }

  // Today's cost
  const today = new Date().toISOString().split('T')[0];
  const todayCost = logs
    .filter(l => l.created_at?.startsWith(today))
    .reduce((sum, l) => sum + (Number(l.details?.cost) || 0), 0);

  const filterOptions = ['all', ...Object.keys(summary)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Agent Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Monitor AI agent activity, usage, and costs</p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Total Actions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalActions}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-600 uppercase">Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{formatCost(totalCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-600 uppercase">Today&apos;s Cost</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{formatCost(todayCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase">Total Tokens</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Per-Agent Cost Breakdown */}
      {Object.keys(agentCosts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              Cost Breakdown by Agent
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(agentCosts)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([agent, data]) => {
                const config = AGENT_CONFIG[agent] || { label: agent, color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Bot };
                const Icon = config.icon;
                const pct = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
                return (
                  <div key={agent} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{config.label}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCost(data.cost)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {data.calls} calls | {(data.tokens / 1000).toFixed(1)}k tok
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Agent Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summary).map(([agent, stats]) => {
            const config = AGENT_CONFIG[agent] || { label: agent, color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Bot };
            const Icon = config.icon;
            const agentCost = agentCosts[agent]?.cost || 0;
            return (
              <div key={agent} className={`${config.bgColor} rounded-xl border border-gray-200 p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{config.label}</h3>
                    <p className="text-xs text-gray-500">{stats.total} actions | {formatCost(agentCost)} spent</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {Object.entries(stats.actions).map(([action, count]) => {
                    const actionConf = ACTION_CONFIG[action] || { label: action, icon: Bot, color: 'text-gray-500' };
                    const ActionIcon = actionConf.icon;
                    return (
                      <div key={action} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <ActionIcon className={`w-3.5 h-3.5 ${actionConf.color}`} />
                          {actionConf.label}
                        </span>
                        <span className="font-bold text-gray-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter + Logs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Activity Log</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : AGENT_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Loading agent activity...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Bot className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No agent activity yet</p>
            <p className="text-sm text-gray-400 mt-1">Agent actions will appear here as they process requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const agentConf = AGENT_CONFIG[log.agent] || { label: log.agent, color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Bot };
              const actionConf = ACTION_CONFIG[log.action] || { label: log.action, icon: Bot, color: 'text-gray-500' };
              const AgentIcon = agentConf.icon;
              const ActionIcon = actionConf.icon;
              const isExpanded = expandedLog === log.id;
              const details = log.details || {};
              const logCost = Number(details.cost) || 0;

              return (
                <div key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${agentConf.bgColor} flex-shrink-0`}>
                      <AgentIcon className={`w-4 h-4 ${agentConf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{agentConf.label}</span>
                        <span className={`flex items-center gap-1 text-xs font-bold ${actionConf.color}`}>
                          <ActionIcon className="w-3 h-3" />
                          {actionConf.label}
                        </span>
                        {logCost > 0 && (
                          <span className="text-xs text-red-500 font-mono">{formatCost(logCost)}</span>
                        )}
                      </div>
                      {details.analysis ? (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{String(details.analysis)}</p>
                      ) : null}
                      {details.customer_name ? (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Customer: {String(details.customer_name)}
                          {details.tech_name ? ` | Tech: ${String(details.tech_name)}` : ''}
                        </p>
                      ) : null}
                      {details.bot_name ? (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{String(details.bot_name)}</p>
                      ) : null}
                      {details.manufacturer ? (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {String(details.manufacturer)} {details.model_number ? String(details.model_number) : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(log.created_at)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 ml-11">
                      <div className="bg-gray-50 rounded-lg p-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {details.model ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Model</span>
                              <p className="text-gray-700 font-mono text-xs">{String(details.model)}</p>
                            </div>
                          ) : null}
                          {(details.input_tokens || details.output_tokens) ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Tokens</span>
                              <p className="text-gray-700 text-xs">
                                {Number(details.input_tokens).toLocaleString()} in / {Number(details.output_tokens).toLocaleString()} out
                              </p>
                            </div>
                          ) : null}
                          {logCost > 0 ? (
                            <div>
                              <span className="text-xs font-bold text-red-400 uppercase">Cost</span>
                              <p className="text-red-600 font-bold">{formatCost(logCost)}</p>
                            </div>
                          ) : null}
                          {details.decision ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Decision</span>
                              <p className="text-gray-700">{String(details.decision)}</p>
                            </div>
                          ) : null}
                          {details.scheduled_date ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Scheduled Date</span>
                              <p className="text-gray-700">{String(details.scheduled_date)}</p>
                            </div>
                          ) : null}
                          {details.time_frame ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Time Frame</span>
                              <p className="text-gray-700">{String(details.time_frame)}</p>
                            </div>
                          ) : null}
                          {details.assigned_tech_name ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Assigned Tech</span>
                              <p className="text-gray-700">{String(details.assigned_tech_name)}</p>
                            </div>
                          ) : null}
                          {details.priority ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Priority</span>
                              <p className="text-gray-700 capitalize">{String(details.priority)}</p>
                            </div>
                          ) : null}
                          {details.estimated_duration ? (
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase">Est. Duration</span>
                              <p className="text-gray-700">{String(details.estimated_duration)}</p>
                            </div>
                          ) : null}
                        </div>
                        {details.analysis ? (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs font-bold text-gray-400 uppercase">AI Analysis</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{String(details.analysis)}</p>
                          </div>
                        ) : null}
                        {details.suggested_plan ? (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs font-bold text-gray-400 uppercase">Suggested Plan</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{String(details.suggested_plan)}</p>
                          </div>
                        ) : null}
                        {log.request_id && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs font-bold text-gray-400 uppercase">Request ID</span>
                            <p className="text-gray-500 font-mono text-xs mt-1">{log.request_id}</p>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-bold text-gray-400 uppercase">Timestamp</span>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(log.created_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
