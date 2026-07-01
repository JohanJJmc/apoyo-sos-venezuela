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
to anon, authenticated
using (true);

create policy "public insert requests"
on public.requests for insert
to anon, authenticated
with check (true);

create policy "public update requests"
on public.requests for update
to anon, authenticated
using (true)
with check (true);

create policy "public delete requests"
on public.requests for delete
to anon, authenticated
using (true);

create policy "public read support reports"
on public.support_reports for select
to anon, authenticated
using (true);

create policy "public insert support reports"
on public.support_reports for insert
to anon, authenticated
with check (true);

create policy "public update support reports"
on public.support_reports for update
to anon, authenticated
using (true)
with check (true);

create policy "public delete support reports"
on public.support_reports for delete
to anon, authenticated
using (true);

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
