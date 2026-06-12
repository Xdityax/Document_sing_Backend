alter table signatures
enable row level security;

create policy "view_signature"
on signatures
for select
using (
  auth.uid() = signer_id
);