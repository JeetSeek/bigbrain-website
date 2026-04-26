-- P1 (walkthrough 2026-04-21): table to capture dead manufacturer URLs
-- observed during live Download/Preview clicks. The check-manual-link
-- edge function inserts one row per failure; burrows1980@yahoo.co.uk can
-- then triage + replace URLs (medium-term plan: self-host PDFs in
-- Supabase Storage, see docs/user-walkthrough-2026-04-21.md).

create table if not exists public.bb_manual_link_issues (
  id            bigserial primary key,
  manual_id     uuid,                       -- FK-shaped, not enforced (boiler_manuals.id is uuid; bb_manuals may differ)
  url           text not null,
  http_status   int,                        -- null => timeout / network error
  error_message text,
  observed_at   timestamptz not null default now()
);

-- Fast triage query: most recent dead URLs per manual.
create index if not exists bb_manual_link_issues_manual_id_idx
  on public.bb_manual_link_issues (manual_id, observed_at desc);

create index if not exists bb_manual_link_issues_observed_at_idx
  on public.bb_manual_link_issues (observed_at desc);

-- RLS: the edge function uses the service_role key so it bypasses RLS.
-- Anon/authenticated should not read or write this table directly.
alter table public.bb_manual_link_issues enable row level security;

-- No policies granted => only service_role can access.
-- (Intentionally no SELECT-for-admin policy here; admin dashboard can hit
--  this table via a SECURITY DEFINER RPC in a later migration.)

comment on table public.bb_manual_link_issues is
  'Dead manufacturer URLs observed on Manuals Download/Preview clicks. Populated by the check-manual-link edge function. See docs/user-walkthrough-2026-04-21.md P1.';
