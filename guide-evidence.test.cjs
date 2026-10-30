const assert = require('node:assert/strict');
const {recommendations}=require('./guide-evidence.js');
const e={1:[{property:'shrinkage'},{property:'staining'}],2:[{property:'felting_shrinkage'},{property:'staining'}],3:[{property:'shrinkage'},{property:'thickness'},{property:'color_change'}]};
const nylonWool=recommendations([1,2],e);assert.deepEqual(nylonWool.map(x=>x.property),['staining','shrinkage']);assert.deepEqual(nylonWool.find(x=>x.property==='shrinkage').perFabric.map(x=>x.map(y=>y.property)),[['shrinkage'],['felting_shrinkage']]);
const nylonDenim=recommendations([1,3],e);assert.deepEqual(nylonDenim.map(x=>x.property),['staining','shrinkage','color_change']);assert.deepEqual(recommendations([4,5],{}),[]);assert.deepEqual(recommendations([2,3],{2:[{property:'felting_shrinkage'}],3:[{property:'thickness'}]}).map(x=>x.property),['shrinkage']);
console.log('PASS: home-only selection associates felting as distinct dimensional evidence without recommending a felting test');
