import assert from 'node:assert/strict';
import {createLayerMatchClient} from '../client/layermatch.mjs';
import {supabaseConfig} from '../config.js';
const api=createLayerMatchClient(supabaseConfig);const ids=['nylon100','wool100','denim-cotton100','cotton65-poly35','cotton100','polyester100'];
for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const pair=[ids[i],ids[j]],r=await api.analyzeCatalogue(pair),st=r.compatibility.dimensions.find(x=>x.id==='staining');assert.equal(st.score,pair.includes('denim-cotton100')?60:70);assert.equal(r.compatibility.pairs[0].dimensions.find(x=>x.id==='staining').weight,0);assert.match(r.compatibility.disclaimer,/종합 점수에 포함하지/);}
const a=await api.analyzeCatalogue(ids);assert.equal(a.compatibility.pairs.length,15);assert.equal(a.compatibility.dimensions.find(d=>d.id==='staining').score,66.7);assert.equal(a.compatibility.score,73.9);console.log('PASS all 15 pairs, illustrative staining and unchanged overall score');
