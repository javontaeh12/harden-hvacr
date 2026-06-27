'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Trophy,
  Medal,
  Star,
  Zap,
  Target,
  Award,
  Plus,
  Crown,
} from 'lucide-react';

interface TechPoint {
  id: string;
  tech_id: string;
  type: string;
  points: number;
  description: string | null;
  work_order_id: string | null;
  created_at: string;
}

interface TechBadge {
  id: string;
  tech_id: string;
  badge_type: string;
  earned_at: string;
}

interface TechProfile {
  id: string;
  full_name: string | null;
  role: string;
}

interface WorkOrder {
  id: string;
  assigned_tech_id: string | null;
  status: string;
  completed_at: string | null;
}

const BADGE_CONFIG: Record<string, { label: string; icon: typeof Trophy; color: string }> = {
  first_job: { label: 'First Job', icon: Star, color: 'text-blue-500' },
  ten_jobs: { label: '10 Jobs', icon: Target, color: 'text-green-500' },
  fifty_jobs: { label: '50 Jobs', icon: Medal, color: 'text-purple-500' },
  hundred_jobs: { label: '100 Jobs', icon: Crown, color: 'text-yellow-500' },
  perfect_week: { label: 'Perfect Week', icon: Zap, color: 'text-orange-500' },
  top_performer: { label: 'Top Performer', icon: Trophy, color: 'text-red-500' },
  upsell_king: { label: 'Upsell King', icon: Award, color: 'text-indigo-500' },
};

export default function LeaderboardPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [techPoints, setTechPoints] = useState<TechPoint[]>([]);
  const [techBadges, setTechBadges] = useState<TechBadge[]>([]);
  const [techs, setTechs] = useState<TechProfile[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwardOpen, setIsAwardOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'all'>('month');

  const [form, setForm] = useState({
    tech_id: '', type: 'bonus', points: 0, description: '',
  });

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [pointsRes, badgesRes, techsRes, woRes] = await Promise.all([
      supabase.from('tech_points').select('*').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('tech_badges').select('*').eq('group_id', groupId!),
      supabase.from('profiles').select('id, full_name, role').eq('group_id', groupId!).eq('status', 'approved'),
      supabase.from('work_orders').select('id, assigned_tech_id, status, completed_at').eq('group_id', groupId!),
    ]);
    setTechPoints(pointsRes.data || []);
    setTechBadges(badgesRes.data || []);
    setTechs(techsRes.data || []);
    setWorkOrders(woRes.data || []);
    setIsLoading(false);
  };

  const dateFilter = useMemo(() => {
    const now = new Date();
    if (timeRange === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (timeRange === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    }
    return new Date(0);
  }, [timeRange]);

  const leaderboard = useMemo(() => {
    const map = new Map<string, { name: string; points: number; jobsCompleted: number; badges: TechBadge[] }>();

    techs.forEach((tech) => {
      map.set(tech.id, { name: tech.full_name || 'Unknown', points: 0, jobsCompleted: 0, badges: [] });
    });

    techPoints.filter((tp) => new Date(tp.created_at) >= dateFilter).forEach((tp) => {
      const entry = map.get(tp.tech_id);
      if (entry) entry.points += tp.points;
    });

    workOrders.filter((wo) => wo.status === 'completed' && wo.completed_at && new Date(wo.completed_at) >= dateFilter).forEach((wo) => {
      if (wo.assigned_tech_id) {
        const entry = map.get(wo.assigned_tech_id);
        if (entry) entry.jobsCompleted++;
      }
    });

    techBadges.forEach((badge) => {
      const entry = map.get(badge.tech_id);
      if (entry) entry.badges.push(badge);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.points - a.points || b.jobsCompleted - a.jobsCompleted);
  }, [techs, techPoints, workOrders, techBadges, dateFilter]);

  const awardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !form.tech_id) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('tech_points').insert({
      tech_id: form.tech_id,
      type: form.type,
      points: form.points,
      description: form.description || null,
      group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setTechPoints([data, ...techPoints]);
      setIsAwardOpen(false);
      setForm({ tech_id: '', type: 'bonus', points: 0, description: '' });
    }
  };

  const awardBadge = async (techId: string, badgeType: string) => {
    if (!groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('tech_badges').insert({
      tech_id: techId, badge_type: badgeType, group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setTechBadges([...techBadges, data]);
    }
  };

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tech Leaderboard</h1>
          <p className="text-gray-600 mt-1">Performance rankings & incentives</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['month', 'quarter', 'all'] as const).map((range) => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {range === 'month' ? 'This Month' : range === 'quarter' ? 'Quarter' : 'All Time'}
              </button>
            ))}
          </div>
          {profile?.role === 'admin' && (
            <Button onClick={() => setIsAwardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Award Points
            </Button>
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 1 && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 0, 2].map((idx) => {
            const tech = leaderboard[idx];
            if (!tech) return <div key={idx} />;
            const podiumConfig = [
              { bg: 'bg-yellow-50 border-yellow-200', icon: Crown, iconColor: 'text-yellow-500', label: '1st' },
              { bg: 'bg-gray-50 border-gray-200', icon: Medal, iconColor: 'text-gray-400', label: '2nd' },
              { bg: 'bg-orange-50 border-orange-200', icon: Medal, iconColor: 'text-orange-400', label: '3rd' },
            ][idx];
            return (
              <Card key={tech.id} className={`${podiumConfig.bg} border-2 ${idx === 0 ? 'row-start-1' : ''}`}>
                <CardContent className={`text-center ${idx === 0 ? 'pt-8 pb-6' : 'pt-6 pb-4'}`}>
                  <podiumConfig.icon className={`w-8 h-8 mx-auto mb-2 ${podiumConfig.iconColor}`} />
                  <p className="text-xs text-gray-500 mb-1">{podiumConfig.label}</p>
                  <p className={`font-bold text-gray-900 ${idx === 0 ? 'text-lg' : 'text-base'}`}>{tech.name}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{tech.points.toLocaleString()} pts</p>
                  <p className="text-sm text-gray-500 mt-1">{tech.jobsCompleted} jobs</p>
                  {tech.badges.length > 0 && (
                    <div className="flex gap-1 justify-center mt-2 flex-wrap">
                      {tech.badges.map((b) => {
                        const conf = BADGE_CONFIG[b.badge_type];
                        return conf ? (
                          <span key={b.id} className="text-xs px-1.5 py-0.5 rounded bg-white shadow-sm" title={conf.label}>
                            <conf.icon className={`w-3 h-3 inline ${conf.color}`} />
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Rankings */}
      <Card>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data yet</h3>
              <p className="text-gray-600">Award points to techs to start the leaderboard</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaderboard.map((tech, i) => (
                <div key={tech.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{tech.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        {tech.badges.map((b) => {
                          const conf = BADGE_CONFIG[b.badge_type];
                          return conf ? (
                            <span key={b.id} className="text-xs px-1.5 py-0.5 rounded bg-gray-100" title={conf.label}>
                              <conf.icon className={`w-3 h-3 inline ${conf.color}`} /> {conf.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm text-gray-500">Points</p>
                      <p className="font-bold text-blue-600">{tech.points.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Jobs</p>
                      <p className="font-bold text-gray-900">{tech.jobsCompleted}</p>
                    </div>
                    {profile?.role === 'admin' && (
                      <div className="flex gap-1">
                        {Object.entries(BADGE_CONFIG)
                          .filter(([key]) => !tech.badges.some((b) => b.badge_type === key))
                          .slice(0, 2)
                          .map(([key, conf]) => (
                            <button key={key} onClick={() => awardBadge(tech.id, key)} className="p-1 rounded hover:bg-gray-200" title={`Award ${conf.label}`}>
                              <conf.icon className={`w-4 h-4 ${conf.color}`} />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Award Points Modal */}
      <Modal isOpen={isAwardOpen} onClose={() => setIsAwardOpen(false)} title="Award Points to Tech">
        <form onSubmit={awardPoints} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select value={form.tech_id} onChange={(e) => setForm({ ...form, tech_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select tech...</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="job_completed">Job Completed</option>
              <option value="five_star">5-Star Review</option>
              <option value="upsell">Upsell</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <Input label="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} required />
          <Input label="Description" placeholder="Reason..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAwardOpen(false)}>Cancel</Button>
            <Button type="submit">Award Points</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
