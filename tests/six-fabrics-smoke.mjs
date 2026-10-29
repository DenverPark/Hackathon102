import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);const ids=['nylon100','wool100','denim-cotton100','cotton65-poly35','cotton100','polyester100'];const fabrics=await api.listFabrics();
for(const id of ids){assert.ok(fabrics.some(f=>f.id===id));if(id==='cotton100'||id==='polyester100'){const f=fabrics.find(x=>x.id===id);assert.equal(f.stretch,'unknown');assert.deepEqual(f.composition,{});const ev=await api.getEvidence(id);assert.equal(ev.length,3);assert.ok(ev.every(e=>e.usable_as_actual_measurement===false));}}
for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const r=await api.analyzeCatalogue([ids[i],ids[j]]);assert.ok(Number.isFinite(r.compatibility.score));assert.equal(r.compatibility.dimensions.find(d=>d.id==='staining').score,[ids[i],ids[j]].includes('denim-cotton100')?60:70);if(i>=4||j>=4)assert.equal(r.compatibility.dimensions.find(d=>d.id==='stretch').score,null);}
console.log('PASS 6 fabrics, 15 pairs, evidence boundaries and withheld dimensions');
