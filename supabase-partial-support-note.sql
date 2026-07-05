alter table public.requests
add column if not exists partial_note text;

alter table public.support_reports
add column if not exists partial_note text;

notify pgrst, 'reload schema';
