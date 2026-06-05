-- Region (US state / subdivision) for subscribers.
-- Vercel's x-vercel-ip-country-region header resolves far more reliably
-- than city, and for a local club the state (PA / NJ / DE / out-of-state)
-- is the more actionable cut. Value is the ISO 3166-2 subdivision code,
-- e.g. "PA", "NJ", "CA".

alter table public.subscribers
  add column if not exists region text;

create index if not exists subscribers_region_idx
  on public.subscribers (property, region)
  where region is not null;
