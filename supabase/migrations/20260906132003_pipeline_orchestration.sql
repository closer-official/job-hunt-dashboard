alter table public.companies
  add column if not exists pipeline_stage text not null default 'notified',
  add column if not exists pipeline_owner text,
  add column if not exists pipeline_locked_by text,
  add column if not exists pipeline_locked_until timestamptz,
  add column if not exists pipeline_started_at timestamptz,
  add column if not exists pipeline_finished_at timestamptz,
  add column if not exists pipeline_last_error text,
  add column if not exists pipeline_attempt_count integer not null default 0,
  add column if not exists pipeline_updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companies_pipeline_stage_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_pipeline_stage_check
      check (pipeline_stage in (
        'new_candidate',
        'fit_review_pending',
        'deep_research_pending',
        'resume_review_pending',
        'publish_pending',
        'notified',
        'rejected',
        'blocked'
      ));
  end if;
end $$;

create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  worker text not null check (worker in ('codex', 'gemini_spark', 'claude_code')),
  from_stage text not null,
  to_stage text,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

alter table public.pipeline_runs enable row level security;

create index if not exists companies_pipeline_stage_idx
  on public.companies (pipeline_stage, pipeline_locked_until, pipeline_updated_at);

create index if not exists pipeline_runs_company_started_idx
  on public.pipeline_runs (company_id, started_at desc);

create or replace function public.claim_pipeline_company(
  p_worker text,
  p_stage text,
  p_lock_minutes integer default 30
)
returns table(run_id uuid, company_id uuid, slug text, name text, pipeline_stage text)
language plpgsql
as $$
declare
  v_company public.companies%rowtype;
  v_run_id uuid;
begin
  if p_worker not in ('codex', 'gemini_spark', 'claude_code') then
    raise exception 'invalid worker: %', p_worker;
  end if;

  update public.companies c
  set
    pipeline_locked_by = p_worker,
    pipeline_locked_until = now() + make_interval(mins => greatest(p_lock_minutes, 5)),
    pipeline_owner = p_worker,
    pipeline_started_at = now(),
    pipeline_attempt_count = c.pipeline_attempt_count + 1,
    pipeline_updated_at = now(),
    updated_at = now()
  where c.id = (
    select c2.id
    from public.companies c2
    where c2.pipeline_stage = p_stage
      and (c2.pipeline_locked_until is null or c2.pipeline_locked_until < now())
    order by c2.pipeline_updated_at asc, c2.created_at asc
    for update skip locked
    limit 1
  )
  returning c.* into v_company;

  if not found then
    return;
  end if;

  insert into public.pipeline_runs (company_id, worker, from_stage, status, input_snapshot)
  values (
    v_company.id,
    p_worker,
    p_stage,
    'running',
    jsonb_build_object(
      'slug', v_company.slug,
      'name', v_company.name,
      'score', v_company.score,
      'grade', v_company.grade,
      'display_status', v_company.status
    )
  )
  returning id into v_run_id;

  run_id := v_run_id;
  company_id := v_company.id;
  slug := v_company.slug;
  name := v_company.name;
  pipeline_stage := v_company.pipeline_stage;
  return next;
end;
$$;

create or replace function public.finish_pipeline_run(
  p_run_id uuid,
  p_to_stage text,
  p_status text default 'succeeded',
  p_output_summary jsonb default '{}'::jsonb,
  p_error text default null
)
returns void
language plpgsql
as $$
declare
  v_run public.pipeline_runs%rowtype;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'invalid run status: %', p_status;
  end if;

  select * into v_run
  from public.pipeline_runs
  where id = p_run_id;

  if not found then
    raise exception 'pipeline run not found: %', p_run_id;
  end if;

  update public.pipeline_runs
  set
    status = p_status,
    to_stage = p_to_stage,
    output_summary = coalesce(p_output_summary, '{}'::jsonb),
    error = p_error,
    finished_at = now()
  where id = p_run_id;

  update public.companies
  set
    pipeline_stage = p_to_stage,
    pipeline_locked_by = null,
    pipeline_locked_until = null,
    pipeline_finished_at = now(),
    pipeline_last_error = case when p_status = 'failed' then p_error else null end,
    pipeline_updated_at = now(),
    updated_at = now()
  where id = v_run.company_id;
end;
$$;

revoke all on function public.claim_pipeline_company(text, text, integer) from public, anon, authenticated;
revoke all on function public.finish_pipeline_run(uuid, text, text, jsonb, text) from public, anon, authenticated;
