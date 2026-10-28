// Fabric selection / lookup and combination analysis only.
export function createLayerMatchClient({url,key,getAccessToken=async()=>null,fetcher=fetch}) {
 if(!url||!key)throw new Error('Supabase URL and publishable key are required');
 const request=async(path,body)=>{
  const token=await getAccessToken();
  const response=await fetcher(url.replace(/\/$/,'')+path,{method:body===undefined?'GET':'POST',headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data={message:text};}
  if(!response.ok)throw Object.assign(new Error(data?.message||'Request failed'),{status:response.status,code:data?.code,details:data});
  return data;
 };
 const eq=(field,value)=>field+'=eq.'+encodeURIComponent(value);
 return {
  listFabrics:({query='',category,stretch,limit=20,offset=0}={})=>{
   const safeLimit=Number.isFinite(limit)?Math.max(1,Math.min(50,Math.floor(limit))):20;
   const safeOffset=Number.isFinite(offset)?Math.max(0,Math.floor(offset)):0;
   const p=new URLSearchParams({select:'*',order:'name.asc',limit:String(safeLimit),offset:String(safeOffset)});
   if(query)p.set('name','ilike.*'+String(query).replace(/[*,%_]/g,'')+'*');
   if(category)p.set('category','eq.'+category);
   if(stretch)p.set('stretch','eq.'+stretch);
   return request('/rest/v1/lm_fabrics?'+p);
  },
  getFabric:async id=>(await request('/rest/v1/lm_fabrics?select=*&'+eq('id',id)))[0]??null,
  getEvidence:id=>request('/rest/v1/lm_evidence?select=*&'+eq('fabric_id',id)+'&order=id.asc'),
  listSources:()=>request('/rest/v1/lm_sources?select=*&order=id.asc'),
  analyze:payload=>request('/rest/v1/rpc/lm_analyze',{payload}),
  analyzeScored:payload=>request('/rest/v1/rpc/lm_analyze_scored',{payload}),
  analyzeCatalogue:fabricIds=>request('/rest/v1/rpc/lm_analyze_catalogue',{fabric_ids:fabricIds}),
  calculateShrinkage:(before,after)=>request('/rest/v1/rpc/lm_shrinkage',{before_length:before,after_length:after})
 };
}
