-- Acquisition tracking columns for subscribers.
-- Captures where each signup came from so you can see which channels
-- drive the most registrations (Google, Instagram, WhatsApp share, etc.)
--
-- referrer      — the full URL of the page that linked to extonsports.com
--                 e.g. "https://www.instagram.com/"
-- utm_source    — UTM parameter, e.g. "instagram", "newsletter", "google"
-- utm_medium    — UTM parameter, e.g. "social", "email", "cpc"
-- utm_campaign  — UTM parameter, e.g. "launch", "summer2026"
-- country       — 2-letter ISO country code from Vercel geo header
--                 e.g. "US", "GB", "IN"
-- city          — City name from Vercel geo header, e.g. "West Chester"

alter table public.subscribers
  add column if not exists referrer     text,
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists country      text,
  add column if not exists city         text;

create index if not exists subscribers_utm_source_idx
  on public.subscribers (property, utm_source)
  where utm_source is not null;

create index if not exists subscribers_country_idx
  on public.subscribers (property, country)
  where country is not null;
