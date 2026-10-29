begin;
insert into public.lm_sources(id,title,url,document_name,locator,evidence_status,limitations,checked_at) values
('cotton-survey-202610','면직물 조사 자료',null,'면직물pdf.pdf','1–5쪽','provided_document_reviewed','제공 조사 문서. 일부 값은 그래프 추정이나 시험 조건 및 원문 연결 미확인으로 실제 선택 원단 측정값으로 사용하지 않음.','2026-10-30'),
('polyester-survey-202610','폴리에스터 조사 자료',null,'폴리에스터pdf.pdf','1–5쪽','provided_document_reviewed','제공 조사 문서. 특정 극세사 연구 및 제조사 자료가 혼재하며 원단 종류·조직·시험 조건에 따라 차이가 있음.','2026-10-30'),
('cotton-resin-2012','비포름알데하이드계 수지 처리 면직물 연구','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001670866','한국염색가공학회지 24(2), 121–130','제공 PDF 2–3쪽 인용','provided_document','원문·수축 그래프와 측정 조건 직접 대조 미완료. 조사 문서의 근사치는 선택 시료에 전용 불가.','2026-10-30'),
('polyester-microfiber-2003','해도형 극세사 폴리에스테르의 염색성 및 세탁견뢰도 연구','https://www.dbpia.co.kr/pdf/pdfView.do?nodeId=NODE01798201','한국염색가공학회지 15(1), 48–55','제공 PDF 2–3쪽 인용','provided_document','특정 극세사 및 염색·열처리 조건 연구. 원문 전체 직접 확인하지 않았으며 일반 폴리에스터 전체에 적용 불가.','2026-10-30'),
('cotton-dye-thesis','천연염색 면직물 관련 연구 자료','https://dcollection.sungshin.ac.kr/public_resource/pdf/000000006948_20261029051448.pdf','제공 자료에서 인용한 학위자료','제공 PDF 2쪽','provided_document','논문 제목·시험 조건과 등급의 원문 대조 미완료. 변퇴색과 첨부포 오염은 구분 필요.','2026-10-30'),
('polyester-shrink-web','수축시험과 치수 안정화에 대한 제조사 자료','https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/','제조사 설명','제공 PDF 3쪽 인용','provided_document','공식 표준 원문이나 실제 시료 시험성적서가 아님. 1% 미만을 일반 기준으로 사용하지 않음.','2026-10-30')
on conflict(id) do update set title=excluded.title,url=excluded.url,document_name=excluded.document_name,locator=excluded.locator,evidence_status=excluded.evidence_status,limitations=excluded.limitations,checked_at=excluded.checked_at;
insert into public.lm_fabrics(id,name,category,composition,structure,stretch,summary,source_ids,data_gaps,profile_details) values
('cotton100','면직물','cotton','{}'::jsonb,'조직 미확인','unknown','면직물은 조직·가공·염색에 따라 물성이 달라집니다. 조사자료는 실제 원단의 시험값이 아닙니다.',array['cotton-survey-202610','cotton-resin-2012','cotton-dye-thesis'],array['실제 원단 조직 및 가공','실제 수축률과 시험 조건','색상 및 이염 시험 결과'], '{"reported_care":"관리 라벨과 실제 원단의 세탁 조건을 확인하세요."}'::jsonb),
('polyester100','폴리에스터','polyester','{}'::jsonb,'조직 미확인','unknown','폴리에스터의 조직·가공과 염색에 따라 신축성과 이염 특성이 다를 수 있습니다.',array['polyester-survey-202610','polyester-microfiber-2003','polyester-shrink-web'],array['실제 원단 조직 및 가공','실제 수축률과 시험 조건','색상 및 이염 시험 결과'], '{"reported_care":"관리 라벨과 실제 원단의 세탁 조건을 확인하세요."}'::jsonb)
on conflict(id) do update set name=excluded.name,category=excluded.category,composition=excluded.composition,structure=excluded.structure,stretch=excluded.stretch,summary=excluded.summary,source_ids=excluded.source_ids,data_gaps=excluded.data_gaps,profile_details=excluded.profile_details;
insert into public.lm_evidence(id,fabric_id,source_id,property,reported_value,sample_description,conditions,applicability) values
('cotton-survey-profile','cotton100','cotton-survey-202610','profile_report','{"observation":"조사자료의 면직물 조직·흡습·신축 관련 정성적 설명","reported_range_pct":[3,5]}'::jsonb,'면직물 일반 조사','{"pages":"1","verification_status":"provided_document"}'::jsonb,'수축 3–5%의 원문·조건 미확인. 일반적 보장이나 선택 시료의 실측값으로 사용하지 않음.'),
('cotton-resin-shrink','cotton100','cotton-resin-2012','shrinkage','{"observation":"무처리 경사 약 4.8%, 위사 약 2.2%는 조사자가 그래프에서 추정; 처리 시료와 구분"}'::jsonb,'수지 처리 여부를 비교한 면직물 연구','{"pages":"2–3","verification_status":"원문 시험 조건 및 그래프 독립 대조 미완료"}'::jsonb,'특정 연구의 그래프 추정값. 실제 원단의 수축률이나 점수 계산에 사용하지 않음.'),
('cotton-survey-staining','cotton100','cotton-dye-thesis','staining','{"observation":"천연염색 시료에 관한 변퇴색 및 오염 연구를 조사 문서에 요약"}'::jsonb,'천연염색 면직물 시료','{"pages":"2","standards_reported":"KS K ISO 105-C06:2007; 문서 인용","verification_status":"원문 및 시험판 대조 미완료"}'::jsonb,'염료·매염 조건별 결과이며 변퇴색과 첨부포 오염을 분리해야 함. 실제 원단의 등급 아님.'),
('polyester-survey-profile','polyester100','polyester-survey-202610','profile_report','{"observation":"PET 소재, 조직·두께의 다양성 및 세탁·열처리에 관한 조사자료"}'::jsonb,'폴리에스터 일반 조사','{"pages":"1–2","verification_status":"provided_document"}'::jsonb,'섬유의 복원력만으로 직물의 신축성을 판정하지 않음. 관리 지침은 실제 라벨 우선.'),
('polyester-micro-dye','polyester100','polyester-microfiber-2003','staining','{"observation":"해도형 극세사 염색·열처리와 세탁견뢰도에 관한 조사자료 요약"}'::jsonb,'특정 해도형 극세사 폴리에스터','{"pages":"2–3","verification_status":"원문 전체 독립 대조 미완료"}'::jsonb,'특정 연구 시료 및 가공에 한정. 실제 조합의 이염 등급으로 사용하지 않음.'),
('polyester-survey-shrink','polyester100','polyester-shrink-web','shrinkage','{"observation":"조사자료의 수축 시험 방법과 1% 미만 주장"}'::jsonb,'제조사 자료 인용; 실제 시료 불명','{"pages":"3,5","verification_status":"제조사 자료 인용, 시험 조건 미확정"}'::jsonb,'실측 결과 및 공인 합격 기준 아님. 수치 자동 계산 제외.')
on conflict(id) do update set fabric_id=excluded.fabric_id,source_id=excluded.source_id,property=excluded.property,reported_value=excluded.reported_value,sample_description=excluded.sample_description,conditions=excluded.conditions,applicability=excluded.applicability;

-- Catalogue-only conceptual estimate; not a certified or experimentally validated compatibility score.
-- Inputs are public catalogue IDs. No research measurement is treated as an actual sample result.
create or replace function public.lm_analyze_catalogue(fabric_ids jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
 n int; i int; j int; a text; b text; id text; ids text[]:='{}';
 fa public.lm_fabrics; fb public.lm_fabrics;
 class_a int; class_b int; shrink_score numeric; stretch_score numeric; care_score numeric;
 pair_score numeric; pair_count int:=0; score_sum numeric:=0; min_score numeric:=100; unavailable boolean:=false;
 shrink_sum numeric:=0; stretch_sum numeric:=0; stretch_count int:=0; care_sum numeric:=0;
 snapshots jsonb:='[]'; pairs jsonb:='[]'; warnings jsonb:='[]'; details jsonb; pair_warnings jsonb;
begin
 if jsonb_typeof(fabric_ids) is distinct from 'array' or octet_length(fabric_ids::text)>4000 then
  raise exception 'fabric_ids must be an array of 2-5 catalogue IDs' using errcode='22023';end if;
 n:=jsonb_array_length(fabric_ids);
 if n not between 2 and 5 then raise exception 'Select 2-5 fabrics' using errcode='22023';end if;
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
   pair_warnings:=pair_warnings||jsonb_build_array(jsonb_build_object('code','STAINING_UNKNOWN','message','색상과 실제 염색 이력은 확인되지 않아 이염 가능성을 점수로 산정하지 않았습니다.','source_ids','[]'::jsonb));
   if shrink_score is null or care_score is null then pair_score:=null;unavailable:=true;
   else pair_score:=round((shrink_score*40+care_score*30+coalesce(stretch_score,0)*30)/(70+case when stretch_score is null then 0 else 30 end),1);
    score_sum:=score_sum+pair_score;min_score:=least(min_score,pair_score);shrink_sum:=shrink_sum+shrink_score;care_sum:=care_sum+care_score;
    if stretch_score is not null then stretch_sum:=stretch_sum+stretch_score;stretch_count:=stretch_count+1;end if;
   end if;
   details:=jsonb_build_array(
    jsonb_build_object('id','shrinkage','label','세탁 수축 반응 차이','score',shrink_score,'weight',40,'reason','소재 분류에 기획 단계의 세탁 반응 등급을 부여해 비교했습니다. 실제 수축률 차이를 측정한 값이 아닙니다.'),
    jsonb_build_object('id','stretch','label','신축 특성','score',stretch_score,'weight',30,'reason',case when stretch_score is null then '원단 중 하나의 조직·신축성이 확정되지 않아 점수를 보류하고 나머지 항목의 비중을 재계산했습니다.' else 'DB상 두 프로필 모두 비신축으로 분류되어 있습니다. 실제 선택 원단의 신축성은 다를 수 있습니다.' end),
    jsonb_build_object('id','care','label','관리 조건 확인','score',care_score,'weight',30,'reason','소재 범주에 따른 일반적인 세탁·가공 확인 필요성을 반영한 기획 가정입니다. 실제 세탁 조건이나 안전 온도는 측정하지 않았습니다.'),
    jsonb_build_object('id','staining','label','이염 가능성','score',null,'weight',0,'reason','색상·염색 이력·첨부포 시험이 확인되지 않아 평가를 보류합니다.'));
   pairs:=pairs||jsonb_build_array(jsonb_build_object('fabric_ids',jsonb_build_array(a,b),'names',jsonb_build_array(fa.name,fb.name),'score',pair_score,'status',case when pair_score is null then 'not_assessable' else 'draft_estimate' end,'dimensions',details,'warnings',pair_warnings,'source_ids',to_jsonb(fa.source_ids)||to_jsonb(fb.source_ids)));
   warnings:=warnings||pair_warnings;pair_count:=pair_count+1;
  end loop;
 end loop;
 return jsonb_build_object('schema_version','1.0','rule_version','0.8.0-catalogue-draft','fabric_snapshots',snapshots,'warnings',warnings,
  'recommended_tests',jsonb_build_array(jsonb_build_object('test_type','shrinkage','reason','서로 다른 원단의 실제 치수 변화 확인','priority','recommended'),jsonb_build_object('test_type','staining','reason','실제 시료의 염색·이염 확인','priority','recommended')),
  'compatibility',jsonb_build_object('version','0.8.0-catalogue-draft','score',case when unavailable then null else round(score_sum/pair_count,1) end,'min_pair_score',case when unavailable then null else min_score end,
   'label',case when unavailable then '자료 부족' else '기획용 추정' end,'confidence','낮음',
   'dimensions',jsonb_build_array(jsonb_build_object('id','shrinkage','label','세탁 수축 반응 차이','score',case when unavailable then null else round(shrink_sum/pair_count,1) end),jsonb_build_object('id','stretch','label','신축 특성','score',case when stretch_count=0 then null else round(stretch_sum/stretch_count,1) end),jsonb_build_object('id','care','label','관리 조건 확인','score',case when unavailable then null else round(care_sum/pair_count,1) end),jsonb_build_object('id','staining','label','이염 가능성','score',null)),
   'pairs',pairs,'not_evaluated',jsonb_build_array('이염','내구성','봉제 적합성'),
   'disclaimer','원단 DB의 소재 분류·프로필에 가정한 기획용 참고 점수입니다. 실제 원단 조합을 시험하거나 검증한 물리적 호환성·합격·성공 확률이 아닙니다. 자료가 불확실한 이염은 평가하지 않았으며 연구 수치를 실제 원단의 측정값으로 사용하지 않았습니다.'));
end $$;
revoke all on function public.lm_analyze_catalogue(jsonb) from public;
grant execute on function public.lm_analyze_catalogue(jsonb) to anon,authenticated;

commit;
select 'cotton_polyester_applied' as status;
