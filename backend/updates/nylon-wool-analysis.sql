begin;
-- Only catalogue and pure analysis. No history, guides or AI.
create or replace function public.lm_analyze(payload jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
 item jsonb; items jsonb; f public.lm_fabrics; sample_id text; sample_ids text[]:='{}';
 warnings jsonb:='[]'; unknowns jsonb:='[]'; snapshots jsonb:='[]'; tests jsonb:='[]';
 m jsonb; conditions jsonb; first_conditions jsonb; k text; v numeric;
 n int; measured int:=0; min_s numeric; max_s numeric; comparable boolean:=true;
 dark boolean:=false; light boolean:=false; low_grade boolean:=false; any_unwashed boolean:=false;
 needs_shrinkage boolean:=false; needs_staining boolean:=false; gap numeric;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>32000 then
  raise exception 'Expected JSON object up to 32000 bytes' using errcode='22023';end if;
 if jsonb_typeof(payload->'purpose') is distinct from 'string' or length(trim(payload->>'purpose')) not between 1 and 200 then
  raise exception 'purpose is required (1-200 characters)' using errcode='22023';end if;
 items:=payload->'items';
 if jsonb_typeof(items) is distinct from 'array' then raise exception 'items must be an array' using errcode='22023';end if;
 n:=jsonb_array_length(items);
 if n not between 2 and 5 then raise exception 'Select 2-5 fabric samples' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'fabric_id') is distinct from 'string' then
   raise exception 'Each item requires fabric_id' using errcode='22023';end if;
  if item ? 'sample_id' and jsonb_typeof(item->'sample_id') is distinct from 'string' then
   raise exception 'sample_id must be a string' using errcode='22023';end if;
  sample_id:=coalesce(item->>'sample_id',item->>'fabric_id');
  if length(trim(sample_id)) not between 1 and 100 or sample_id=any(sample_ids) then
   raise exception 'Each sample_id must be unique (1-100 characters)' using errcode='22023';end if;
  sample_ids:=array_append(sample_ids,sample_id);
  select * into f from public.lm_fabrics where id=item->>'fabric_id';
  if not found then raise exception 'Unknown fabric_id' using errcode='22023';end if;
  if item ? 'color_depth' and (jsonb_typeof(item->'color_depth')<>'string' or item->>'color_depth' not in ('dark','light','medium','unknown')) then
   raise exception 'color_depth must be dark, light, medium or unknown' using errcode='22023';end if;
  if item ? 'prewashed' and jsonb_typeof(item->'prewashed') not in ('boolean','null') then
   raise exception 'prewashed must be boolean or null' using errcode='22023';end if;
  dark:=dark or coalesce(item->>'color_depth'='dark',false);
  light:=light or coalesce(item->>'color_depth'='light',false);
  any_unwashed:=any_unwashed or coalesce(item->'prewashed'='false'::jsonb,false);
  if coalesce(item->>'color_depth','unknown')='unknown' then
   unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field','color_depth'));end if;
  if item->>'prewashed' is null then
   unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field','prewashed'));end if;
  -- Material/processing metadata is always user-reported, never inferred from research.
  foreach k in array array['nylon_type','coating','construction'] loop
   if item ? k and (jsonb_typeof(item->k) <> 'string' or not (item->>k = any(case k
    when 'nylon_type' then array['nylon6','nylon66','unknown']
    when 'coating' then array['none','pu','acrylic','dwr','multiple','other','unknown']
    else array['woven','knit','unknown'] end))) then
    raise exception 'Invalid processing field: %',k using errcode='22023';end if;
  end loop;
  foreach k in array array['heat_set','shrinkproofed'] loop
   if item ? k and jsonb_typeof(item->k) not in ('boolean','null') then
    raise exception '% must be boolean or null',k using errcode='22023';end if;
  end loop;
  if f.category='nylon' then
   foreach k in array array['nylon_type','coating','heat_set'] loop
    if item->>k is null or item->>k='unknown' then
     unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field',k));end if;
   end loop;
   if coalesce(item->>'coating','unknown')<>'none' or item->>'heat_set' is null or item->>'heat_set'='false' or coalesce(item->>'nylon_type','unknown')='unknown' then
    warnings:=warnings||jsonb_build_array(jsonb_build_object('code','NYLON_PROCESSING_CHECK','sample_id',sample_id,
     'message','나일론6/6,6·열고정·코팅 이력과 관리 라벨을 확인하세요. 조사자료의 온도·수축률을 실제 시료에 적용하지 않습니다.',
     'source_ids',jsonb_build_array('bpc-report')));
    needs_shrinkage:=true;
   end if;
  elsif f.category='wool' then
   foreach k in array array['construction','shrinkproofed'] loop
    if item->>k is null or item->>k='unknown' then
     unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field',k));end if;
   end loop;
   if item->>'shrinkproofed' is distinct from 'true' then
    warnings:=warnings||jsonb_build_array(jsonb_build_object('code','WOOL_FELTING_CHECK','sample_id',sample_id,
     'message','양모의 방축 가공 여부와 직물·편물 구분을 확인하세요. 펠팅 수축을 이완 수축과 혼합하지 말고 관리 라벨에 맞춰 실제 시료를 확인하세요.',
     'source_ids',jsonb_build_array('bpc-report','bpc-kci-wool')));
    needs_shrinkage:=true;
   end if;
  end if;
  m:=item->'measurement';
  if m is not null and m<>'null'::jsonb then
   if jsonb_typeof(m)<>'object' then raise exception 'measurement must be object or null' using errcode='22023';end if;
   if m ? 'staining_grade' then
    if jsonb_typeof(m->'staining_grade')<>'number' then raise exception 'staining_grade must be number' using errcode='22023';end if;
    v:=(m->>'staining_grade')::numeric;
    if v<1 or v>5 then raise exception 'staining_grade range is 1-5' using errcode='22023';end if;
    low_grade:=low_grade or (v<=3 and coalesce(item->>'color_depth'='dark',false));
   end if;
   if m ? 'shrinkage_kind' and (jsonb_typeof(m->'shrinkage_kind')<>'string' or m->>'shrinkage_kind' not in ('relaxation','felting','combined','unknown')) then
    raise exception 'Invalid shrinkage_kind' using errcode='22023';end if;
   if m ? 'shrinkage_basis' and (jsonb_typeof(m->'shrinkage_basis')<>'string' or m->>'shrinkage_basis'<>'linear') then
    raise exception 'Only linear shrinkage_pct is supported; do not submit area shrinkage' using errcode='22023';end if;
   if m ? 'area_shrinkage_pct' then
    raise exception 'Area shrinkage must not be mixed with linear shrinkage_pct' using errcode='22023';end if;
   if m ? 'shrinkage_pct' then
    if f.category='wool' and coalesce(m->>'shrinkage_kind','unknown')='unknown' then
     comparable:=false;
     unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field','shrinkage_kind','reason','양모의 이완·펠팅·복합 수축을 구분해야 합니다.'));
    end if;
    if jsonb_typeof(m->'shrinkage_pct')<>'number' then raise exception 'shrinkage_pct must be number' using errcode='22023';end if;
    v:=(m->>'shrinkage_pct')::numeric;
    if v< -100 or v>100 then raise exception 'shrinkage_pct range is -100 to 100' using errcode='22023';end if;
    foreach k in array array['wash_temp_c','wash_minutes','cycles'] loop
     if jsonb_typeof(m->k) is distinct from 'number' then raise exception 'Measurement needs numeric wash_temp_c, wash_minutes, cycles' using errcode='22023';end if;
    end loop;
    if (m->>'wash_temp_c')::numeric not between 0 and 100 or (m->>'wash_minutes')::numeric not between 0.1 and 1440
     or (m->>'cycles')::numeric not between 1 and 1000 or (m->>'cycles')::numeric<>trunc((m->>'cycles')::numeric)
     or jsonb_typeof(m->'drying') is distinct from 'string' or length(trim(m->>'drying')) not between 1 and 100
     or jsonb_typeof(m->'direction') is distinct from 'string' or m->>'direction' not in ('warp','weft') then
     raise exception 'Invalid measurement conditions' using errcode='22023';end if;
    conditions:=m-'shrinkage_pct'-'staining_grade';
    if first_conditions is null then first_conditions:=conditions;
    elsif first_conditions<>conditions then comparable:=false;end if;
    measured:=measured+1;min_s:=least(min_s,v);max_s:=greatest(max_s,v);
   end if;
  end if;
  if m->>'staining_grade' is null then
   unknowns:=unknowns||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'field','staining_grade'));
   needs_staining:=true;end if;
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('sample_id',sample_id,'fabric_id',f.id,'name',f.name,'composition',f.composition,
   'color_depth',coalesce(item->>'color_depth','unknown'),'prewashed',item->'prewashed','source_ids',f.source_ids,'catalogue_data_gaps',f.data_gaps,'profile_details',f.profile_details,'processing',jsonb_build_object('nylon_type',item->'nylon_type','coating',item->'coating','heat_set',item->'heat_set','construction',item->'construction','shrinkproofed',item->'shrinkproofed')));
 end loop;
 if measured<>n or not comparable then
  needs_shrinkage:=true;
  unknowns:=unknowns||jsonb_build_array(jsonb_build_object('field','comparable_shrinkage','reason','모든 실제 시료의 동일 방향·동일 세탁/건조 조건 측정값이 필요합니다.'));
  warnings:=warnings||jsonb_build_array(jsonb_build_object('code','SHRINKAGE_DATA_INSUFFICIENT','message','실제 원단의 수축 특성을 비교할 정보가 부족합니다.','source_ids',jsonb_build_array('plan')));
 else
  gap:=max_s-min_s;
  if gap>=3 then needs_shrinkage:=true;
   warnings:=warnings||jsonb_build_array(jsonb_build_object('code','SHRINKAGE_GAP','message','동일 조건의 사용자 보고 측정값 사이에 수축률 차이가 있습니다. 제작 전 처리와 패턴 조정을 검토하세요.',
    'difference_pp',gap,'threshold_pp',3,'rule_status','draft_not_quality_standard','source_ids',jsonb_build_array('plan')));end if;
 end if;
 if dark and light then
  needs_staining:=true;
  warnings:=warnings||jsonb_build_array(jsonb_build_object('code',case when low_grade then 'STAINING_GRADE_CAUTION' else 'COLOR_CONTRAST_CAUTION' end,
   'message','진한색과 밝은색 조합입니다. 실제 시료의 이염을 확인하세요.','rule_status','draft_precaution','source_ids',jsonb_build_array('plan')));
 end if;
 if any_unwashed then needs_shrinkage:=true;
  warnings:=warnings||jsonb_build_array(jsonb_build_object('code','PREWASH_CHECK','message','사전 세탁하지 않은 시료가 있습니다. 관리 라벨과 작은 시료 테스트를 먼저 확인하세요.','source_ids',jsonb_build_array('plan')));end if;
 if needs_shrinkage then tests:=tests||jsonb_build_array(jsonb_build_object('test_type','shrinkage','reason','치수 변화 또는 측정 조건 확인 필요','priority','recommended'));end if;
 if needs_staining then tests:=tests||jsonb_build_array(jsonb_build_object('test_type','staining','reason','이염 등급 미확인 또는 색상 대비 확인 필요','priority','recommended'));end if;
 return jsonb_build_object('schema_version','1.1','rule_version','0.4.0-draft','purpose',payload->>'purpose',
  'status',case when jsonb_array_length(unknowns)>0 then 'insufficient_data' when jsonb_array_length(warnings)>0 then 'needs_testing' else 'no_rule_triggered' end,
  'fabric_snapshots',snapshots,'warnings',warnings,'unknown_fields',unknowns,'recommended_tests',tests,'shrinkage_difference_pp',gap,
  'measurement_basis','user_reported_only','purpose_usage','기록용 문맥이며 목적별 별도 판정 규칙은 아직 검증되지 않았습니다.',
  'disclaimer','연구 수치를 실제 원단에 대입하지 않습니다. 기획 초안 규칙에 따른 참고 정보이며 품질 검증을 대체하지 않습니다. 경고가 없어도 안전을 보증하지 않습니다.');
end $$;
revoke all on function public.lm_analyze(jsonb) from public;
grant execute on function public.lm_analyze(jsonb) to anon,authenticated;
revoke all on function public.lm_shrinkage(numeric,numeric) from public;
grant execute on function public.lm_shrinkage(numeric,numeric) to anon,authenticated;

commit;
select 'nylon_wool_analysis_applied' as status;
