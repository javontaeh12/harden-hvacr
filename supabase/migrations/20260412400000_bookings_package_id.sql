-- Add package_id to bookings so we track which service package the customer selected
alter table bookings add column if not exists package_id uuid references service_packages(id);
alter table bookings add column if not exists package_name text;
alter table bookings add column if not exists package_price numeric(10,2);
