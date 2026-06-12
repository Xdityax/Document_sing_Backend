alter table documents
enable row level security;

create policy "owner_can_view_document"
on documents
for select
using (
  auth.uid() = owner_id
);

create policy "owner_can_insert_document"
on documents
for insert
with check (
  auth.uid() = owner_id
);

create policy "owner_can_update_document"
on documents
for update
using (
  auth.uid() = owner_id
);