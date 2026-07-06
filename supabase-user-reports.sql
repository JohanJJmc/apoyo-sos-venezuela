create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  support_report_id uuid references public.support_reports(id) on delete set null,
  reporter_id uuid not null,
  reported_user_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

drop policy if exists "user reports insert own" on public.user_reports;
create policy "user reports insert own"
on public.user_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "user reports read own reporter" on public.user_reports;
create policy "user reports read own reporter"
on public.user_reports
for select
to authenticated
using (reporter_id = auth.uid());

create index if not exists user_reports_request_id_idx on public.user_reports(request_id);
create index if not exists user_reports_reported_user_id_idx on public.user_reports(reported_user_id);
create index if not exists user_reports_created_at_idx on public.user_reports(created_at desc);
