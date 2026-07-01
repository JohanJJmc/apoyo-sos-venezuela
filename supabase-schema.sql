create extension if not exists pgcrypto;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  item text not null,
  quantity integer not null check (quantity > 0),
  description text,
  photo_url text,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  partial_support boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by text not null default 'local-user',
  requester_name text,
  requester_phone text,
  requester_anonymous boolean not null default false,
  address text
);

alter table public.requests
add column if not exists resolved_at timestamptz;

create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  supporter_id text not null default 'local-user',
  supporter_name text,
  supporter_phone text,
  details text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  anonymous boolean not null default false,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'rejected', 'partial')),
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;
alter table public.support_reports enable row level security;

drop policy if exists "public read requests" on public.requests;
drop policy if exists "public insert requests" on public.requests;
drop policy if exists "public update requests" on public.requests;
drop policy if exists "public delete requests" on public.requests;
drop policy if exists "public read support reports" on public.support_reports;
drop policy if exists "public insert support reports" on public.support_reports;
drop policy if exists "public update support reports" on public.support_reports;
drop policy if exists "public delete support reports" on public.support_reports;

create policy "public read requests"
on public.requests for select
to anon
using (true);

create policy "public insert requests"
on public.requests for insert
to anon
with check (true);

create policy "public update requests"
on public.requests for update
to anon
using (true)
with check (true);

create policy "public delete requests"
on public.requests for delete
to anon
using (true);

create policy "public read support reports"
on public.support_reports for select
to anon
using (true);

create policy "public insert support reports"
on public.support_reports for insert
to anon
with check (true);

create policy "public update support reports"
on public.support_reports for update
to anon
using (true)
with check (true);

create policy "public delete support reports"
on public.support_reports for delete
to anon
using (true);

create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_category_idx on public.requests(category);
create index if not exists requests_created_at_idx on public.requests(created_at desc);
create index if not exists requests_resolved_at_idx on public.requests(resolved_at)
where status = 'resolved';
create index if not exists support_reports_request_id_idx on public.support_reports(request_id);

create or replace function public.delete_resolved_requests_after_48_hours()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.requests
  where status = 'resolved'
    and resolved_at is not null
    and resolved_at < now() - interval '48 hours';
$$;

create or replace function public.delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Debes iniciar sesión para eliminar la cuenta.';
  end if;

  delete from public.support_reports
  where supporter_id = current_user_id::text;

  delete from public.requests
  where created_by = current_user_id::text;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user_account() from public;
grant execute on function public.delete_current_user_account() to authenticated;
