create table document_recipients (

    id uuid primary key
    default uuid_generate_v4(),

    document_id uuid
    references documents(id)
    on delete cascade,

    email text not null,

    signing_order integer,

    status text
    default 'pending',

    signed_at timestamptz
);