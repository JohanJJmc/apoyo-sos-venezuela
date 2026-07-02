create table if not exists public.rate_limit_windows (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  identifier text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action, identifier, window_start)
);

alter table public.rate_limit_windows enable row level security;

drop policy if exists "rate limits are server only" on public.rate_limit_windows;
create policy "rate limits are server only"
on public.rate_limit_windows
for all
using (false)
with check (false);

create or replace function public.check_rate_limit(
  p_action text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  limit_count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'action is required';
  end if;

  if p_identifier is null or length(trim(p_identifier)) = 0 then
    raise exception 'identifier is required';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit settings';
  end if;

  v_window_start :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_windows as rlw (action, identifier, window_start, count)
  values (p_action, p_identifier, v_window_start, 1)
  on conflict (action, identifier, window_start)
  do update set
    count = rlw.count + 1,
    updated_at = now()
  returning rlw.count into v_count;

  return query select
    v_count <= p_limit,
    v_count,
    p_limit,
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

create index if not exists rate_limit_windows_cleanup_idx
on public.rate_limit_windows (window_start);

create index if not exists support_reports_pending_supporter_idx
on public.support_reports(supporter_id)
where status = 'pending_confirmation';
