-- Hire-a-Guide Phase 1 (3/5) — sensitive document storage (insurance COI, cert cards).
-- Unlike route/topo photos, these are private personal documents: private bucket,
-- signed URLs only, never a public storage_path.

create table guide_documents (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guide_profiles(id) on delete cascade,
  credential_id uuid references guide_credentials(id) on delete set null,
  doc_type text not null check (doc_type in ('insurance_coi','cert_card')),
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index guide_documents_guide_idx on guide_documents(guide_id);

alter table guide_documents enable row level security;
create policy "guide_documents read own or admin" on guide_documents for select
  using (guide_id = auth.uid() or is_admin(auth.uid()));
create policy "guide_documents self insert" on guide_documents for insert
  with check (guide_id = auth.uid());
create policy "guide_documents admin update" on guide_documents for update
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
  values ('guide-documents', 'guide-documents', false)
  on conflict (id) do nothing;

-- Path convention: {auth.uid()}/{doc_type}/{uuid}-{filename} -- ownership is just the
-- first path segment, so (storage.foldername(name))[1] is the uploader's own id.
create policy "guide_documents storage read own or admin" on storage.objects for select
  using (
    bucket_id = 'guide-documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_admin(auth.uid()))
  );
create policy "guide_documents storage insert own" on storage.objects for insert
  with check (
    bucket_id = 'guide-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
-- Update/delete on the actual files is admin-only -- a guide replacing a document
-- uploads a new object; the admin discards the old one as part of review/retention.
create policy "guide_documents storage admin write" on storage.objects for update
  using (bucket_id = 'guide-documents' and is_admin(auth.uid()));
create policy "guide_documents storage admin delete" on storage.objects for delete
  using (bucket_id = 'guide-documents' and is_admin(auth.uid()));
