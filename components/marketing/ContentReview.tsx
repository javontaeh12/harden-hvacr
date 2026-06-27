'use client';

import { useState } from 'react';
import { Card, CardContent, Button, Input } from '@/components/ui';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

interface ReviewContent {
  id: string;
  campaign_id: string;
  content_type: string;
  platform: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  headline: string | null;
  body_copy: string | null;
  cta: string | null;
  hashtags: string[];
  image_prompt: string | null;
  variant_label: string | null;
  rejection_reason: string | null;
  marketing_campaigns?: { name: string } | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  google_ads: 'bg-green-100 text-green-700',
  email: 'bg-gray-100 text-gray-700',
  website: 'bg-purple-100 text-purple-700',
};

export default function ContentReview({
  content,
  onRefresh,
  onSelectContent,
}: {
  content: ReviewContent[];
  onRefresh: () => void;
  onSelectContent: (id: string) => void;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/marketing/content/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, action: 'approve' }),
      });
      onRefresh();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch('/api/marketing/content/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, action: 'reject', rejection_reason: rejectReason }),
      });
      setRejectingId(null);
      setRejectReason('');
      onRefresh();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const pending = content.filter((c) => c.status === 'pending_review');
  const recent = content.filter((c) => ['approved', 'rejected'].includes(c.status)).slice(0, 10);

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Review Queue <span className="text-sm font-normal text-gray-500">({pending.length} pending)</span>
      </h3>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">All caught up! No content pending review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.website}`}>
                        {item.platform}
                      </span>
                      <span className="text-xs text-gray-500">{item.content_type}</span>
                      {item.variant_label && (
                        <span className="text-xs font-bold text-purple-600">Variant {item.variant_label}</span>
                      )}
                      {item.marketing_campaigns && (
                        <span className="text-xs text-gray-400">{item.marketing_campaigns.name}</span>
                      )}
                    </div>
                    {item.headline && <p className="font-medium text-gray-900 text-sm">{item.headline}</p>}
                    {item.body_copy && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.body_copy}</p>}
                    {item.cta && <p className="text-sm text-blue-600 mt-1 font-medium">{item.cta}</p>}
                    {item.hashtags && item.hashtags.length > 0 && (
                      <p className="text-xs text-blue-400 mt-1">{item.hashtags.map(h => `#${h}`).join(' ')}</p>
                    )}
                    {item.image_prompt && (
                      <p className="text-xs text-gray-400 mt-1 italic">Image: {item.image_prompt.slice(0, 100)}...</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Scheduled: {item.scheduled_date || 'TBD'} {item.scheduled_time || ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => handleApprove(item.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onSelectContent(item.id)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Detail
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setRejectingId(item.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>

                {rejectingId === item.id && (
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Input
                      placeholder="Rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleReject(item.id)}>Submit</Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recently Reviewed</h4>
          <div className="space-y-1">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'approved' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-gray-700">{item.headline || item.platform}</span>
                  <span className="text-xs text-gray-400">{item.platform} {item.variant_label || ''}</span>
                </div>
                <span className={`text-xs font-medium ${item.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
