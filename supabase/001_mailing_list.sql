-- Shared mailing-list schema for all property sites.
-- Lives in a single dedicated Supabase project (not Orangish).
-- Each property (extonsports, squashtigers, excelcricket,
-- smashshuttler) writes its own rows using its SITE_PROPERTY
-- env var. Separation is enforced at the query level — every
-- route filters WHERE property = $SITE_PROPERTY. RLS is on with
-- no policies (service role bypasses it; anon gets nothing).
--
-- Adding a new property: just start writing rows with a new
-- property value. No migration needed.

-- ── subscribers ──────────────────────────────────────────────────
create table if not exists public.subscribers (
  id                uuid        primary key default gen_random_uuid(),
  -- Which property site this subscriber belongs to.
  -- e.g. 'extonsports' | 'squashtigers' | 'excelcricket' | 'smashshuttler'
  property          text        not null,
  email             text        not null,
  first_name        text,
  last_name         text,
  source            text,
  tags              text[]      not null default '{}',
  subscribed_at     timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  -- Per-recipient token interpolated into each mailer's unsubscribe
  -- link. Globally unique UUID so no two subscribers share a token
  -- even across properties.
  unsubscribe_token text        not null unique default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  -- One person can be on multiple property lists. Within a single
  -- property, email must be unique.
  unique (property, email)
);

-- "Show me active subscribers for this property" — the most common
-- admin query.
create index if not exists subscribers_property_active_idx
  on public.subscribers (property, subscribed_at desc)
  where unsubscribed_at is null;

create index if not exists subscribers_property_idx on public.subscribers (property);
create index if not exists subscribers_source_idx   on public.subscribers (property, source);
create index if not exists subscribers_tags_idx     on public.subscribers using gin (tags);
-- unsubscribe_token lookup (public /unsubscribe route). Already
-- covered by the UNIQUE constraint which auto-creates an index.

-- ── mailers ──────────────────────────────────────────────────────
create table if not exists public.mailers (
  id              uuid        primary key default gen_random_uuid(),
  property        text        not null,
  subject         text        not null,
  body_md         text        not null,
  body_html       text        not null,
  sent_at         timestamptz not null default now(),
  sent_by_email   text        not null,
  recipient_count int         not null,
  filter_json     jsonb       not null default '{}'::jsonb,
  send_errors     jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists mailers_property_sent_idx on public.mailers (property, sent_at desc);

-- ── RLS ──────────────────────────────────────────────────────────
-- Service role (used by all admin + public routes server-side)
-- bypasses RLS. Anon key gets nothing — defense in depth.
alter table public.subscribers enable row level security;
alter table public.mailers     enable row level security;

-- ── Storage bucket for mailer images ─────────────────────────────
-- Public-read so images render in email clients without auth.
-- Admin (service role) is the only writer.
insert into storage.buckets (id, name, public)
values ('mailer-images', 'mailer-images', true)
on conflict (id) do nothing;
