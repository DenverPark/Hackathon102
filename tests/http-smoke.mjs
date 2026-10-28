// Optional live smoke test: SUPABASE_PUBLISHABLE_KEY=... node tests/http-smoke.mjs
// Reads public catalogue and invokes pure calculation RPCs only; no writes.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createLayerMatchClient} from '../client/layermatch.mjs';
const url=process.env.SUPABASE_URL||'https://czxcnvgbrrakyydtdhgh.supabase.co';
const {supabaseConfig}=await import('../config.js');
const key=process.env.SUPABASE_PUBLISHABLE_KEY || supabaseConfig.key;
if(!key)throw new Error('SUPABASE_PUBLISHABLE_KEY is required');
const api=createLayerMatchClient({url,key});const results=[];
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
await check('catalogue',async()=>assert.equal((await api.listFabrics()).length,2));
await check('search/filter',async()=>assert.equal((await api.listFabrics({query:'면',category:'blend'}))[0].id,'cotton65-poly35'));
await check('detail',async()=>assert.equal((await api.getFabric('denim-cotton100')).composition.cotton,100));
await check('missing detail',async()=>assert.equal(await api.getFabric('not-found'),null));
await check('evidence/source',async()=>{assert.equal((await api.getEvidence('denim-cotton100')).length,5);assert.equal((await api.listSources()).length,7);});
await check('shrinkage',async()=>assert.equal(await api.calculateShrinkage(30,28.5),5));
const payload={purpose:'셔츠',items:[{sample_id:'A',fabric_id:'denim-cotton100',color_depth:'dark',prewashed:false},{sample_id:'B',fabric_id:'cotton65-poly35',color_depth:'light',prewashed:null}]};
await check('missing-data analysis',async()=>{const r=await api.analyze(payload);assert.equal(r.status,'insufficient_data');assert.equal(r.shrinkage_difference_pp,null);assert.ok(r.recommended_tests.some(t=>t.test_type==='staining'));assert.equal(r.rule_version,'0.2.0-draft');assert.equal(r.analysis_id,undefined);});
const conditions={wash_temp_c:30,wash_minutes:60,cycles:1,drying:'air',direction:'warp'};
payload.items[0].measurement={...conditions,shrinkage_pct:5,staining_grade:3};payload.items[1].measurement={...conditions,shrinkage_pct:2,staining_grade:4};
await check('3pp threshold',async()=>{const r=await api.analyze(payload);assert.equal(r.shrinkage_difference_pp,3);assert.ok(r.warnings.some(w=>w.code==='SHRINKAGE_GAP'));});
await check('validation over HTTP',async()=>assert.rejects(api.analyze({purpose:'x',items:[]}),e=>e.status===400&&e.code==='22023'));
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
await writeFile(new URL('../test-results/http-smoke.json',import.meta.url),JSON.stringify({project:url,results},null,2));
console.log(results.length+' live checks passed (no writes)');
