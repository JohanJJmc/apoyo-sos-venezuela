create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "server only read push subscriptions" on public.push_subscriptions;
drop policy if exists "server only insert push subscriptions" on public.push_subscriptions;
drop policy if exists "server only update push subscriptions" on public.push_subscriptions;
drop policy if exists "server only delete push subscriptions" on public.push_subscriptions;

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_endpoint_idx
on public.push_subscriptions(endpoint);
