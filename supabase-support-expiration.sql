alter table public.support_reports
drop constraint if exists support_reports_status_check;

alter table public.support_reports
add constraint support_reports_status_check
check (status in ('pending_confirmation', 'confirmed', 'rejected', 'partial', 'expired'));

create index if not exists support_reports_pending_created_at_idx
on public.support_reports(created_at)
where status = 'pending_confirmation';
