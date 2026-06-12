create extension if not exists "uuid-ossp";

create table documents (

    id uuid primary key
    default uuid_generate_v4(),

    owner_id uuid not null
    references auth.users(id)
    on delete cascade,

    title text not null,

    original_file_url text not null,

    signed_file_url text,

    status text not null
    default 'draft',

    created_at timestamptz
    default now(),

    updated_at timestamptz
    default now()
);