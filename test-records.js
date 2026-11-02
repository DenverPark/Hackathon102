// Device-local test records; updates to one active result retain its record ID.
const TestRecordStore = (() => {
  const key='layermatch.test-records.v1';
  function read(storage){const raw=storage.getItem(key);if(raw===null)return [];let records;try{records=JSON.parse(raw);}catch{throw new Error('저장된 기록을 읽을 수 없습니다.');}if(!Array.isArray(records))throw new Error('저장된 기록 형식이 올바르지 않습니다.');return records;}
  function save(storage,record,recordId=null){
    if(!record || typeof record.value!=='string' || !record.value.trim() || !Array.isArray(record.pair) || record.pair.length!==2 || !record.property)throw new Error('결과를 입력한 뒤 저장해 주세요.');
    if(record.property==='shrinkage' && (!Number.isFinite(Number(record.value)) || Number(record.value)<0))throw new Error('수축률 차이는 0 이상의 숫자로 입력해 주세요.');
    if(record.property!=='shrinkage' && !['관찰됨','관찰되지 않음','판단 어려움'].includes(record.value))throw new Error('관찰 결과를 선택해 주세요.');
    const records=read(storage);const now=new Date().toISOString();
    const index=recordId?records.findIndex(r=>r.id===recordId && r.property===record.property && Array.isArray(r.pair) && r.pair.length===2 && r.pair.every((v,i)=>v===record.pair[i])):-1;
    let item;if(index>=0){item={...records[index],...record,id:records[index].id,createdAt:records[index].createdAt,updatedAt:now};records.splice(index,1);}
    else{item={...record,id:globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,createdAt:now};}
    records.unshift(item);storage.setItem(key,JSON.stringify(records));return item;
  }
  function remove(storage,id){const records=read(storage);const next=records.filter(record=>record.id!==id);if(next.length===records.length)return false;storage.setItem(key,JSON.stringify(next));return true;}
  return {read,save,remove};
})();
if(typeof module!=='undefined')module.exports=TestRecordStore;
