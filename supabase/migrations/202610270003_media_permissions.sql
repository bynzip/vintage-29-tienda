-- Las URLs de archivos del bucket siguen siendo públicas. Enumerar la biblioteca
-- y borrar objetos exige una sesión administrativa y el flujo de eliminación.
drop policy "Public Access catalog-media" on storage.objects;
create policy "Admins list catalog-media" on storage.objects for select to authenticated
using (bucket_id='catalog-media' and public.is_active_admin());
drop policy "Admin Delete catalog-media" on storage.objects;
create policy "Admin Delete catalog-media" on storage.objects for delete to authenticated
using (bucket_id='catalog-media' and public.is_active_admin() and (
  not exists(select 1 from public.media_assets m where m.file_path=name and m.bucket_id='catalog-media')
  or exists(select 1 from public.media_assets m where m.file_path=name and m.bucket_id='catalog-media' and m.deleting_at is not null)
));
revoke update,delete on public.media_assets from authenticated;
