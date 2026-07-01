alter table public.requests
add column if not exists resolved_at timestamptz;

create index if not exists requests_resolved_at_idx on public.requests(resolved_at)
where status = 'resolved';
