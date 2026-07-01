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
