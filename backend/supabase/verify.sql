-- Read-only catalogue/analysis checks plus a rolled-back unauthorized insert attempt.
begin;
do $$declare p jsonb;r jsonb;bad jsonb;begin
 if (select count(*) from public.lm_fabrics)<>4 then raise exception 'fabric count';end if;
 if (select count(*) from public.lm_sources)<>15 then raise exception 'source count';end if;
 if (select count(*) from public.lm_evidence)<>23 then raise exception 'evidence count';end if;
 if exists(select 1 from public.lm_evidence where usable_as_actual_measurement) then raise exception 'research leak';end if;
 if exists(select 1 from public.lm_sources where document_name ~ '^[A-Z]:') then raise exception 'local path exposure';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('lm_sources','lm_fabrics','lm_evidence') and not c.relrowsecurity) then raise exception 'RLS disabled';end if;
 if public.lm_shrinkage(30,28.5)<>5 or public.lm_shrinkage(30,33)<>-10 then raise exception 'formula';end if;
 begin perform public.lm_shrinkage(0,2);raise exception 'zero accepted';exception when invalid_parameter_value then null;end;
 p:='{"purpose":"셔츠","items":[{"fabric_id":"denim-cotton100","color_depth":"dark","prewashed":true},{"fabric_id":"cotton65-poly35","color_depth":"light","prewashed":true}]}'::jsonb;
 r:=public.lm_analyze(p);
 if r->>'status' is distinct from 'insufficient_data' or r->'shrinkage_difference_pp' is distinct from 'null'::jsonb then raise exception 'missing-data behavior';end if;
 if not r->'recommended_tests' @> '[{"test_type":"shrinkage"}]' or not r->'recommended_tests' @> '[{"test_type":"staining"}]' then raise exception 'test type selection';end if;
 if r ? 'recommended_guide_ids' or r ? 'analysis_id' then raise exception 'scope leak';end if;
 p:=jsonb_set(p,'{items,0,measurement}','{"shrinkage_pct":5,"staining_grade":3,"wash_temp_c":30,"wash_minutes":60,"cycles":1,"drying":"air","direction":"warp"}');
 p:=jsonb_set(p,'{items,1,measurement}','{"shrinkage_pct":2,"staining_grade":4,"wash_temp_c":30,"wash_minutes":60,"cycles":1,"drying":"air","direction":"warp"}');
 r:=public.lm_analyze(p);
 if (r->>'shrinkage_difference_pp')::numeric is distinct from 3 or not r->'warnings' @> '[{"code":"SHRINKAGE_GAP"}]' or not r->'warnings' @> '[{"code":"STAINING_GRADE_CAUTION"}]' then raise exception 'threshold3';end if;
 r:=public.lm_analyze(jsonb_set(p,'{items,0,measurement,shrinkage_pct}','4.99'));
 if r->'warnings' @> '[{"code":"SHRINKAGE_GAP"}]' then raise exception 'below3';end if;
 r:=public.lm_analyze(jsonb_set(p,'{items,1,measurement,direction}','"weft"'));
 if r->'shrinkage_difference_pp' is distinct from 'null'::jsonb then raise exception 'direction mismatch';end if;
 r:=public.lm_analyze(jsonb_set(p,'{items,1,measurement,wash_temp_c}','40'));
 if r->'shrinkage_difference_pp' is distinct from 'null'::jsonb then raise exception 'temperature mismatch';end if;
 r:=public.lm_analyze(jsonb_set(p,'{items,1,measurement,cycles}','2'));
 if r->'shrinkage_difference_pp' is distinct from 'null'::jsonb then raise exception 'cycles mismatch';end if;
 p:=jsonb_set(p,'{items,1,fabric_id}','"denim-cotton100"');
 p:=jsonb_set(p,'{items,0,sample_id}','"dark-denim"');p:=jsonb_set(p,'{items,1,sample_id}','"light-denim"');
 perform public.lm_analyze(p); -- same material, distinct physical samples is valid
 foreach bad in array array[
  '{}'::jsonb,'null'::jsonb,'[]'::jsonb,
  '{"purpose":"x","items":[]}'::jsonb,
  '{"purpose":"x","items":[{"fabric_id":"missing"},{"fabric_id":"cotton65-poly35"}]}'::jsonb,
  '{"purpose":"x","items":[{"fabric_id":"denim-cotton100"},{"fabric_id":"denim-cotton100"}]}'::jsonb,
  jsonb_set(p,'{items,0,color_depth}','"invalid"'),jsonb_set(p,'{items,0,color_depth}','null'),
  jsonb_set(p,'{items,0,prewashed}','"yes"'),jsonb_set(p,'{items,0,measurement}','[]'),
  jsonb_set(p,'{items,0,measurement,shrinkage_pct}','"5"'),
  jsonb_set(p,'{items,0,measurement,staining_grade}','6'),
  jsonb_set(p,'{items,0,measurement,wash_temp_c}','null'),
  jsonb_set(p,'{items,0,measurement,cycles}','1.5'),
  jsonb_set(p,'{items,0,measurement,drying}','""'),
  jsonb_set(p,'{items,0,measurement,direction}','"diagonal"')
 ] loop
  begin perform public.lm_analyze(bad);raise exception 'invalid input accepted: %',bad;exception when invalid_parameter_value then null;end;
 end loop;
 if to_regclass('public.lm_guides') is not null or to_regclass('public.lm_projects') is not null or to_regclass('public.lm_analyses') is not null or to_regclass('public.lm_test_results') is not null or to_regclass('lm_private.chat_usage') is not null then raise exception 'out of scope object remains';end if;
end $$;
set local role anon;
do $$begin
 if (select count(*) from public.lm_fabrics)<>4 then raise exception 'anon read';end if;
 perform public.lm_analyze('{"purpose":"x","items":[{"fabric_id":"denim-cotton100"},{"fabric_id":"cotton65-poly35"}]}');
 begin insert into public.lm_fabrics(id,name,category,composition,summary,source_ids) values('bad','bad','bad','{}','bad','{}');raise exception 'anon write';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: catalogue, evidence isolation, measurement comparability, 3pp boundary, validation, same-material samples, anonymous read/analysis, write protection' as verification;
