import { API } from './api.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => escape(JSON.stringify(value, null, 2));
let fabrics = [], sources = [], selected = new Set(), analysis = null, busy = false;
const samples = new Map();
const steps = ['select','review','compat','guide','action'];
let currentStep = 'select';
const colors = {denim:'#2D4A7A',blend:'#B0C4B1'};
// Presentation matches main. Only records returned by Supabase are selectable.
const selectionCards = [
  {id:'nylon100',name:'나일론',color:'#2C2C2E',desc:'가볍고 내구성이 뛰어난 합성 섬유',tags:['합성','경량','고강도']},
  {id:'wool100',name:'울',color:'#8E7C6A',desc:'보온성이 우수한 천연 동물성 섬유',tags:['천연','보온','중량']},
  {id:'denim-cotton100',name:'데님',color:'#2D4A7A',desc:'능직으로 짜인 내구성 높은 면직물',tags:['천연','능직','중량']},
  {id:'cotton65-poly35',name:'코튼 폴리에스터 블렌드',color:'#B0C4B1',desc:'면과 폴리에스터를 혼방한 실용적 원단',tags:['혼방','실용','중량']},
  {name:'면직물',color:'#E8D5B7',desc:'통기성과 흡습성이 좋은 천연 면 원단',tags:['천연','통기성','중량']},
  {name:'폴리에스터',color:'#C8D8E4',desc:'구김이 적고 관리가 쉬운 합성 섬유',tags:['합성','경량','속건']},
];
const testNames = {shrinkage:'수축률 비교',staining:'이염 확인'};
const fieldNames = {color_depth:'색상 농도',prewashed:'사전 세탁 여부',staining_grade:'첨부포 이염 등급',comparable_shrinkage:'동일 조건 수축률',measurement:'실측 정보',nylon_type:'나일론 종류',coating:'코팅·가공',heat_set:'열고정 여부',construction:'직물·편물 구분',shrinkproofed:'방축 가공 여부',shrinkage_kind:'수축 종류'};

function errorView(target, error, retry) {
  target.innerHTML = `<div class="empty-state" role="alert"><p>연결에 실패했습니다. ${escape(error.message)}</p><button class="btn btn-primary" data-retry>다시 시도</button></div>`;
  target.querySelector('[data-retry]').addEventListener('click', retry);
}
function switchStep(step) {
  if (busy || !steps.includes(step) || (['compat','guide','action'].includes(step) && !analysis)) return;
  currentStep = step;
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${step}`));
  $$('.step').forEach((p,i) => { p.classList.toggle('active',i === steps.indexOf(step)); p.classList.toggle('done',i < steps.indexOf(step)); });
  $('#floating-bar').classList.toggle('hidden',step !== 'select' || !selected.size);
  if (step === 'review') renderReview();
  if (step === 'guide' || step === 'action') renderHandoff(step);
}
window.switchStep = switchStep;
$$('.step').forEach(el => el.addEventListener('click',() => {
  if (steps.indexOf(el.dataset.step) <= steps.indexOf(currentStep)) switchStep(el.dataset.step);
}));
function invalidate() { analysis = null; }
function sourceList(ids) {
  return ids.map(id => {
    const s = sources.find(s => s.id === id);
    if (!s) return `<li>${escape(id)}</li>`;
    let url; try { const u = new URL(s.url); if (['https:','http:'].includes(u.protocol)) url = u.href; } catch {}
    return `<li>${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a>` : escape(s.title)}<br><small>${escape(s.locator)} · ${escape(s.checked_at)}<br>${escape(s.limitations)}</small></li>`;
  }).join('');
}
function renderFabrics() {
  $('#fabric-list').innerHTML = selectionCards.map(card => {
    const fabric = fabrics.find(f => f.id === card.id);
    const isSelected = !!fabric && selected.has(fabric.id);
    return `<button type="button" class="fabric-card ${isSelected?'selected':''}" ${fabric ? `data-id="${escape(fabric.id)}" aria-pressed="${isSelected}"` : 'disabled'}>
      ${fabric ? `<span class="check-icon">${isSelected?'✓':''}</span>` : '<span class="preparing-badge">준비 중</span>'}
      <span class="color-swatch" style="background:${card.color}"></span>
      <span class="fabric-name">${escape(card.name)}</span><span class="fabric-desc">${escape(card.desc)}</span>
      <span class="fabric-meta">${card.tags.map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</span></button>`;
  }).join('');
  $('#selected-count').textContent = selected.size;
  $('#floating-bar').classList.toggle('hidden',currentStep !== 'select' || !selected.size);
}
$('#fabric-list').addEventListener('click',e => {
  const card = e.target.closest('[data-id]'); if (!card || busy) return;
  const id = card.dataset.id;
  if (selected.has(id)) selected.delete(id);
  else if (selected.size < 5) selected.add(id);
  else return;
  if (!samples.has(id)) samples.set(id,{color_depth:'unknown',prewashed:null});
  invalidate(); renderFabrics();
});
function renderReview() {
  const list = fabrics.filter(f=>selected.has(f.id));
  $('#selected-summary').innerHTML = `<div class="count">${list.length}</div><div class="label">개 원단 선택됨 · 2~5개 선택</div><label class="purpose-label">제작 목적<input id="purpose" maxlength="200" required value="${escape(purpose)}" placeholder="예: 셔츠 제작"></label>`;
  $('#purpose').addEventListener('input', e=>{ purpose=e.target.value; invalidate(); updateAnalyzeButton(); });
  $('#selected-fabrics').innerHTML = list.map(f => {
    const sample = samples.get(f.id);
    return `<article class="sample-card" data-id="${escape(f.id)}"><div class="selected-item"><div class="info"><div class="name">${escape(f.name)}</div><div class="detail">${escape(f.summary)}</div></div><button class="btn-remove" data-remove="${escape(f.id)}" aria-label="${escape(f.name)} 제거">✕</button></div>
    <div class="sample-fields"><label>색상 농도<select data-field="color_depth">${[['unknown','미확인'],['dark','진한색'],['medium','중간색'],['light','밝은색']].map(([v,t])=>`<option value="${v}" ${sample.color_depth===v?'selected':''}>${t}</option>`).join('')}</select></label>
    <label>사전 세탁<select data-field="prewashed">${[['unknown','미확인'],['true','완료'],['false','미실시']].map(([v,t])=>`<option value="${v}" ${String(sample.prewashed??'unknown')===v?'selected':''}>${t}</option>`).join('')}</select></label></div>
    ${processingFields(f, sample)}
    <details><summary>연구 근거와 출처</summary><p>실제 소유 시료의 측정값이 아닌 참고 연구입니다.</p>${f.profile_details?.reported_care ? `<p>${escape(f.profile_details.reported_care)}</p>` : ''}<p>미확인 정보: ${escape(f.data_gaps.join(' · '))}</p><ul>${sourceList(f.source_ids)}</ul><button class="btn btn-ghost" data-evidence="${escape(f.id)}">연구 상세 조회</button><div class="evidence-content"></div></details></article>`;
  }).join('') || '<p>선택된 원단이 없습니다.</p>';
  updateAnalyzeButton();
}
let purpose = '원단 조합 검토';
function processingFields(f, sample) {
  const select = (field, options) => `<label>${escape(fieldNames[field])}<select data-field="${field}">${options.map(([value,label]) => `<option value="${value}" ${String(sample[field] ?? 'unknown') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
  const boolOptions = [['unknown','미확인'],['true','완료'],['false','미가공']];
  if (f.category === 'nylon') return `<div class="sample-fields">${select('nylon_type',[['unknown','미확인'],['nylon6','나일론 6'],['nylon66','나일론 6,6']])}${select('coating',[['unknown','미확인'],['none','코팅 없음'],['pu','PU'],['acrylic','아크릴'],['dwr','발수(DWR)'],['multiple','복합 가공'],['other','기타']])}${select('heat_set',boolOptions)}</div>`;
  if (f.category === 'wool') return `<div class="sample-fields">${select('construction',[['unknown','미확인'],['woven','직물'],['knit','편물']])}${select('shrinkproofed',boolOptions)}</div>`;
  return '';
}
function updateAnalyzeButton(){ $('#btn-test').disabled = busy || selected.size < 2 || selected.size > 5 || !purpose.trim(); }
$('#selected-fabrics').addEventListener('change',e=>{
  const field=e.target.dataset.field; if(!field)return;
  const id=e.target.closest('[data-id]').dataset.id;
  samples.get(id)[field]=['prewashed','heat_set','shrinkproofed'].includes(field)?(e.target.value==='unknown'?null:e.target.value==='true'):e.target.value;
  invalidate();
});
$('#selected-fabrics').addEventListener('click',async e=>{
  const remove=e.target.closest('[data-remove]');
  if(remove){selected.delete(remove.dataset.remove);invalidate();renderFabrics();renderReview();return;}
  const btn=e.target.closest('[data-evidence]'); if(!btn)return;
  const target=btn.parentElement.querySelector('.evidence-content');
  btn.disabled=true; target.textContent='연구 근거 조회 중...';
  try {
    const records=await API.getEvidence(btn.dataset.evidence);
    target.innerHTML=records.map(r=>`<section class="evidence-record"><strong>${escape(r.property)}</strong><p>연구 시료: ${escape(r.sample_description)}</p><pre>${json(r.reported_value)}</pre><p>연구 조건</p><pre>${json(r.conditions)}</pre><p>${escape(r.applicability)}</p><ul>${sourceList([r.source_id])}</ul></section>`).join('') || '<p>등록된 연구 근거가 없습니다.</p>';
  } catch(error){target.textContent=`조회 실패: ${error.message}`;} finally{btn.disabled=false;}
});
$('#btn-test').addEventListener('click',analyze);
async function analyze(){
  if(busy || selected.size<2 || !purpose.trim())return;
  analysis=null;
  switchStep('review');
  currentStep='compat';
  $$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-compat'));
  $$('.step').forEach((p,i)=>{p.classList.toggle('active',i===2);p.classList.toggle('done',i<2);});
  $('#floating-bar').classList.add('hidden');
  busy=true; updateAnalyzeButton();
  $('#compat-content').innerHTML='<div class="loading-state" role="status"><div class="spinner"></div><p>Supabase에서 조합 분석 중...</p></div>';
  try {
    analysis=await API.analyze({purpose:purpose.trim(),items:[...selected].map((id,i)=>({fabric_id:id,sample_id:`sample-${i+1}`,...samples.get(id)}))});
    renderAnalysis();
    window.dispatchEvent(new CustomEvent('layermatch:analysis',{detail:structuredClone(analysis)}));
  } catch(error){errorView($('#compat-content'),error,analyze);}
  finally{busy=false;updateAnalyzeButton();}
}
function renderAnalysis(){
  const labels={insufficient_data:'실측 정보 부족',needs_testing:'추가 테스트 필요',no_rule_triggered:'현재 규칙의 주의 조건 없음'};
  $('#compat-content').innerHTML=`<div class="result-header"><div class="result-title">${escape(labels[analysis.status] || analysis.status)}</div><p>${escape(analysis.purpose)}</p><p>현재 분석은 안전·생산 가능 여부를 확정하지 않습니다.</p></div>
  <div class="combo-chips">${analysis.fabric_snapshots.map(f=>`<span class="combo-chip">${escape(f.name)}</span>`).join('')}</div>
  <p>수축률 차이: ${analysis.shrinkage_difference_pp===null?'동일 조건 실측 정보가 없어 비교 불가':`${escape(analysis.shrinkage_difference_pp)}%포인트`}</p>
  <h2 class="section-title">확인할 사항</h2>${analysis.warnings.map(w=>`<article class="pair-card"><p>${escape(w.message)}</p>${w.rule_status?`<small>규칙 상태: ${escape(w.rule_status)}</small>`:''}<ul>${sourceList(w.source_ids)}</ul></article>`).join('') || '<p>현재 규칙이 발동하지 않았습니다. 안전 판정은 아닙니다.</p>'}
  <details open><summary>미확인 정보 (${analysis.unknown_fields.length})</summary><ul>${analysis.unknown_fields.map(u=>`<li>${escape(u.sample_id ? u.sample_id.replace('sample-','시료 ') : '')} ${escape(fieldNames[u.field] || u.field)} ${escape(u.reason || '')}</li>`).join('')}</ul></details>
  <h2 class="section-title">권장 테스트 종류</h2>${analysis.recommended_tests.map(t=>`<article class="pair-card"><strong>${escape(testNames[t.test_type] || t.test_type)}</strong><p>${escape(t.reason)}</p></article>`).join('')}
  <p class="integration-note">${escape(analysis.disclaimer)}<br>${escape(analysis.purpose_usage)}<br>규칙 버전: ${escape(analysis.rule_version)} · 실측 기준: 사용자 보고값만 사용</p>
  <div class="action-bar"><button class="btn btn-ghost" data-back>← 선택 조회</button><button class="btn btn-primary" data-guide>테스트 가이드 →</button></div>`;
  $('#compat-content [data-back]').addEventListener('click',()=>switchStep('review'));
  $('#compat-content [data-guide]').addEventListener('click',()=>switchStep('guide'));
}
function renderHandoff(step){
  const target=step==='guide'?$('#guide-content'):$('#action-content');
  target.innerHTML=`<div class="guide-intro"><h2>${step==='guide'?'테스트 가이드 연결':'조치 추천 연결'}</h2><p>상세 가이드·결과 저장·조치 추천은 팀 담당자의 백엔드 연결 후 제공됩니다.</p></div>
  ${analysis.recommended_tests.map(t=>`<article class="pair-card"><strong>${escape(testNames[t.test_type] || t.test_type)}</strong><p>${escape(t.reason)}</p></article>`).join('')}
  <div class="action-bar"><button class="btn btn-ghost" data-back>← 분석 결과</button></div>`;
  target.querySelector('[data-back]').addEventListener('click',()=>switchStep('compat'));
}
// Team integration: full server response and recommended_tests[].test_type, no mock save.
window.LayerMatch=Object.freeze({getAnalysis:()=>analysis?structuredClone(analysis):null});
async function init(){
  $('#fabric-list').innerHTML='<p role="status">Supabase 원단 목록 조회 중...</p>';
  try{[fabrics,sources]=await Promise.all([API.listFabrics(),API.listSources()]);renderFabrics();}
  catch(error){errorView($('#fabric-list'),error,init);}
}
init();
