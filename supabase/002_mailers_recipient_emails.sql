-- Add recipient_emails array to mailers so the send-history detail
-- view can show who received each mailer. Simple text[] is fine at
-- ExtonSports scale (< 1000 subscribers). At larger scale this
-- would move to a mailer_recipients join table.
alter table public.mailers
  add column if not exists recipient_emails text[] not null default '{}';
