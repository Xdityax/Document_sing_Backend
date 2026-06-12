create table signing_links (

    id uuid primary key
    default uuid_generate_v4(),

    document_id uuid not null
    references documents(id)
    on delete cascade,

    token text unique not null,

    recipient_email text not null,

    expires_at timestamptz,

    used boolean
    default false,

    created_at timestamptz
    default now()
);
