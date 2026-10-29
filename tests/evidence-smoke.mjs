import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);const ids=['nylon100','wool100','denim-cotton100','cotton65-poly35'];
const sources=new Set((await api.listSources()).map(s=>s.id));
for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const r=await api.analyzeEvidence([ids[i],ids[j]]);assert.equal(r.compatibility.score,null);assert.equal(r.compatibility.pairs[0].score,null);for(const d of r.compatibility.dimensions){assert.equal(d.score,null);for(const id of d.source_ids)assert.ok(sources.has(id));}}
const r=await api.analyzeEvidence(ids.slice(0,3));assert.equal(r.compatibility.pairs.length,3);assert.ok(r.compatibility.pairs.every(p=>p.status==='not_assessable'));
for(const v of [[],['nylon100','nylon100'],['missing','wool100']])await assert.rejects(api.analyzeEvidence(v),e=>e.status===400&&e.code==='22023');
console.log('PASS all six pairs with no invented scores, source links, three-fabric pairs and validation');
