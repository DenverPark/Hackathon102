const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const G=require('./guide-evidence.js'),methods=require('./guide-methods.js');
const src=fs.readFileSync('app.js','utf8');const component=src.slice(src.indexOf('async function renderEvidenceGuide('),src.indexOf('// 5페이지는 main'));
const listeners={};const target={innerHTML:'',querySelector(key){return {addEventListener(ev,fn){listeners[key]=fn;}}}};
const rows={1:[{property:'shrinkage'},{property:'staining'}],2:[{property:'felting_shrinkage'}]};
const snapshot={fabrics:[{id:1,name:'나일론'},{id:2,name:'울'}],pairs:[{fabric_a_id:1,fabric_b_id:2}]};let step='';
const ctx={analysis:snapshot,currentStep:'guide',GuideEvidence:{getSelected:async()=>({byId:rows,sources:[]}),recommendations:G.recommendations},GuideMethods:methods,escape:x=>String(x),guideRecord:()=>'<p>연구 기록</p>',switchStep:x=>{step=x},console};
(async()=>{vm.runInNewContext(component+'; this.render=renderEvidenceGuide;',ctx);await ctx.render(target);for(const word of ['나일론 + 울','집에서 참고 관찰','준비물 또는 준비 정보','확인 순서','DB 연구 기록과 출처','5단계 조치 확인'])assert(target.innerHTML.includes(word),word);assert(!target.innerHTML.includes('펠팅 수축'));assert(!target.innerHTML.includes('시험기관 확인 권장'));listeners['[data-guide-next]']();assert.equal(step,'action');console.log('PASS: guide renders DB-specific methods, references and 5th page navigation');})().catch(e=>{console.error(e);process.exit(1)});
