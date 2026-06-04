-- ExtonSports mailing list v1.
--
-- Two tables: subscribers (the list) + mailers (audit of what's been sent).
-- Per the architecture decision (see memory/project_extonsports_mailing_list_spec):
--   - This list is per-property (ExtonSports only). No cross-property keys.
--   - Soft-delete via unsubscribed_at — we never DELETE FROM subscribers, even
--     on unsubscribe. Re-imports treat the existing row as known-unsubscribed.
--   - source is freetext ('wix-migration' | 'homepage' | 'manual' | etc.) so
--     we can grow tracking without migrations.

-- ── subscribers ──────────────────────────────────────────────────
create table if not exists public.subscribers (
  id                uuid        primary key default gen_random_uuid(),
  email             text        not null unique,
  first_name        text,
  last_name         text,
  source            text,
  tags              text[]      not null default '{}',
  subscribed_at     timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  -- Per-recipient token interpolated into each mailer's unsubscribe link.
  -- High-entropy UUID so it can't be guessed from another subscriber's link.
  unsubscribe_token text        not null unique default gen_random_uuid()::text,
  created_at        timestamptz not null default now()
);

-- "Show me active subscribers" is the common admin query.
create index if not exists subscribers_active_idx
  on public.subscribers (subscribed_at desc)
  where unsubscribed_at is null;

-- Filtering / search.
create index if not exists subscribers_source_idx on public.subscribers (source);
create index if not exists subscribers_tags_idx   on public.subscribers using gin (tags);

-- ── mailers ──────────────────────────────────────────────────────
-- One row per send. body_md is the canonical source (admin's input);
-- body_html is the compiled-at-send-time HTML, stored so an audit
-- viewer renders exactly what went out (even if the template changes
-- later).
create table if not exists public.mailers (
  id              uuid        primary key default gen_random_uuid(),
  subject         text        not null,
  body_md         text        not null,
  body_html       text        not null,
  sent_at         timestamptz not null default now(),
  sent_by_email   text        not null,
  recipient_count int         not null,
  -- Snapshot of the recipient filter at send time
  -- ({tags?, source?, included_ids?, excluded_ids?}). Used by the
  -- send-history viewer to explain who was targeted.
  filter_json     jsonb       not null default '{}'::jsonb,
  -- Best-effort error log if Resend rejected some batches. Null on
  -- success.
  send_errors     jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists mailers_sent_at_idx on public.mailers (sent_at desc);

-- ── RLS ──────────────────────────────────────────────────────────
-- The admin UI uses the service role key (server-side only), which
-- bypasses RLS. The /unsubscribe public route also uses the service
-- role (server-side). No client ever queries these tables directly.
-- So RLS is on with no policies — any anon/authenticated key gets
-- nothing, service role gets everything. Defense in depth.
alter table public.subscribers enable row level security;
alter table public.mailers     enable row level security;
