create extension if not exists pgcrypto;

create type company_status as enum (
  'apply_now',
  'review_this_week',
  'waiting_for_info',
  'watching',
  'rejected'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  score integer not null check (score between 0 and 100),
  grade text not null,
  status company_status not null default 'waiting_for_info',
  role_fit text not null default '',
  headline text not null default '',
  full_research jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_updates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  summary text not null,
  previous_score integer,
  new_score integer,
  source_note text,
  created_at timestamptz not null default now()
);

create table public.resume_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

alter table public.companies enable row level security;
alter table public.company_updates enable row level security;
alter table public.resume_profiles enable row level security;

create policy "authenticated users can read companies"
  on public.companies for select
  to authenticated
  using (true);

create policy "authenticated users can read company updates"
  on public.company_updates for select
  to authenticated
  using (true);

create policy "users can read their own resume profile"
  on public.resume_profiles for select
  to authenticated
  using (owner_user_id = auth.uid());
