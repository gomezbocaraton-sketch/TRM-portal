-- ============================================================
-- STORAGE SETUP
-- Run this in SQL Editor after everything else. Creates the
-- storage bucket that photo/document/estimate/contract uploads
-- go into, plus policies so only admins can read/write it.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "Admins can upload project files"
on storage.objects for insert
with check (bucket_id = 'project-files' and is_admin());

create policy "Admins can read project files"
on storage.objects for select
using (bucket_id = 'project-files' and is_admin());

create policy "Admins can delete project files"
on storage.objects for delete
using (bucket_id = 'project-files' and is_admin());
