import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);
const ids=['nylon100','wool100','denim-cotton100','cotton65-poly35','cotton100','polyester100'];
const r=await api.analyzeCatalogue(ids);assert.equal(r.fabric_snapshots.length,6);assert.equal(r.compatibility.pairs.length,15);assert.equal(new Set(r.compatibility.pairs.map(p=>p.fabric_ids.slice().sort().join('|'))).size,15);assert.equal(r.compatibility.score,Math.round(r.compatibility.pairs.reduce((n,p)=>n+p.score,0)/15*10)/10);
for(const invalid of [ids.slice(0,1),[...ids,'extra'],[...ids.slice(0,5),ids[0]]])await assert.rejects(api.analyzeCatalogue(invalid),e=>e.status===400&&e.code==='22023');
const e=await api.analyzeEvidence(ids);assert.equal(e.compatibility.pairs.length,15);assert.equal(e.compatibility.score,null);
console.log('PASS six selections, fifteen unique pairs, average, invalid limits and evidence API');
