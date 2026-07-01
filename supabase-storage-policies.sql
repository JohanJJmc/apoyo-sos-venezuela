insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexo-photos',
  'nexo-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "nexo photos public read" on storage.objects;
drop policy if exists "nexo photos authenticated upload" on storage.objects;
drop policy if exists "nexo photos owner update" on storage.objects;
drop policy if exists "nexo photos owner delete" on storage.objects;

create policy "nexo photos public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'nexo-photos');

create policy "nexo photos authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'nexo-photos');

create policy "nexo photos owner update"
on storage.objects for update
to authenticated
using (bucket_id = 'nexo-photos' and owner = auth.uid())
with check (bucket_id = 'nexo-photos' and owner = auth.uid());

create policy "nexo photos owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'nexo-photos' and owner = auth.uid());
