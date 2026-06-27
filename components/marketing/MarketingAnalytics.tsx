'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BarChart3, Target, DollarSign, TrendingUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  target_platforms: string[];
  ai_cost: number;
  performance_data: Record<string, unknown>;
}

interface Content {
  id: string;
  status: string;
  platform: string;
  content_type: string;
  ai_cost: number;
}

export default function MarketingAnalytics({
  campaigns,
  content,
}: {
  campaigns: Campaign[];
  content: Content[];
}) {
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalContent = content.length;
  const approved = content.filter((c) => c.status === 'approved').length;
  const rejected = content.filter((c) => c.status === 'rejected').length;
  const pending = content.filter((c) => c.status === 'pending_review').length;
  const approvalRate = totalContent > 0 ? Math.round(((approved) / (approved + rejected || 1)) * 100) : 0;
  const totalAiCost = campaigns.reduce((sum, c) => sum + (c.ai_cost || 0), 0) + content.reduce((sum, c) => sum + (c.ai_cost || 0), 0);

  // Platform distribution
  const platformCounts: Record<string, number> = {};
  for (const c of content) {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  }

  // Campaign type distribution
  const typeCounts: Record<string, number> = {};
  for (const c of campaigns) {
    typeCounts[c.campaign_type] = (typeCounts[c.campaign_type] || 0) + 1;
  }

  // Content type distribution
  const contentTypeCounts: Record<string, number> = {};
  for (const c of content) {
    contentTypeCounts[c.content_type] = (contentTypeCounts[c.content_type] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                <p className="text-xs text-green-600">{activeCampaigns} active</p>
              </div>
              <div className="bg-purple-500 p-2 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Content Pieces</p>
                <p className="text-2xl font-bold text-gray-900">{totalContent}</p>
                <p className="text-xs text-yellow-600">{pending} pending</p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Approval Rate</p>
                <p className="text-2xl font-bold text-gray-900">{approvalRate}%</p>
                <p className="text-xs text-gray-500">{approved} approved, {rejected} rejected</p>
              </div>
              <div className="bg-green-500 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total AI Cost</p>
                <p className="text-2xl font-bold text-gray-900">${totalAiCost.toFixed(4)}</p>
                <p className="text-xs text-gray-500">this period</p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Platform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(platformCounts).length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{platform.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / totalContent) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Campaign Types</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-xs font-medium text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Content Types</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(contentTypeCounts).length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(contentTypeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-xs font-medium text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Scores */}
      {campaigns.filter(c => (c.performance_data as Record<string, unknown>)?.score).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Campaign Quality Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns
                .filter(c => (c.performance_data as Record<string, unknown>)?.score)
                .map((c) => {
                  const score = (c.performance_data as Record<string, unknown>).score as number;
                  return (
                    <div key={c.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{score}/100</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
