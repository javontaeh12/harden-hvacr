'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarContent {
  id: string;
  campaign_id: string;
  content_type: string;
  platform: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  headline: string | null;
  body_copy: string | null;
  variant_label: string | null;
  marketing_campaigns: { name: string; campaign_type: string } | null;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  google_ads: 'GA',
  email: 'EM',
  website: 'WEB',
};

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  pending_review: 'bg-yellow-400',
  approved: 'bg-green-400',
  scheduled: 'bg-blue-400',
  published: 'bg-purple-400',
  rejected: 'bg-red-400',
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ContentCalendar({ onSelectContent }: { onSelectContent: (id: string) => void }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [content, setContent] = useState<CalendarContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [weekStart]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const ws = weekStart.toISOString().split('T')[0];
      const res = await fetch(`/api/marketing/content?week_start=${ws}`);
      const data = await res.json();
      setContent(Array.isArray(data) ? data : []);
    } catch {
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // Group content by day
  const days: CalendarContent[][] = Array.from({ length: 7 }, () => []);
  for (const item of content) {
    if (!item.scheduled_date) continue;
    const d = new Date(item.scheduled_date + 'T00:00:00');
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
    if (dayIdx >= 0 && dayIdx < 7) days[dayIdx].push(item);
  }

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{formatWeekRange()}</span>
          <Button size="sm" variant="outline" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((name, i) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const dateStr = dayDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

            return (
              <div key={i} className="min-h-[120px]">
                <div className="text-xs font-medium text-gray-500 mb-1 text-center">
                  {name} <span className="text-gray-400">{dateStr}</span>
                </div>
                <div className="space-y-1">
                  {days[i].length === 0 ? (
                    <div className="text-xs text-gray-300 text-center py-4">—</div>
                  ) : (
                    days[i].map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onSelectContent(item.id)}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[item.status] || STATUS_DOT.draft}`} />
                            <span className="text-[10px] font-bold text-gray-500">{PLATFORM_ICONS[item.platform] || item.platform}</span>
                            {item.variant_label && (
                              <span className="text-[10px] font-bold text-purple-500">{item.variant_label}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-800 line-clamp-2">{item.headline || item.body_copy?.slice(0, 50) || 'Draft'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.scheduled_time || ''} {item.content_type}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
