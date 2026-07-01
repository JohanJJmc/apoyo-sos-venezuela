-- Run this after deploying the app version that uses signed URLs.
-- It makes nexo-photos private and prevents public listing/access.

update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'nexo-photos';

drop policy if exists "nexo photos public read" on storage.objects;
drop policy if exists "nexo photos authenticated read" on storage.objects;
drop policy if exists "nexo photos authenticated upload" on storage.objects;
drop policy if exists "nexo photos owner update" on storage.objects;
drop policy if exists "nexo photos owner delete" on storage.objects;

create policy "nexo photos authenticated read"
on storage.objects for select
to authenticated
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
