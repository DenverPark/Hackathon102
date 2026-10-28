// Optional live smoke test: SUPABASE_PUBLISHABLE_KEY=... node tests/http-smoke.mjs
// Reads public catalogue and invokes pure calculation RPCs only; no writes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createLayerMatchClient} from '../client/layermatch.mjs';
const url=process.env.SUPABASE_URL||'https://czxcnvgbrrakyydtdhgh.supabase.co';
const {supabaseConfig}=await import('../config.js');
const key=process.env.SUPABASE_PUBLISHABLE_KEY || supabaseConfig.key;
if(!key)throw new Error('SUPABASE_PUBLISHABLE_KEY is required');
const api=createLayerMatchClient({url,key});const results=[];
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
await check('catalogue',async()=>assert.equal((await api.listFabrics()).length,4));
await check('search/filter',async()=>assert.equal((await api.listFabrics({query:'면',category:'blend'}))[0].id,'cotton65-poly35'));
await check('detail',async()=>assert.equal((await api.getFabric('denim-cotton100')).composition.cotton,100));
await check('missing detail',async()=>assert.equal(await api.getFabric('not-found'),null));
await check('evidence/source',async()=>{assert.equal((await api.getEvidence('denim-cotton100')).length,5);assert.equal((await api.listSources()).length,15);});
await check('shrinkage',async()=>assert.equal(await api.calculateShrinkage(30,28.5),5));
const payload={purpose:'셔츠',items:[{sample_id:'A',fabric_id:'denim-cotton100',color_depth:'dark',prewashed:false},{sample_id:'B',fabric_id:'cotton65-poly35',color_depth:'light',prewashed:null}]};
await check('missing-data analysis',async()=>{const r=await api.analyze(payload);assert.equal(r.status,'insufficient_data');assert.equal(r.shrinkage_difference_pp,null);assert.ok(r.recommended_tests.some(t=>t.test_type==='staining'));assert.equal(r.rule_version,'0.4.0-draft');assert.equal(r.analysis_id,undefined);});
const conditions={wash_temp_c:30,wash_minutes:60,cycles:1,drying:'air',direction:'warp'};
payload.items[0].measurement={...conditions,shrinkage_pct:5,staining_grade:3};payload.items[1].measurement={...conditions,shrinkage_pct:2,staining_grade:4};
await check('3pp threshold',async()=>{const r=await api.analyze(payload);assert.equal(r.shrinkage_difference_pp,3);assert.ok(r.warnings.some(w=>w.code==='SHRINKAGE_GAP'));});
await check('validation over HTTP',async()=>assert.rejects(api.analyze({purpose:'x',items:[]}),e=>e.status===400&&e.code==='22023'));
const materials={purpose:'소재 가공 확인',items:[{fabric_id:'nylon100'},{fabric_id:'wool100'}]};
await check('nylon and wool catalogue/evidence',async()=>{
 const rows=await api.listFabrics(); assert.ok(rows.some(f=>f.id==='nylon100'));assert.ok(rows.some(f=>f.id==='wool100'));
 assert.equal((await api.getEvidence('nylon100')).length,6); assert.equal((await api.getEvidence('wool100')).length,7);
 for(const id of ['nylon100','wool100']) for(const e of await api.getEvidence(id)) assert.equal(e.usable_as_actual_measurement,false);
});
await check('all research rows match the reviewed dataset',async()=>{
 const dataset=JSON.parse(await readFile(new URL('../backend/data/nylon-wool.json',import.meta.url),'utf8'));
 const sources=await api.listSources();
 for(const row of dataset.sources){const actual=sources.find(s=>s.id===row.id);for(const [key,value] of Object.entries(row))assert.deepEqual(actual[key],value);}
 for(const row of dataset.fabrics){const actual=await api.getFabric(row.id);for(const [key,value] of Object.entries(row))assert.deepEqual(actual[key],value);}
 for(const row of dataset.evidence){const actual=(await api.getEvidence(row.fabric_id)).find(e=>e.id===row.id);for(const [key,value] of Object.entries(row))assert.deepEqual(actual[key],value);}
});
await check('processing unknowns and precautions',async()=>{
 const r=await api.analyze(materials);assert.equal(r.schema_version,'1.1');assert.equal(r.shrinkage_difference_pp,null);
 for(const field of ['nylon_type','coating','heat_set','construction','shrinkproofed'])assert.ok(r.unknown_fields.some(u=>u.field===field));
 for(const code of ['NYLON_PROCESSING_CHECK','WOOL_FELTING_CHECK'])assert.ok(r.warnings.some(w=>w.code===code));
 assert.equal(r.fabric_snapshots[1].profile_details.construction,'unknown');
});
const known=structuredClone(materials);
known.items[0]={fabric_id:'nylon100',nylon_type:'nylon6',heat_set:true,coating:'none',color_depth:'medium',prewashed:true};
known.items[1]={fabric_id:'wool100',construction:'woven',shrinkproofed:true,color_depth:'medium',prewashed:true};
for(const item of known.items)item.measurement={...conditions,shrinkage_pct:2,staining_grade:4,shrinkage_kind:'relaxation',shrinkage_basis:'linear'};
await check('known metadata is preserved without research substitution',async()=>{
 const r=await api.analyze(known);assert.equal(r.status,'no_rule_triggered');assert.equal(r.shrinkage_difference_pp,0);
 assert.equal(r.fabric_snapshots[0].processing.nylon_type,'nylon6');assert.equal(r.fabric_snapshots[1].processing.shrinkproofed,true);
});
await check('wool needs shrinkage kind even with numeric data',async()=>{
 const p=structuredClone(known);delete p.items[1].measurement.shrinkage_kind;
 const r=await api.analyze(p);assert.equal(r.shrinkage_difference_pp,null);assert.ok(r.unknown_fields.some(u=>u.field==='shrinkage_kind'));
});
await check('relaxation and felting are not directly compared',async()=>{
 const p=structuredClone(known);p.items[1].measurement.shrinkage_kind='felting';
 assert.equal((await api.analyze(p)).shrinkage_difference_pp,null);
});
await check('processing validation rejects malformed types',async()=>{
 for(const [field,value] of [['nylon_type','polyester'],['heat_set','yes'],['coating',null],['construction','stretch'],['shrinkproofed','yes']]){
  const p=structuredClone(known);p.items[field==='construction'||field==='shrinkproofed'?1:0][field]=value;
  await assert.rejects(api.analyze(p),e=>e.status===400&&e.code==='22023');
 }
});
await check('area shrinkage cannot masquerade as directional percentage',async()=>{
 for(const change of [{shrinkage_basis:'area'},{area_shrinkage_pct:16.7},{shrinkage_kind:'invalid'}]){
  const p=structuredClone(known);Object.assign(p.items[1].measurement,change);
  await assert.rejects(api.analyze(p),e=>e.status===400&&e.code==='22023');
 }
});
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
await writeFile(new URL('../test-results/http-smoke.json',import.meta.url),JSON.stringify({project:url,results},null,2));
console.log(results.length+' live checks passed (no writes)');
