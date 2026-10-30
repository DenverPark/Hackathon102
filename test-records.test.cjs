const assert=require('node:assert/strict');const store=require('./test-records.js');
function memory(initial=null){let data=initial;return {getItem:()=>data,setItem:(_key,value)=>{data=value},raw:()=>data}}
let disk=memory();assert.deepEqual(store.read(disk),[]);
const base={pair:['데님','나일론'],property:'shrinkage',label:'수축률 차이',value:'3',notes:'30도',purpose:'가방'};
const first=store.save(disk,base);const changed=store.save(disk,{...base,value:'4',notes:'수정'},first.id);assert.equal(changed.id,first.id);assert.equal(changed.createdAt,first.createdAt);assert.equal(store.read(disk).length,1);assert.equal(store.read(disk)[0].notes,'수정');
const next=store.save(disk,{...base,value:'1'});assert.equal(store.read(disk).length,2);assert.notEqual(first.id,next.id);assert.equal(store.remove(disk,first.id),true);assert.equal(store.remove(disk,'absent'),false);
const other=store.save(disk,{...base,pair:['울','면']},next.id);assert.notEqual(other.id,next.id);assert.equal(store.read(disk).length,2);
for(const v of ['','-2','abc','Infinity'])assert.throws(()=>store.save(disk,{...base,value:v}));
const corrupt=memory('not-json');assert.throws(()=>store.save(corrupt,base));assert.equal(corrupt.raw(),'not-json');assert.throws(()=>store.save({getItem:()=>null,setItem:()=>{throw Error('blocked')}},base));
console.log('PASS: auto-save upsert, separate records, validation, deletion and storage failure');
