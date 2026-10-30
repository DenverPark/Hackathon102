const assert = require('node:assert/strict');
const {recommendations}=require('./guide-evidence.js');
const e={1:[{property:'shrinkage'},{property:'staining'}],2:[{property:'felting_shrinkage'},{property:'staining'}],3:[{property:'shrinkage'},{property:'thickness'},{property:'color_change'}]};
const nylonWool=recommendations([1,2],e);assert.deepEqual(nylonWool.map(x=>x.property),['staining','shrinkage']);assert.deepEqual(nylonWool.find(x=>x.property==='staining').perFabric.map(x=>x.length),[1,1]);assert.deepEqual(nylonWool.find(x=>x.property==='shrinkage').perFabric.map(x=>x.length),[1,0]);
const nylonDenim=recommendations([1,3],e);assert.deepEqual(nylonDenim.map(x=>x.property),['staining','shrinkage','color_change']);assert.deepEqual(recommendations([4,5],{}),[]);assert.deepEqual(recommendations([2,3],{2:[{property:'felting_shrinkage'}],3:[{property:'thickness'}]}),[]);
console.log('PASS: home-only pair-specific selection, one-sided evidence, no unsupported recommendations');
