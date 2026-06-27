'use client';

import { useState } from 'react';
import { Card, CardContent, Button, Input, Modal, Select } from '@/components/ui';
import { Rocket, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  campaign_type: string;
  target_services: string[];
  target_platforms: string[];
  target_audience: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  performance_data: Record<string, unknown>;
  ai_cost: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  seasonal: 'Seasonal',
  weather_reactive: 'Weather',
  promotion: 'Promo',
  awareness: 'Awareness',
  retention: 'Retention',
  referral: 'Referral',
};

export default function CampaignList({
  campaigns,
  onRefresh,
}: {
  campaigns: Campaign[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'seasonal',
    target_platforms: ['facebook'],
    target_audience: '',
    budget: 0,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          status: 'draft',
          target_services: [],
        }),
      });
      setIsCreateOpen(false);
      setNewCampaign({ name: '', description: '', campaign_type: 'seasonal', target_platforms: ['facebook'], target_audience: '', budget: 0 });
      onRefresh();
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch('/api/marketing/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Campaigns</h3>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No campaigns yet. The AI generates them every Monday, or create one manually.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const perf = campaign.performance_data as Record<string, unknown> | null;
            return (
              <Card key={campaign.id}>
                <CardContent className="py-3 px-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(expanded === campaign.id ? null : campaign.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">{campaign.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] || STATUS_COLORS.draft}`}>
                            {campaign.status}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {TYPE_LABELS[campaign.campaign_type] || campaign.campaign_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {campaign.target_platforms.join(', ')} | Budget: ${campaign.budget || 0} | AI: ${campaign.ai_cost.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    {expanded === campaign.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {expanded === campaign.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {campaign.description && (
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>Services: {campaign.target_services.join(', ') || 'All'}</div>
                        <div>Audience: {campaign.target_audience || 'General'}</div>
                        <div>Start: {campaign.start_date || 'TBD'}</div>
                        <div>End: {campaign.end_date || 'TBD'}</div>
                      </div>
                      {perf && typeof perf.summary === 'string' && (
                        <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                          <strong>AI Analysis:</strong> {perf.summary}
                          {typeof perf.score === 'number' && <span className="ml-2">(Score: {perf.score}/100)</span>}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {campaign.status === 'draft' && (
                          <Button size="sm" onClick={() => handleStatusChange(campaign.id, 'active')}>Activate</Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign.id, 'paused')}>Pause</Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button size="sm" onClick={() => handleStatusChange(campaign.id, 'active')}>Resume</Button>
                        )}
                        {['draft', 'active', 'paused'].includes(campaign.status) && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign.id, 'cancelled')}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Campaign">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Campaign Name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" rows={2} value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} />
          </div>
          <Select label="Campaign Type" options={[
            { value: 'seasonal', label: 'Seasonal' },
            { value: 'weather_reactive', label: 'Weather Reactive' },
            { value: 'promotion', label: 'Promotion' },
            { value: 'awareness', label: 'Brand Awareness' },
            { value: 'retention', label: 'Customer Retention' },
            { value: 'referral', label: 'Referral' },
          ]} value={newCampaign.campaign_type} onChange={(e) => setNewCampaign({ ...newCampaign, campaign_type: e.target.value })} />
          <Input label="Target Audience" value={newCampaign.target_audience} onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })} placeholder="e.g., Homeowners in Tallahassee" />
          <Input label="Weekly Budget ($)" type="number" min="0" step="0.01" value={newCampaign.budget || ''} onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) || 0 })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
