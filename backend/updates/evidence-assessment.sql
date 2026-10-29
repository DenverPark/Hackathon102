begin;
insert into public.lm_sources(id,title,url,document_name,locator,evidence_status,limitations,checked_at) values
('iso-5077-2007','ISO 5077:2007 세탁·건조 후 치수 변화','https://www.iso.org/standard/41877.html','ISO 공식 표준 소개','초록','official_abstract','표준 원문 전체 및 적용 세부 절차는 별도 확인. 100점 환산·합격 기준을 제시하는 출처로 사용하지 않음.','2026-10-30'),
('iso-6330-2021','ISO 6330:2021 가정 세탁 및 건조 절차','https://www.iso.org/standard/75934.html','ISO 공식 표준 소개','초록','official_abstract','시험 조건을 정하는 표준이며 특정 원단의 측정값이나 종합 점수 기준이 아님.','2026-10-30'),
('iso-105-c06-2010','ISO 105-C06:2010 세탁 견뢰도','https://www.iso.org/standard/51276.html','ISO 공식 표준 소개','초록','official_abstract','실제 조합 시료의 결과를 대신하지 않음. 전체 시험 절차는 별도 확인.','2026-10-30'),
('iso-105-a03-2019','ISO 105-A03:2019 첨부포 오염용 그레이 스케일','https://www.iso.org/standard/75985.html','ISO 공식 표준 소개','초록','official_abstract','오염 평가 척도이며 조합의 종합 점수나 보편적 합격선을 정하지 않음.','2026-10-30'),
('iso-13935-1-2014','ISO 13935-1:2014 봉합강도 스트립법','https://www.iso.org/standard/60678.html','ISO 공식 표준 소개','초록','official_abstract','주로 직물의 직선 봉합 시편에 적용. 실제 시편 시험 및 적용성 확인 필요.','2026-10-30'),
('kci-seam-cut-2013','재단 방향에 따른 면직물 봉합강도 (어미경, 2013)','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001805331','한국의상디자인학회지 15(3), 33–40','KCI 초록','abstract_reviewed','면직물 4종의 시험이며 이종 원단 조합의 범용 점수나 선택 원단의 실측치가 아님.','2026-10-30'),
('kci-lining-seam-2005','의류 안감 봉합강도 및 실 미끄럼저항 (어미경·박명자, 2005)','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001147463','한국의류산업학회지 7(4), 433–438','KCI 초록','abstract_reviewed','안감 7종의 시험으로 실제 선택 원단의 실측치나 범용 합산 공식이 아님.','2026-10-30')
on conflict(id) do update set title=excluded.title,url=excluded.url,document_name=excluded.document_name,locator=excluded.locator,evidence_status=excluded.evidence_status,limitations=excluded.limitations,checked_at=excluded.checked_at;
create or replace function public.lm_analyze_evidence(fabric_ids jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare base jsonb; item jsonb; pp jsonb:='[]'::jsonb; dims jsonb; comp jsonb;
begin
 base:=public.lm_analyze_catalogue(fabric_ids);
 dims:=jsonb_build_array(
 jsonb_build_object('id','shrinkage','label','세탁 후 치수 변화','score',null,'reason','실제 두 시료의 같은 조건·방향의 시험값이 없어 비교를 보류합니다.','source_ids',jsonb_build_array('iso-6330-2021','iso-5077-2007')),
 jsonb_build_object('id','staining','label','세탁 이염','score',null,'reason','염색 이력과 첨부포 또는 조합 시편의 시험 결과가 없어 보류합니다.','source_ids',jsonb_build_array('iso-105-c06-2010','iso-105-a03-2019')),
 jsonb_build_object('id','seam','label','봉합강도','score',null,'reason','실제 봉합 시편의 시험 결과와 제품별 요구 기준이 없어 보류합니다.','source_ids',jsonb_build_array('iso-13935-1-2014','kci-seam-cut-2013','kci-lining-seam-2005')));
 for item in select value from jsonb_array_elements(base->'compatibility'->'pairs') loop
  pp:=pp||jsonb_build_array((item-'score'-'status'-'dimensions')||jsonb_build_object('score',null,'status','not_assessable','dimensions',dims));
 end loop;
 comp:=jsonb_build_object('version','0.7.0-evidence','score',null,'min_pair_score',null,'label','시험 자료 부족','confidence','미확인','dimensions',dims,'pairs',pp,'not_evaluated',jsonb_build_array('세탁 후 치수 변화','세탁 이염','봉합강도'),'disclaimer','표준은 시험 방법을 제공하며 종합 점수 산출식이나 보편적 합격선을 제공하지 않습니다. 실제 시료 시험 및 제품 요구 기준이 없어 점수를 보류합니다.');
 return (base-'compatibility'-'rule_version')||jsonb_build_object('rule_version','0.7.0-evidence','compatibility',comp);
end $$;
revoke all on function public.lm_analyze_evidence(jsonb) from public;
grant execute on function public.lm_analyze_evidence(jsonb) to anon,authenticated;
commit;
select 'evidence_sources_and_analysis_applied' as status;
