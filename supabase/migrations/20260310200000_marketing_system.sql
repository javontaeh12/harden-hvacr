-- Marketing System Tables
-- 4 tables for autonomous marketing campaign management

-- 1. marketing_campaigns
create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  campaign_type text not null check (campaign_type in ('seasonal', 'weather_reactive', 'promotion', 'awareness', 'retention', 'referral')),
  target_services text[] default '{}',
  target_platforms text[] default '{}',
  target_audience text,
  start_date date,
  end_date date,
  budget numeric(10,2),
  performance_data jsonb default '{}',
  ai_cost numeric(10,4) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table marketing_campaigns enable row level security;

create policy "Admin can view marketing campaigns"
  on marketing_campaigns for select
  using (true);

create policy "Service role full access to marketing campaigns"
  on marketing_campaigns for all
  using (true)
  with check (true);

-- 2. marketing_content
create table if not exists marketing_content (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references marketing_campaigns(id) on delete cascade,
  content_type text not null check (content_type in ('post', 'ad', 'story', 'reel_script', 'email', 'blog')),
  platform text not null check (platform in ('facebook', 'instagram', 'google_ads', 'email', 'website')),
  scheduled_date date,
  scheduled_time text,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'scheduled', 'published', 'rejected')),
  headline text,
  body_copy text,
  cta text,
  hashtags text[] default '{}',
  image_prompt text,
  image_url text,
  creative_brief jsonb default '{}',
  ad_targeting jsonb default '{}',
  variant_label text,
  parent_content_id uuid references marketing_content(id) on delete set null,
  rejection_reason text,
  approved_by text,
  approved_at timestamptz,
  ai_cost numeric(10,4) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table marketing_content enable row level security;

create policy "Admin can view marketing content"
  on marketing_content for select
  using (true);

create policy "Service role full access to marketing content"
  on marketing_content for all
  using (true)
  with check (true);

-- 3. marketing_calendar
create table if not exists marketing_calendar (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  campaign_id uuid references marketing_campaigns(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  platform text not null,
  content_id uuid references marketing_content(id) on delete set null,
  slot_label text,
  notes text,
  created_at timestamptz default now()
);

alter table marketing_calendar enable row level security;

create policy "Admin can view marketing calendar"
  on marketing_calendar for select
  using (true);

create policy "Service role full access to marketing calendar"
  on marketing_calendar for all
  using (true)
  with check (true);

-- 4. marketing_triggers
create table if not exists marketing_triggers (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('weather', 'seasonal', 'performance', 'manual')),
  name text not null,
  conditions jsonb default '{}',
  campaign_template jsonb default '{}',
  is_active boolean default true,
  last_fired_at timestamptz,
  cooldown_hours integer default 48,
  created_at timestamptz default now()
);

alter table marketing_triggers enable row level security;

create policy "Admin can view marketing triggers"
  on marketing_triggers for select
  using (true);

create policy "Service role full access to marketing triggers"
  on marketing_triggers for all
  using (true)
  with check (true);

-- Indexes
create index idx_marketing_campaigns_status on marketing_campaigns(status);
create index idx_marketing_content_campaign on marketing_content(campaign_id);
create index idx_marketing_content_status on marketing_content(status);
create index idx_marketing_content_scheduled on marketing_content(scheduled_date);
create index idx_marketing_calendar_week on marketing_calendar(week_start);
create index idx_marketing_triggers_active on marketing_triggers(is_active) where is_active = true;

-- Updated_at trigger (reuse existing function if available, otherwise create)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_marketing_campaigns_updated_at
  before update on marketing_campaigns
  for each row execute function update_updated_at_column();

create trigger update_marketing_content_updated_at
  before update on marketing_content
  for each row execute function update_updated_at_column();
