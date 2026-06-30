-- Run this after supabase-schema.sql if pg_cron is available in your Supabase project.
-- It deletes resolved requests 48 hours after they were marked as resolved.

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'delete-resolved-requests-after-48-hours'
  ) then
    perform cron.unschedule('delete-resolved-requests-after-48-hours');
  end if;

  perform cron.schedule(
    'delete-resolved-requests-after-48-hours',
    '0 * * * *',
    'select public.delete_resolved_requests_after_48_hours();'
  );
end $$;
