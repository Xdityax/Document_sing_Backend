create table signatures (

    id uuid primary key
    default uuid_generate_v4(),

    document_id uuid not null
    references documents(id)
    on delete cascade,

    signer_id uuid
    references auth.users(id),

    signer_email text not null,

    signature_url text,

    ip_address text,

    signed_at timestamptz,

    created_at timestamptz
    default now()
);