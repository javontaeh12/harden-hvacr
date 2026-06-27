'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { CheckCircle, Copy, ImageIcon, Loader2, RefreshCw, XCircle } from 'lucide-react';

interface ContentItem {
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
  image_url: string | null;
  creative_brief: Record<string, unknown>;
  ad_targeting: Record<string, unknown>;
  variant_label: string | null;
  parent_content_id: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  ai_cost: number;
  marketing_campaigns?: { name: string; campaign_type: string } | null;
}

export default function ContentDetail({
  contentId,
  isOpen,
  onClose,
  onRefresh,
}: {
  contentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ headline: '', body_copy: '', cta: '' });
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (contentId && isOpen) fetchContent();
  }, [contentId, isOpen]);

  const fetchContent = async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/content?content_id=${contentId}`);
      const data = await res.json();
      const item = Array.isArray(data) ? data[0] : data;
      if (item) {
        setContent(item);
        setEditData({ headline: item.headline || '', body_copy: item.body_copy || '', cta: item.cta || '' });
      }
    } catch {
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      await fetch('/api/marketing/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: content.id, ...editData }),
      });
      setEditing(false);
      onRefresh();
      fetchContent();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleApprove = async () => {
    if (!content) return;
    await fetch('/api/marketing/content/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: content.id, action: 'approve' }),
    });
    onRefresh();
    onClose();
  };

  const handleGenerateImage = async () => {
    if (!content) return;
    setGeneratingImage(true);
    setImageError(null);
    try {
      const res = await fetch('/api/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: content.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error || 'Image generation failed');
      } else {
        onRefresh();
        fetchContent();
      }
    } catch {
      setImageError('Network error generating image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Content Detail">
      {loading || !content ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{content.platform}</span>
            <span className="text-xs text-gray-500">{content.content_type}</span>
            {content.variant_label && <span className="text-xs font-bold text-purple-600">Variant {content.variant_label}</span>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${content.status === 'approved' ? 'bg-green-100 text-green-700' : content.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {content.status.replace('_', ' ')}
            </span>
          </div>

          {content.marketing_campaigns && (
            <p className="text-xs text-gray-500">Campaign: {content.marketing_campaigns.name}</p>
          )}

          {/* Image Section */}
          {content.image_url ? (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={content.image_url}
                alt={content.headline || 'Marketing image'}
                className="w-full h-auto max-h-[400px] object-cover"
              />
              <div className="p-3 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600 font-medium">Ad image ready</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyToClipboard(content.image_url!)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy URL
                    </button>
                    <a href={content.image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700">
                      Full Size
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                  >
                    {generatingImage ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Regenerating...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-1" /> Regenerate Image</>
                    )}
                  </Button>
                </div>
                {imageError && <p className="text-xs text-red-600 mt-1">{imageError}</p>}
              </div>
              {/* Show the prompt used */}
              {content.image_prompt && (
                <details className="p-3 border-t border-gray-200 bg-gray-50">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">View image prompt</summary>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{content.image_prompt}</p>
                </details>
              )}
            </div>
          ) : content.image_prompt ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-amber-700">Image Prompt Ready</label>
                <button onClick={() => copyToClipboard(content.image_prompt!)} className="text-gray-400 hover:text-gray-600">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-amber-800 mb-3 leading-relaxed">{content.image_prompt}</p>
              <Button
                size="sm"
                onClick={handleGenerateImage}
                disabled={generatingImage}
              >
                {generatingImage ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating HD Image...</>
                ) : (
                  <><ImageIcon className="w-4 h-4 mr-1" /> Generate HD Image</>
                )}
              </Button>
              {imageError && <p className="text-xs text-red-600 mt-2">{imageError}</p>}
            </div>
          ) : null}

          {editing ? (
            <div className="space-y-3">
              <Input label="Headline" value={editData.headline} onChange={(e) => setEditData({ ...editData, headline: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body Copy</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" rows={4} value={editData.body_copy} onChange={(e) => setEditData({ ...editData, body_copy: e.target.value })} />
              </div>
              <Input label="CTA" value={editData.cta} onChange={(e) => setEditData({ ...editData, cta: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {content.headline && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500">Headline</label>
                    <button onClick={() => copyToClipboard(content.headline!)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{content.headline}</p>
                </div>
              )}
              {content.body_copy && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500">Body Copy</label>
                    <button onClick={() => copyToClipboard(content.body_copy!)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{content.body_copy}</p>
                </div>
              )}
              {content.cta && (
                <div>
                  <label className="text-xs font-medium text-gray-500">CTA</label>
                  <p className="text-sm text-blue-600 font-medium">{content.cta}</p>
                </div>
              )}
              {content.hashtags && content.hashtags.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Hashtags</label>
                  <p className="text-sm text-blue-400">{content.hashtags.map(h => `#${h}`).join(' ')}</p>
                </div>
              )}
              {content.rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <label className="text-xs font-medium text-red-500">Rejection Reason</label>
                  <p className="text-sm text-red-700 mt-1">{content.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            <p>Scheduled: {content.scheduled_date || 'TBD'} {content.scheduled_time || ''}</p>
            <p>AI Cost: ${content.ai_cost?.toFixed(4) || '0.0000'}</p>
            {content.approved_by && <p>Approved by: {content.approved_by} at {content.approved_at}</p>}
          </div>

          <div className="flex gap-2 pt-3 border-t flex-wrap">
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Copy</Button>
            )}
            {content.image_prompt && !content.image_url && !editing && (
              <Button size="sm" variant="outline" onClick={handleGenerateImage} disabled={generatingImage}>
                {generatingImage ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</> : <><ImageIcon className="w-4 h-4 mr-1" /> Generate HD Image</>}
              </Button>
            )}
            {content.image_prompt && content.image_url && !editing && (
              <Button size="sm" variant="outline" onClick={handleGenerateImage} disabled={generatingImage}>
                {generatingImage ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-4 h-4 mr-1" /> Regenerate</>}
              </Button>
            )}
            {content.status === 'pending_review' && (
              <Button size="sm" onClick={handleApprove}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
