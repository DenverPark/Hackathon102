const assert = require('node:assert/strict');
const {recommendations}=require('./guide-evidence.js');
const e={1:[{property:'shrinkage'},{property:'staining'}],2:[{property:'felting_shrinkage'},{property:'staining'}],3:[{property:'shrinkage'},{property:'thickness'}]};
const nylonWool=recommendations([1,2],e);assert.deepEqual(nylonWool.map(x=>x.property),['shrinkage','felting_shrinkage','staining']);assert.deepEqual(nylonWool.find(x=>x.property==='staining').perFabric.map(x=>x.length),[1,1]);
const nylonDenim=recommendations([1,3],e);assert.deepEqual(nylonDenim.map(x=>x.property),['shrinkage','staining','thickness']);assert.deepEqual(recommendations([4,5],{}),[]);
console.log('PASS: pair-specific records, common and one-sided tests, missing evidence');
