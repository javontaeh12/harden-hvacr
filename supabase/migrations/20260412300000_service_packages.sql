-- Service packages: pre-made bundles for each service type
create table if not exists service_packages (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  name text not null,
  description text,
  includes jsonb not null default '[]'::jsonb,
  price numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for quick lookup by service type
create index if not exists idx_service_packages_service_type on service_packages(service_type);

-- Auto-update updated_at
create or replace function update_service_packages_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_service_packages_updated_at
  before update on service_packages
  for each row
  execute function update_service_packages_timestamp();

-- RLS
alter table service_packages enable row level security;

-- Public can read active packages
create policy "Public can read active packages"
  on service_packages for select
  using (is_active = true);

-- Authenticated users can manage
create policy "Authenticated users can manage packages"
  on service_packages for all
  using (auth.role() = 'authenticated');
