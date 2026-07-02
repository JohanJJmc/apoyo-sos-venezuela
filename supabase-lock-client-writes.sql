-- Endurece seguridad despues de mover acciones criticas a /api/request-actions.
-- Mantiene lectura publica para mapa/listas, pero bloquea escrituras directas
-- desde anon/authenticated usando la anon key del navegador.
-- Las APIs serverless con SUPABASE_SERVICE_ROLE_KEY siguen pudiendo escribir.

alter table public.requests enable row level security;
alter table public.support_reports enable row level security;

drop policy if exists "public insert requests" on public.requests;
drop policy if exists "public update requests" on public.requests;
drop policy if exists "public delete requests" on public.requests;
drop policy if exists "public insert support reports" on public.support_reports;
drop policy if exists "public update support reports" on public.support_reports;
drop policy if exists "public delete support reports" on public.support_reports;

drop policy if exists "server only insert requests" on public.requests;
drop policy if exists "server only update requests" on public.requests;
drop policy if exists "server only delete requests" on public.requests;
drop policy if exists "server only insert support reports" on public.support_reports;
drop policy if exists "server only update support reports" on public.support_reports;
drop policy if exists "server only delete support reports" on public.support_reports;

create policy "server only insert requests"
on public.requests for insert
to anon, authenticated
with check (false);

create policy "server only update requests"
on public.requests for update
to anon, authenticated
using (false)
with check (false);

create policy "server only delete requests"
on public.requests for delete
to anon, authenticated
using (false);

create policy "server only insert support reports"
on public.support_reports for insert
to anon, authenticated
with check (false);

create policy "server only update support reports"
on public.support_reports for update
to anon, authenticated
using (false)
with check (false);

create policy "server only delete support reports"
on public.support_reports for delete
to anon, authenticated
using (false);
