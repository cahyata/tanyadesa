-- Skema database TanyaDesa (Supabase / PostgreSQL).
-- Jalankan sekali di SQL Editor proyek Supabase Anda, lalu `npm run ingest` untuk mengisi 49 SOP.

create extension if not exists vector with schema extensions;

-- Satu baris per layanan. `content` berisi markdown SOP (judul, ringkasan, bagian "## ...").
create table if not exists public.sop_services (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  name       text not null,
  content    text not null,
  category   text not null default 'Layanan umum',
  keywords   text not null default '',
  updated_at timestamptz not null default now()
);
create unique index if not exists sop_services_slug_key on public.sop_services (slug);
create unique index if not exists sop_services_name_key on public.sop_services (lower(name));

-- Potongan per bagian SOP beserta embedding (gemini-embedding-001, 768 dimensi).
create table if not exists public.sop_chunks (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.sop_services (id) on delete cascade,
  content    text not null,
  embedding  extensions.vector(768)
);
create index if not exists sop_chunks_service_idx on public.sop_chunks (service_id);
create index if not exists sop_chunks_embedding_idx on public.sop_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Pertanyaan yang tidak bisa dijawab (daftar kerja admin).
create table if not exists public.unanswered_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  created_at timestamptz not null default now(),
  ignored    boolean not null default false
);

-- Setiap pertanyaan beserta hasilnya (tanpa identitas) dan penilaian jempol.
create table if not exists public.question_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question   text not null,
  answer     text,
  outcome    text not null check (outcome in ('answered', 'clarify', 'refused')),
  service    text,
  rating     smallint check (rating in (-1, 1)),
  rated_at   timestamptz
);
create index if not exists question_log_created_idx on public.question_log (created_at desc);
create index if not exists question_log_rating_idx on public.question_log (rating) where rating is not null;

-- Semua tabel hanya diakses server dengan service role key. RLS aktif tanpa kebijakan,
-- jadi kunci anon tidak bisa membaca atau menulis apa pun.
alter table public.sop_services          enable row level security;
alter table public.sop_chunks            enable row level security;
alter table public.unanswered_questions  enable row level security;
alter table public.question_log          enable row level security;

-- Pencarian kemiripan: potongan SOP terdekat dengan vektor pertanyaan.
create or replace function public.match_sop_chunks(query_embedding extensions.vector, match_count integer default 5)
returns table (id uuid, service_id uuid, service_name text, content text, similarity double precision)
language sql
stable
set search_path to 'public', 'extensions'
as $$
  select c.id, c.service_id, s.name, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.sop_chunks c
  join public.sop_services s on s.id = c.service_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
