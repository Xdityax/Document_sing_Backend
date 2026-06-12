create table audit_logs (

    id uuid primary key
    default uuid_generate_v4(),

    document_id uuid
    references documents(id)
    on delete cascade,

    user_id uuid
    references auth.users(id),

    action text not null,

    metadata jsonb,

    created_at timestamptz
    default now()
);