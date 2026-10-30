const GuideEvidence = (() => {
  const config = {url:'https://czxcnvgbrrakyydtdhgh.supabase.co',key:'sb_publishable_1W4lthi1bYNvDKALAtpaBQ_fGJSj3EY'};
  const materialIds={1:'nylon100',2:'wool100',3:'denim-cotton100',4:'cotton65-poly35',5:'cotton100',6:'polyester100'};
  const labels={shrinkage:'세탁 후 길이 변화',felting_shrinkage:'양모 펠팅 수축',staining:'이염',color_change:'색상 변화',thickness:'두께 변화'};
  async function query(path){const response=await fetch(config.url+'/rest/v1/'+path,{headers:{apikey:config.key}});if(!response.ok)throw new Error('연구 DB 조회 실패 ('+response.status+')');return response.json();}
  async function getSelected(ids){
    const dbIds=ids.map(id=>materialIds[id]);if(dbIds.some(id=>!id))throw new Error('선택 원단의 연구 DB 연결을 확인할 수 없습니다.');
    const [records,sources]=await Promise.all([Promise.all(dbIds.map(id=>query('lm_evidence?select=*&fabric_id=eq.'+encodeURIComponent(id)+'&order=id.asc'))),query('lm_sources?select=*&order=id.asc')]);
    return {byId:Object.fromEntries(ids.map((id,i)=>[id,records[i]])),sources};
  }
  function recommendations(pair,byId){
    return Object.entries(labels).map(([property,label])=>({property,label,perFabric:pair.map(id=>(byId[id]||[]).filter(r=>r.property===property))})).filter(item=>item.perFabric.some(list=>list.length));
  }
  return {getSelected,recommendations};
})();
if(typeof module!=='undefined')module.exports=GuideEvidence;
