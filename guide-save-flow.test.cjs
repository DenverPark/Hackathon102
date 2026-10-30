const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const G=require('./guide-evidence.js'),protocols=require('./guide-protocols.js'),Store=require('./test-records.js');
const src=fs.readFileSync('app.js','utf8'),code=src.slice(src.indexOf('const guideResultLabels='),src.indexOf('// 5페이지는 main'));
let saved=null;const storage={getItem:()=>saved,setItem:(_k,v)=>{saved=v}};
const handlers={},status={textContent:''},history={innerHTML:'',querySelectorAll:()=>[]};
function field(kind,value){const el={value,dataset:{},closest:()=>({querySelector:()=>status}),hasAttribute:k=>k===`data-guide-${kind}`,addEventListener:(_e,fn)=>{handlers[kind]=fn}};el.dataset[kind==='result'?'guideResult':'guideNotes']='1-3-shrinkage';return el;}
const result=field('result','3'),notes=field('notes','30도');
const button={dataset:{guideSave:'1-3-shrinkage',pairIndex:'0',property:'shrinkage'},addEventListener:(_e,fn)=>{handlers.save=fn},closest:()=>({querySelector:()=>status})};
const target={innerHTML:'',querySelector:key=>key==='[data-history-list]'?history:{addEventListener:(_e,fn)=>{handlers[key]=fn}},querySelectorAll:key=>key==='[data-guide-save]'?[button]:key.includes('[data-guide-result]')?[result,notes]:[]};
const rows={1:[{property:'shrinkage',conditions:{},reported_value:{}}],3:[{property:'shrinkage',conditions:{},reported_value:{}}]},snap={fabrics:[{id:1,name:'나일론'},{id:3,name:'데님'}],pairs:[{fabric_a_id:1,fabric_b_id:3,nameA:'나일론',nameB:'데님'}]};
const ctx={analysis:snap,currentStep:'guide',guideResultInputs:{},projectPurpose:'가방',localStorage:storage,TestRecordStore:Store,guideConditionLabels:{},guideValue:x=>String(x??'미기재'),GuideEvidence:{getSelected:async()=>({byId:rows,sources:[]}),recommendations:G.recommendations},GuideProtocols:protocols,escape:String,switchStep:()=>{},console,URL};
(async()=>{vm.runInNewContext(code+';this.run=renderEvidenceGuide',ctx);await ctx.run(target);handlers.save();assert(status.textContent.includes('저장하지 못했습니다'));handlers.result();handlers.notes();handlers.save();assert(status.textContent.includes('저장했습니다'));assert.equal(Store.read(storage)[0].purpose,'가방');assert.equal(Store.read(storage)[0].value,'3');assert(history.innerHTML.includes('나일론 + 데님'));console.log('PASS: guide result entry, explicit local save, purpose and history');})().catch(e=>{console.error(e);process.exit(1)});
