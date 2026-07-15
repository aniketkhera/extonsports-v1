-- Adds unique-visitor + user-agent capture to the shared Mailers `visits` log.
--
-- Motivation: a "visit" was one row per page LOAD with no dedup, and bot
-- exclusion was user-agent-substring only, so daily totals conflated page
-- views, repeat loads, and UA-spoofing scrapers into one inflated number.
--
--   visitor_hash — salted daily SHA-256 of ip+ua written by mailer-admin's
--                  /api/track. NOT a raw IP; rotates each ET day so a person
--                  is unlinkable across days. Lets reports count UNIQUE
--                  visitors (distinct hash) and detect scraper floods.
--   user_agent   — truncated UA string, so bots can be reclassified later.
--
-- Idempotent. Run against the SHARED Mailers Supabase project (the one the
-- marketing sites + portfolio-digest read). PEAC has its OWN db — run the same
-- two ALTERs there too (peac-v1/supabase) so the digest's PEAC source resolves.

alter table public.visits add column if not exists user_agent   text;
alter table public.visits add column if not exists visitor_hash text;

-- "Distinct visitors / their page loads for a property today" — the unique
-- visitor + flood-detection query.
create index if not exists visits_property_visitor_hash_idx
  on public.visits (property, visitor_hash, created_at desc)
  where is_bot = false and visitor_hash is not null;
