import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
const basic={purpose:'가방',items:[{fabric_id:'denim-cotton100'},{fabric_id:'cotton65-poly35'}]};
const score=p=>api.analyzeScored(p);
const dimension=(r,id)=>r.compatibility.dimensions.find(d=>d.id===id);
await check('catalogue-only evidence does not invent measurements',async()=>{
 const r=await score(basic);assert.equal(r.compatibility.score,25);assert.equal(r.compatibility.coverage,25);
 assert.equal(dimension(r,'shrinkage').score,0);assert.equal(dimension(r,'staining').score,0);assert.equal(r.compatibility.label,'추가 정보 필요');
 assert.equal(r.compatibility.version,'0.5.0-draft');assert.deepEqual(r.compatibility.not_evaluated,['내구성','봉제 적합성']);
});
const complete=structuredClone(basic);
for(const item of complete.items)Object.assign(item,{prewashed:true,color_depth:'medium',measurement:{shrinkage_pct:2,staining_grade:5,wash_temp_c:30,wash_minutes:60,cycles:1,drying:'air',direction:'warp',shrinkage_kind:'relaxation'}});
await check('complete reported checklist reaches 100 with explicit limitation',async()=>{
 const r=await score(complete);assert.equal(r.compatibility.score,100);assert.equal(r.compatibility.coverage,100);assert.match(r.compatibility.disclaimer,/초안/);
 assert.equal(r.compatibility.pairs[0].dimensions.reduce((s,d)=>s+d.weight,0),100);
});
await check('3pp gap and grade 3 produce explained 72.5 points',async()=>{
 const p=structuredClone(complete);p.items[0].measurement.shrinkage_pct=5;p.items[0].measurement.staining_grade=3;
 const r=await score(p);assert.equal(r.compatibility.score,72.5);assert.equal(dimension(r,'shrinkage').score,40);assert.equal(dimension(r,'staining').score,50);assert.ok(r.warnings.some(w=>w.code==='SHRINKAGE_GAP'));
});
await check('large gap and grade 1 are bounded at zero per axis',async()=>{
 const p=structuredClone(complete);p.items[0].measurement.shrinkage_pct=100;p.items[1].measurement.shrinkage_pct=-100;p.items[0].measurement.staining_grade=1;
 const r=await score(p);assert.equal(dimension(r,'shrinkage').score,0);assert.equal(dimension(r,'staining').score,0);assert.equal(r.compatibility.score,50);
});
await check('unmatched conditions do not earn shrinkage points',async()=>{
 const p=structuredClone(complete);p.items[0].measurement.wash_temp_c=40;
 const r=await score(p);assert.equal(r.shrinkage_difference_pp,null);assert.equal(dimension(r,'shrinkage').score,0);assert.equal(r.compatibility.score,75);
});
await check('same request and reversed order give deterministic points',async()=>{
 const a=await score(complete);const b=await score(complete);const p=structuredClone(complete);p.items.reverse();const c=await score(p);
 assert.deepEqual(a,b);assert.equal(a.compatibility.score,c.compatibility.score);
});
await check('three fabrics generate all pairs and arithmetic mean',async()=>{
 const p=structuredClone(complete);p.items.push({...structuredClone(p.items[0]),fabric_id:'nylon100',nylon_type:'nylon6',heat_set:true,coating:'none'});
 const r=await score(p);const pairs=r.compatibility.pairs;assert.equal(pairs.length,3);assert.equal(r.compatibility.score,Math.round(pairs.reduce((s,p)=>s+p.score,0)/3*10)/10);
 assert.equal(r.compatibility.min_pair_score,Math.min(...pairs.map(p=>p.score)));
});
await check('same material with distinct samples stays supported',async()=>{
 const p={purpose:'재단',items:[{fabric_id:'denim-cotton100',sample_id:'A'},{fabric_id:'denim-cotton100',sample_id:'B'}]};
 const r=await score(p);assert.equal(r.compatibility.pairs.length,1);assert.deepEqual(r.compatibility.pairs[0].sample_ids,['A','B']);
});
await check('invalid payloads cannot bypass core validation',async()=>{
 for(const p of [{purpose:'x',items:[]},{purpose:'x',items:[{fabric_id:'missing'},{fabric_id:'cotton65-poly35'}]},{purpose:'x',items:[{fabric_id:'denim-cotton100'},{fabric_id:'denim-cotton100'}]}])await assert.rejects(score(p),e=>e.status===400&&e.code==='22023');
});
await check('nylon wool research numbers never become physical measurements',async()=>{
 const r=await score({purpose:'가방',items:[{fabric_id:'nylon100'},{fabric_id:'wool100'}]});
 assert.equal(r.shrinkage_difference_pp,null);assert.equal(dimension(r,'shrinkage').score,0);assert.equal(dimension(r,'staining').score,0);assert.ok(r.compatibility.score<=25);
 const ids=new Set((await api.listSources()).map(s=>s.id));for(const pair of r.compatibility.pairs)for(const id of pair.source_ids)assert.ok(ids.has(id));
});
console.log(`${passed} scored API checks passed (read/calculation only)`);
