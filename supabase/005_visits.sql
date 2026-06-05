-- Per-visit traffic log. One row per page load (fired by a client beacon
-- → /api/track). Gives per-visitor origin (region/country/referrer) for
-- ALL visitors, not just those who submit the signup form — which the
-- subscribers table only captures.
--
-- Shared across properties via the `property` column, same pattern as
-- subscribers. Bot traffic IS logged here; filter on is_bot when querying.
--
-- Volume note: this grows with traffic. At a coming-soon page's scale
-- that's negligible. If it ever balloons, prune with a periodic
-- `delete from visits where created_at < now() - interval '90 days'`.

create table if not exists public.visits (
  id          uuid        primary key default gen_random_uuid(),
  property    text        not null,
  path        text,
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  country     text,
  region      text,
  city        text,
  device      text,          -- 'mobile' | 'tablet' | 'desktop'
  is_bot      boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- "Visits for this property over time" — the core query.
create index if not exists visits_property_created_idx
  on public.visits (property, created_at desc);

-- "Group human visits by region" — the headline report.
create index if not exists visits_property_region_idx
  on public.visits (property, region)
  where is_bot = false and region is not null;

create index if not exists visits_property_referrer_idx
  on public.visits (property, referrer)
  where is_bot = false;

alter table public.visits enable row level security;
-- Service role (used by /api/track + any admin read) bypasses RLS;
-- anon gets nothing. No public policies on purpose.
