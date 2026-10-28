begin;
-- Draft checklist index, not a validated probability of compatibility or production safety.
-- All existing lm_analyze validations and RLS apply. No research value is used as a sample measurement.
create or replace function public.lm_analyze_scored(payload jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
 result jsonb; pair_result jsonb; pair_payload jsonb; a jsonb; b jsonb; item jsonb;
 f public.lm_fabrics; n int; i int; j int; k text; pair_count int:=0;
 material_known numeric; material_total numeric; grade_count int; min_grade numeric; prewash_true int; prewash_known int;
 gap numeric; material_score numeric; shrink_score numeric; stain_score numeric; wash_score numeric;
 material_coverage numeric; shrink_coverage numeric; stain_coverage numeric; wash_coverage numeric;
 pair_score numeric; coverage numeric; all_score numeric:=0; all_coverage numeric:=0; min_pair numeric:=100;
 material_sum numeric:=0; shrink_sum numeric:=0; stain_sum numeric:=0; wash_sum numeric:=0;
 pairs jsonb:='[]'; dims jsonb; refs jsonb;
begin
 result:=public.lm_analyze(payload); -- Validate the entire input before scoring subsets.
 n:=jsonb_array_length(payload->'items');
 for i in 0..n-2 loop
  for j in i+1..n-1 loop
   a:=payload->'items'->i; b:=payload->'items'->j;
   pair_payload:=jsonb_build_object('purpose',payload->'purpose','items',jsonb_build_array(a,b));
   pair_result:=public.lm_analyze(pair_payload);
   material_known:=0;material_total:=0;grade_count:=0;min_grade:=5;prewash_true:=0;prewash_known:=0;refs:='[]';
   for item in select value from jsonb_array_elements(pair_payload->'items') loop
    select * into strict f from public.lm_fabrics where id=item->>'fabric_id';
    material_total:=material_total+3;
    if jsonb_typeof(f.composition)='object' and f.composition<>'{}'::jsonb then material_known:=material_known+1;end if;
    if coalesce(f.structure,'')<>'' and (f.category<>'wool' or coalesce(item->>'construction','unknown')<>'unknown') then material_known:=material_known+1;end if;
    if exists(select 1 from public.lm_evidence e join public.lm_sources s on s.id=e.source_id where e.fabric_id=f.id) then material_known:=material_known+1;end if;
    if f.category='nylon' then
     foreach k in array array['nylon_type','heat_set','coating'] loop
      material_total:=material_total+1;
      if item->>k is not null and item->>k<>'unknown' then material_known:=material_known+1;end if;
     end loop;
    elsif f.category='wool' then
     material_total:=material_total+1;
     if item->>'shrinkproofed' is not null then material_known:=material_known+1;end if;
    end if;
    refs:=refs||to_jsonb(f.source_ids);
    if item->'measurement'->>'staining_grade' is not null then
     grade_count:=grade_count+1;min_grade:=least(min_grade,(item->'measurement'->>'staining_grade')::numeric);
    end if;
    if item->>'prewashed' is not null then prewash_known:=prewash_known+1;end if;
    if item->>'prewashed'='true' then prewash_true:=prewash_true+1;end if;
   end loop;
   material_score:=round(100*material_known/material_total,1);material_coverage:=material_score;
   gap:=(pair_result->>'shrinkage_difference_pp')::numeric;
   shrink_score:=case when gap is null then 0 else greatest(0,100-20*gap) end;
   shrink_coverage:=case when gap is null then 0 else 100 end;
   stain_score:=case when grade_count=2 then (min_grade-1)*25 else 0 end;
   stain_coverage:=50*grade_count;
   wash_score:=50*prewash_true;wash_coverage:=50*prewash_known;
   pair_score:=round((material_score+shrink_score+stain_score+wash_score)/4,1);
   coverage:=round((material_coverage+shrink_coverage+stain_coverage+wash_coverage)/4,1);
   dims:=jsonb_build_array(
    jsonb_build_object('id','material','label','소재·가공 정보','score',material_score,'coverage',material_coverage,'weight',25,'reason','DB의 조성·조직·연구 출처와 실제 시료의 가공 정보 확인 비율입니다. 물리적 호환성 예측값이 아닙니다.'),
    jsonb_build_object('id','shrinkage','label','수축 특성 확인','score',round(shrink_score,1),'coverage',shrink_coverage,'weight',25,'reason',case when gap is null then '동일 조건의 실측 수축률이 없어 0점으로 보류했습니다.' else '동일 조건 실측 차이 '||gap::text||'%포인트. 1%포인트당 20점 차감하는 기획 초안입니다.' end),
    jsonb_build_object('id','staining','label','이염 등급 확인','score',stain_score,'coverage',stain_coverage,'weight',25,'reason',case when grade_count<2 then '두 시료의 실측 첨부포 오염 등급이 모두 필요합니다. 미확인은 0점으로 보류합니다.' else '두 시료 중 낮은 첨부포 오염 등급을 1~5에서 0~100점으로 환산했습니다. 시험 조건과 색상 대비도 확인하세요.' end),
    jsonb_build_object('id','prewash','label','사전 세탁 준비','score',wash_score,'coverage',wash_coverage,'weight',25,'reason','사전 세탁 완료 시료의 비율입니다. 관리 라벨 확인이 우선이며 세탁이 모든 원단의 필수 조건이라는 뜻은 아닙니다.')
   );
   pairs:=pairs||jsonb_build_array(jsonb_build_object('sample_ids',jsonb_build_array(coalesce(a->>'sample_id',a->>'fabric_id'),coalesce(b->>'sample_id',b->>'fabric_id')),
    'fabric_ids',jsonb_build_array(a->>'fabric_id',b->>'fabric_id'),'names',jsonb_build_array(pair_result->'fabric_snapshots'->0->>'name',pair_result->'fabric_snapshots'->1->>'name'),
    'score',pair_score,'coverage',coverage,'status',pair_result->'status','dimensions',dims,'warnings',pair_result->'warnings','unknown_fields',pair_result->'unknown_fields','source_ids',refs));
   all_score:=all_score+pair_score;all_coverage:=all_coverage+coverage;min_pair:=least(min_pair,pair_score);pair_count:=pair_count+1;
   material_sum:=material_sum+material_score;shrink_sum:=shrink_sum+shrink_score;stain_sum:=stain_sum+stain_score;wash_sum:=wash_sum+wash_score;
  end loop;
 end loop;
 return result||jsonb_build_object('compatibility',jsonb_build_object(
  'version','0.5.0-draft','score',round(all_score/pair_count,1),'coverage',round(all_coverage/pair_count,1),'min_pair_score',min_pair,
  'label',case when result->>'status'='insufficient_data' or all_coverage/pair_count<100 then '추가 정보 필요' when result->>'status'='needs_testing' then '사전 확인 필요' else '입력된 점검 조건 확인' end,
  'dimensions',jsonb_build_array(jsonb_build_object('id','material','label','소재·가공 정보','score',round(material_sum/pair_count,1)),jsonb_build_object('id','shrinkage','label','수축 특성 확인','score',round(shrink_sum/pair_count,1)),jsonb_build_object('id','staining','label','이염 등급 확인','score',round(stain_sum/pair_count,1)),jsonb_build_object('id','prewash','label','사전 세탁 준비','score',round(wash_sum/pair_count,1))),
  'pairs',pairs,'not_evaluated',jsonb_build_array('내구성','봉제 적합성'),
  'disclaimer','조합 적합도의 사전 점검 지수입니다. 가중치와 환산식은 검증 전 기획 초안이며 성공 확률이나 품질 합격 점수가 아닙니다. 미확인은 0점으로 반영하므로 낮은 점수만으로 호환 불가를 판단하지 마세요.'
 ));
end $$;
revoke all on function public.lm_analyze_scored(jsonb) from public;
grant execute on function public.lm_analyze_scored(jsonb) to anon,authenticated;

commit;
select 'compatibility_scoring_applied' as status;