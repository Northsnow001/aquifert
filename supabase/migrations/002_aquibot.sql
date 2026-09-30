-- Aquibot engine: knowledge index (pgvector), chat sessions, monthly usage and logs.
-- Every table is reached only through the service-role key on the server, so RLS is
-- enabled with no policies for anon or authenticated users.

create extension if not exists vector;

create table if not exists public.aquibot_documents (
  id text primary key,
  source_type text not null check (source_type in ('telex', 'file')),
  source_id text not null,
  title text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  access text not null default 'public' check (access in ('public', 'growth', 'enterprise')),
  status text not null default 'pending' check (status in ('pending', 'indexed', 'error', 'unsupported')),
  chunk_count integer not null default 0,
  char_count integer not null default 0,
  fingerprint text,
  error text,
  published_at timestamptz,
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aquibot_chunks (
  id bigint generated always as identity primary key,
  document_id text not null references public.aquibot_documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768) not null,
  source_type text not null,
  visibility text not null,
  access text not null default 'public',
  title text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists aquibot_chunks_document_idx on public.aquibot_chunks (document_id, chunk_index);
create index if not exists aquibot_chunks_embedding_idx on public.aquibot_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists public.aquibot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text not null default '',
  user_name text not null default '',
  user_plan text not null default 'core',
  title text not null default 'New chat',
  test_mode boolean not null default false,
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aquibot_sessions_user_idx on public.aquibot_sessions (user_id, updated_at desc);
create index if not exists aquibot_sessions_updated_idx on public.aquibot_sessions (updated_at desc);

create table if not exists public.aquibot_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.aquibot_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aquibot_messages_session_idx on public.aquibot_messages (session_id, id);

create table if not exists public.aquibot_usage (
  user_id text not null,
  month text not null,
  questions integer not null default 0,
  primary key (user_id, month)
);

create table if not exists public.aquibot_logs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('index', 'connection', 'chat')),
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aquibot_logs_created_idx on public.aquibot_logs (created_at desc);

alter table public.aquibot_documents enable row level security;
alter table public.aquibot_chunks enable row level security;
alter table public.aquibot_sessions enable row level security;
alter table public.aquibot_messages enable row level security;
alter table public.aquibot_usage enable row level security;
alter table public.aquibot_logs enable row level security;

create or replace function public.aquibot_match_chunks(
  query_embedding vector(768),
  match_count integer default 150,
  min_published timestamptz default null,
  access_levels text[] default array['public', 'growth', 'enterprise']
)
returns table (
  id bigint,
  document_id text,
  chunk_index integer,
  content text,
  source_type text,
  visibility text,
  access text,
  title text,
  published_at timestamptz,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.source_type,
    c.visibility,
    c.access,
    c.title,
    c.published_at,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.aquibot_chunks c
  where c.access = any (access_levels)
    and (min_published is null or c.published_at is null or c.published_at >= min_published)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.aquibot_increment_usage(p_user text, p_month text)
returns integer
language sql
as $$
  insert into public.aquibot_usage (user_id, month, questions)
  values (p_user, p_month, 1)
  on conflict (user_id, month) do update set questions = public.aquibot_usage.questions + 1
  returning questions;
$$;

revoke execute on function public.aquibot_match_chunks(vector, integer, timestamptz, text[]) from public, anon, authenticated;
revoke execute on function public.aquibot_increment_usage(text, text) from public, anon, authenticated;
