create table if not exists public.user_safety_status (
  user_id text primary key,
  violation_count integer not null default 0,
  blocked boolean not null default false,
  last_reason text,
  updated_at timestamptz not null default now()
);

alter table public.user_safety_status enable row level security;

drop policy if exists "users read own safety status" on public.user_safety_status;
drop policy if exists "users insert own safety status" on public.user_safety_status;
drop policy if exists "users update own safety status" on public.user_safety_status;

create policy "users read own safety status"
on public.user_safety_status for select
to authenticated
using (user_id = auth.uid()::text);

create policy "users insert own safety status"
on public.user_safety_status for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy "users update own safety status"
on public.user_safety_status for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

create or replace function public.record_safety_violation(target_user_id text, reason_text text)
returns public.user_safety_status
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status public.user_safety_status;
begin
  if auth.uid() is null or target_user_id <> auth.uid()::text then
    raise exception 'No autorizado.';
  end if;

  insert into public.user_safety_status (user_id, violation_count, blocked, last_reason, updated_at)
  values (target_user_id, 1, false, reason_text, now())
  on conflict (user_id)
  do update set
    violation_count = public.user_safety_status.violation_count + 1,
    blocked = public.user_safety_status.violation_count + 1 >= 6,
    last_reason = reason_text,
    updated_at = now()
  returning * into next_status;

  return next_status;
end;
$$;

revoke all on function public.record_safety_violation(text, text) from public;
grant execute on function public.record_safety_violation(text, text) to authenticated;
