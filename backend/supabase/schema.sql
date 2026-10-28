-- LayerMatch v0.2.0. Apply once to a fresh project, then analysis.sql.
-- No existing tables are replaced. PDF research is reference evidence, not measured user fabric data.
begin;
create table public.lm_sources (
 id text primary key, title text not null, url text, document_name text not null,
 locator text not null, evidence_status text not null default 'provided_document',
 limitations text not null, checked_at date not null default current_date
);
create table public.lm_fabrics (
 id text primary key, name text not null, category text not null,
 composition jsonb not null check(jsonb_typeof(composition)='object'),
 structure text, stretch text, summary text not null,
 source_ids text[] not null, data_gaps text[] not null default '{}', created_at timestamptz default now()
);
create table public.lm_evidence (
 id text primary key, fabric_id text not null references public.lm_fabrics(id),
 source_id text not null references public.lm_sources(id), property text not null,
 reported_value jsonb not null, sample_description text not null,
 conditions jsonb not null, applicability text not null,
 usable_as_actual_measurement boolean not null default false check(not usable_as_actual_measurement)
);
create index lm_evidence_fabric_idx on public.lm_evidence(fabric_id);
create index lm_evidence_source_idx on public.lm_evidence(source_id);
do $$ declare t text; begin
 foreach t in array array['lm_sources','lm_fabrics','lm_evidence'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy reference_read on public.%I for select to anon, authenticated using (true)',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to anon, authenticated',t);
 end loop;
end $$;
-- Pure numerical helper, no persistence.
create function public.lm_shrinkage(before_length numeric,after_length numeric) returns numeric
language plpgsql immutable security invoker set search_path='' as $$
begin
 if before_length is null or after_length is null or before_length<=0 or after_length<=0
 or before_length::text in ('NaN','Infinity','-Infinity') or after_length::text in ('NaN','Infinity','-Infinity') then
 raise exception 'Lengths must be positive finite numbers' using errcode='22023'; end if;
 return round((before_length-after_length)/before_length*100,4);
end $$;

