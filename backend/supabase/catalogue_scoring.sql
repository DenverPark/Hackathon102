-- Catalogue-only conceptual estimate; not a certified or experimentally validated compatibility score.
-- Inputs are public catalogue IDs. No research measurement is treated as an actual sample result.
create or replace function public.lm_analyze_catalogue(fabric_ids jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
 n int; i int; j int; a text; b text; id text; ids text[]:='{}';
 fa public.lm_fabrics; fb public.lm_fabrics;
 class_a int; class_b int; shrink_score numeric; stretch_score numeric; care_score numeric; staining_score numeric; staining_sum numeric:=0;
 pair_score numeric; pair_count int:=0; score_sum numeric:=0; min_score numeric:=100; unavailable boolean:=false;
 shrink_sum numeric:=0; stretch_sum numeric:=0; stretch_count int:=0; care_sum numeric:=0;
 snapshots jsonb:='[]'; pairs jsonb:='[]'; warnings jsonb:='[]'; details jsonb; pair_warnings jsonb;
begin
 if jsonb_typeof(fabric_ids) is distinct from 'array' or octet_length(fabric_ids::text)>4000 then
  raise exception 'fabric_ids must be an array of 2-6 catalogue IDs' using errcode='22023';end if;
 n:=jsonb_array_length(fabric_ids);
 if n not between 2 and 6 then raise exception 'Select 2-6 fabrics' using errcode='22023';end if;
 for i in 0..n-1 loop
  if jsonb_typeof(fabric_ids->i) is distinct from 'string' then raise exception 'fabric ID must be a string' using errcode='22023';end if;
  id:=fabric_ids->>i;
  if length(trim(id)) not between 1 and 100 or id=any(ids) then raise exception 'fabric IDs must be unique' using errcode='22023';end if;
  ids:=array_append(ids,id);
  select * into fa from public.lm_fabrics f where f.id=ids[i+1];
  if not found then raise exception 'Unknown fabric_id' using errcode='22023';end if;
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('sample_id','sample-'||(i+1),'fabric_id',fa.id,'name',fa.name,'composition',fa.composition,'source_ids',fa.source_ids,'catalogue_data_gaps',fa.data_gaps,'profile_details',fa.profile_details));
 end loop;
 for i in 0..n-2 loop
  for j in i+1..n-1 loop
   a:=ids[i+1];b:=ids[j+1];
   select * into fa from public.lm_fabrics f where f.id=a;
   select * into fb from public.lm_fabrics f where f.id=b;
   -- Ordered categories are provisional product assumptions, not measured shrinkage percentages.
   class_a:=case fa.category when 'nylon' then 1 when 'polyester' then 1 when 'cotton' then 2 when 'denim' then 2 when 'blend' then 2 when 'wool' then 3 else null end;
   class_b:=case fb.category when 'nylon' then 1 when 'polyester' then 1 when 'cotton' then 2 when 'denim' then 2 when 'blend' then 2 when 'wool' then 3 else null end;
   shrink_score:=case when class_a is null or class_b is null then null else 90-15*abs(class_a-class_b) end;
   stretch_score:=case when fa.stretch='non_stretch' and fb.stretch='non_stretch' then 85 else null end;
   care_score:=case when class_a is null or class_b is null then null when 'wool' in (fa.category,fb.category) then 60 when 'nylon' in (fa.category,fb.category) or 'polyester' in (fa.category,fb.category) then 70 else 80 end;
   pair_warnings:='[]';
   if 'wool' in (fa.category,fb.category) then
    pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','WOOL_PROCESSING','message','울은 직물·편물 및 방축 가공 여부에 따라 관리와 수축 특성이 달라질 수 있습니다.','source_ids',jsonb_build_array('bpc-report','bpc-kci-wool')));end if;
   if 'nylon' in (fa.category,fb.category) then
    pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','NYLON_PROCESSING','message','나일론은 종류·열고정·코팅 여부에 따라 열과 세탁에 대한 반응이 달라질 수 있습니다.','source_ids',jsonb_build_array('bpc-report')));end if;
   if 'denim' in (fa.category,fb.category) then
    pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','DENIM_SAMPLE','message','데님 연구자료는 특정 시료의 결과이므로 실제 원단과 동일하다고 볼 수 없습니다.','source_ids',jsonb_build_array('denim-wash')));end if;
   if 'blend' in (fa.category,fb.category) then
    pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','BLEND_SOURCE','message','혼방 원단의 참고 연구는 일부 조성이 다르므로 해당 수치를 그대로 적용할 수 없습니다.','source_ids',jsonb_build_array('blend-profile','blend-shirt')));end if;
   if 'cotton' in (fa.category,fb.category) or 'polyester' in (fa.category,fb.category) then
    pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','NEW_FABRIC_PROFILE','message','면직물과 폴리에스터의 시험 결과는 조직·염색·가공 및 세탁 조건에 따라 달라집니다. 제공된 조사값은 실제 선택 원단의 측정값이 아닙니다.','source_ids',jsonb_build_array('cotton-survey-202610','polyester-survey-202610'))); end if;
   staining_score:=case when 'denim' in (fa.category,fb.category) then 60 else 70 end;
   staining_sum:=staining_sum+staining_score;
   pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','STAINING_ASSUMPTION','message','이염 참고 점수는 색상과 염색 상태를 모르는 상황에서 임의로 정한 기획 가정입니다. 실제 이염 가능성이나 시험 등급이 아닙니다.','source_ids',jsonb_build_array('iso-105-c06-2010','iso-105-a03-2019')));
   if shrink_score is null or care_score is null then pair_score:=null;unavailable:=true;
   else pair_score:=round((shrink_score*40+care_score*30+coalesce(stretch_score,0)*30)/(70+case when stretch_score is null then 0 else 30 end),1);
    score_sum:=score_sum+pair_score;min_score:=least(min_score,pair_score);shrink_sum:=shrink_sum+shrink_score;care_sum:=care_sum+care_score;
    if stretch_score is not null then stretch_sum:=stretch_sum+stretch_score;stretch_count:=stretch_count+1;end if;
   end if;
   details:=jsonb_build_array(
    jsonb_build_object('id','shrinkage','label','세탁 수축 반응 차이','score',shrink_score,'weight',40,'reason','소재 분류에 기획 단계의 세탁 반응 등급을 부여해 비교했습니다. 실제 수축률 차이를 측정한 값이 아닙니다.'),
    jsonb_build_object('id','stretch','label','신축 특성','score',stretch_score,'weight',30,'reason',case when stretch_score is null then '원단 중 하나의 조직·신축성이 확정되지 않아 점수를 보류하고 나머지 항목의 비중을 재계산했습니다.' else 'DB상 두 프로필 모두 비신축으로 분류되어 있습니다. 실제 선택 원단의 신축성은 다를 수 있습니다.' end),
    jsonb_build_object('id','care','label','관리 조건 확인','score',care_score,'weight',30,'reason','소재 범주에 따른 일반적인 세탁·가공 확인 필요성을 반영한 기획 가정입니다. 실제 세탁 조건이나 안전 온도는 측정하지 않았습니다.'),
    jsonb_build_object('id','staining','label','이염 참고 점수 (기획 가정)','score',staining_score,'weight',0,'reason','데님 포함 시 60점, 그 외 70점으로 임의 지정했습니다. 두 값은 연구 수치를 환산한 것이 아니며 실제 이염 위험·견뢰도 등급이 아닙니다. 종합 점수에는 반영하지 않습니다.'));
   pairs:=pairs||jsonb_build_array(jsonb_build_object('fabric_ids',jsonb_build_array(a,b),'names',jsonb_build_array(fa.name,fb.name),'score',pair_score,'status',case when pair_score is null then 'not_assessable' else 'draft_estimate' end,'dimensions',details,'warnings',pair_warnings,'source_ids',to_jsonb(fa.source_ids)||to_jsonb(fb.source_ids)));
   warnings:=warnings||pair_warnings;pair_count:=pair_count+1;
  end loop;
 end loop;
 return jsonb_build_object('schema_version','1.0','rule_version','0.9.0-catalogue-draft','fabric_snapshots',snapshots,'warnings',warnings,
  'recommended_tests',jsonb_build_array(jsonb_build_object('test_type','shrinkage','reason','서로 다른 원단의 실제 치수 변화 확인','priority','recommended'),jsonb_build_object('test_type','staining','reason','실제 시료의 염색·이염 확인','priority','recommended')),
  'compatibility',jsonb_build_object('version','0.9.0-catalogue-draft','score',case when unavailable then null else round(score_sum/pair_count,1) end,'min_pair_score',case when unavailable then null else min_score end,
   'label',case when unavailable then '자료 부족' else '기획용 추정' end,'confidence','낮음',
   'dimensions',jsonb_build_array(jsonb_build_object('id','shrinkage','label','세탁 수축 반응 차이','score',case when unavailable then null else round(shrink_sum/pair_count,1) end),jsonb_build_object('id','stretch','label','신축 특성','score',case when stretch_count=0 then null else round(stretch_sum/stretch_count,1) end),jsonb_build_object('id','care','label','관리 조건 확인','score',case when unavailable then null else round(care_sum/pair_count,1) end),jsonb_build_object('id','staining','label','이염 참고 점수 (기획 가정)','score',round(staining_sum/pair_count,1))),
   'pairs',pairs,'not_evaluated',jsonb_build_array('실제 이염','내구성','봉제 적합성'),
   'disclaimer','원단 DB의 소재 분류·프로필에 가정한 기획용 참고 점수입니다. 실제 원단 조합을 시험하거나 검증한 물리적 호환성·합격·성공 확률이 아닙니다. 이염 점수는 임의 가정이며 종합 점수에 포함하지 않습니다. 실제 이염 가능성·시험 등급이 아니고 연구 수치를 실제 원단의 측정값으로 사용하지 않았습니다.'));
end $$;
revoke all on function public.lm_analyze_catalogue(jsonb) from public;
grant execute on function public.lm_analyze_catalogue(jsonb) to anon,authenticated;
