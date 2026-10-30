const assert=require('node:assert/strict');const store=require('./test-records.js');
function memory(initial=null){let data=initial;return {getItem:()=>data,setItem:(_key,value)=>{data=value},raw:()=>data}}
let disk=memory();assert.deepEqual(store.read(disk),[]);
const base={pair:['데님','나일론'],property:'shrinkage',label:'수축률 차이',value:'3',notes:'30도',purpose:'가방'};
const first=store.save(disk,base);const next=store.save(disk,{...base,value:'1'});assert.equal(store.read(disk).length,2);assert.notEqual(first.id,next.id);assert.equal(store.read(disk)[1].notes,'30도');assert.equal(store.remove(disk,first.id),true);assert.equal(store.read(disk)[0].id,next.id);assert.equal(store.remove(disk,'absent'),false);
for(const v of ['','-2','abc','Infinity'])assert.throws(()=>store.save(disk,{...base,value:v}));
const corrupt=memory('not-json');assert.throws(()=>store.save(corrupt,base));assert.equal(corrupt.raw(),'not-json');
assert.throws(()=>store.save({getItem:()=>null,setItem:()=>{throw Error('blocked')}},base));
console.log('PASS: persistent local save, retrieval, deletion, input validation and storage failure');
