import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);
const cases=[['denim-cotton100','cotton65-poly35',85.5],['nylon100','denim-cotton100',76.5],['nylon100','cotton65-poly35',76.5],['wool100','nylon100',60],['wool100','denim-cotton100',68.6],['wool100','cotton65-poly35',68.6]];
for(const [a,b,expected] of cases){const r=await api.analyzeCatalogue([a,b]);assert.equal(r.compatibility.score,expected);assert.equal(r.compatibility.pairs[0].dimensions.find(d=>d.id==='staining').score,[a,b].includes('denim-cotton100')?60:70);assert.equal((await api.analyzeCatalogue([b,a])).compatibility.score,expected);assert.match(r.compatibility.disclaimer,/기획용/);}
const multi=await api.analyzeCatalogue(['nylon100','denim-cotton100','wool100']);assert.equal(multi.compatibility.pairs.length,3);assert.equal(multi.compatibility.score,Math.round(multi.compatibility.pairs.reduce((s,p)=>s+p.score,0)/3*10)/10);assert.equal(multi.compatibility.pairs.find(p=>p.fabric_ids.includes('wool100')).dimensions.find(d=>d.id==='stretch').score,null);
for(const bad of [[],['nylon100','nylon100'],['missing','wool100'],['nylon100',123]])await assert.rejects(api.analyzeCatalogue(bad),e=>e.status===400&&e.code==='22023');
console.log('PASS six combinations, reversed order, withheld metrics, multiple pairs and input validation');
