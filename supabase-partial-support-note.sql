alter table public.requests
add column if not exists partial_note text;
