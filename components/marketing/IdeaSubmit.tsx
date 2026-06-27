'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { Lightbulb, Send, Sparkles } from 'lucide-react';

interface IdeaSubmitProps {
  campaigns: { id: string; name: string }[];
  onSubmitted: () => void;
}

export default function IdeaSubmit({ campaigns, onSubmitted }: IdeaSubmitProps) {
  const [idea, setIdea] = useState({
    campaign_id: '',
    platform: 'facebook',
    content_type: 'post',
    scheduled_date: '',
    scheduled_time: '09:00',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Create content entry with the admin's idea as the body_copy placeholder
      // The AI copywriter will enhance it when the content pipeline runs
      const res = await fetch('/api/marketing/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: idea.campaign_id || null,
          platform: idea.platform,
          content_type: idea.content_type,
          scheduled_date: idea.scheduled_date || null,
          scheduled_time: idea.scheduled_time,
          status: 'draft',
          headline: null,
          body_copy: `[ADMIN IDEA] ${idea.notes}`,
          variant_label: 'A',
          creative_brief: { admin_idea: true, original_notes: idea.notes },
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setIdea({ campaign_id: '', platform: 'facebook', content_type: 'post', scheduled_date: '', scheduled_time: '09:00', notes: '' });
        onSubmitted();
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (err) {
      console.error('Failed to submit idea:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Submit a Content Idea
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Idea</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="e.g., Post about our spring AC tune-up special — $49 for first-time customers. Mention the Tallahassee heat coming soon."
              value={idea.notes}
              onChange={(e) => setIdea({ ...idea, notes: e.target.value })}
              required
            />
            <p className="text-xs text-gray-400 mt-1">The AI will turn this into polished copy with hashtags, CTA, and an image.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              label="Platform"
              options={[
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'google_ads', label: 'Google Ads' },
                { value: 'email', label: 'Email' },
              ]}
              value={idea.platform}
              onChange={(e) => setIdea({ ...idea, platform: e.target.value })}
            />
            <Select
              label="Content Type"
              options={[
                { value: 'post', label: 'Post' },
                { value: 'ad', label: 'Ad' },
                { value: 'story', label: 'Story' },
                { value: 'reel_script', label: 'Reel Script' },
                { value: 'email', label: 'Email' },
              ]}
              value={idea.content_type}
              onChange={(e) => setIdea({ ...idea, content_type: e.target.value })}
            />
            <Input
              label="Post Date"
              type="date"
              value={idea.scheduled_date}
              onChange={(e) => setIdea({ ...idea, scheduled_date: e.target.value })}
            />
            <Select
              label="Time"
              options={[
                { value: '08:00', label: '8:00 AM' },
                { value: '09:00', label: '9:00 AM' },
                { value: '10:00', label: '10:00 AM' },
                { value: '11:00', label: '11:00 AM' },
                { value: '12:00', label: '12:00 PM' },
                { value: '14:00', label: '2:00 PM' },
                { value: '17:00', label: '5:00 PM' },
                { value: '19:00', label: '7:00 PM' },
              ]}
              value={idea.scheduled_time}
              onChange={(e) => setIdea({ ...idea, scheduled_time: e.target.value })}
            />
          </div>

          {campaigns.length > 0 && (
            <Select
              label="Link to Campaign (optional)"
              options={[
                { value: '', label: 'No campaign — standalone post' },
                ...campaigns.map(c => ({ value: c.id, label: c.name })),
              ]}
              value={idea.campaign_id}
              onChange={(e) => setIdea({ ...idea, campaign_id: e.target.value })}
            />
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting || !idea.notes.trim()}>
              {submitting ? (
                <><Sparkles className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-1" /> Submit Idea</>
              )}
            </Button>
            {submitted && (
              <span className="text-sm text-green-600 font-medium">Idea submitted! The AI will process it next pipeline run.</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
