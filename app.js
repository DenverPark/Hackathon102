import { API } from './api.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
function reviewSelect(field, label, options, value) {
  return `<label class="review-field"><span>${escape(label)}</span><select data-field="${field}">${options.map(([v,t])=>`<option value="${v}" ${String(value ?? 'unknown') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
}
function renderReview() {
  const list = [...selected].map(id=>fabrics.find(f=>f.id===id)).filter(Boolean);
  $('#selected-summary').innerHTML = `<div class="review-heading"><div><span class="review-eyebrow">조합 준비</span><h2>선택한 원단을 확인하세요</h2><p>만들고 싶은 제품과 원단 상태를 알려주세요.</p></div><span class="review-count">${list.length}<small>개 선택</small></span></div>
    <div class="purpose-panel"><label for="purpose">무엇을 만들고 싶으세요?<span class="field-required">필수</span></label><input id="purpose" maxlength="200" required value="${escape(purpose)}" placeholder="예: 데님과 나일론을 조합한 숄더백" aria-describedby="purpose-hint"><div class="purpose-presets" aria-label="제작 목적 예시">${['셔츠·블라우스','가방·파우치','의류 리폼','생활 소품'].map(label=>`<button type="button" data-purpose="${label}" aria-pressed="${purpose===label}">${label}</button>`).join('')}</div><p id="purpose-hint">제작 목적은 분석할 원단 조합과 함께 전달됩니다.</p></div>`;
  $('#purpose').addEventListener('input', e=>{ purpose=e.target.value; invalidate(); updatePurposePresets(); updateAnalyzeButton(); });
  $('#selected-fabrics').innerHTML = list.map((f,index) => {
    const sample = samples.get(f.id);
    const card = selectionCards.find(c=>c.id===f.id);
    const composition = Object.entries(f.composition).map(([key,value])=>`${({cotton:'면',polyester:'폴리에스터',nylon:'나일론',wool:'울'})[key] || key} ${value}%`).join(' · ');
    const stretch = f.stretch==='non_stretch'?'비신축':f.stretch==='construction_dependent'?'조직에 따라 다름':f.stretch;
    return `<article class="sample-card" data-id="${escape(f.id)}" aria-label="${escape(card?.name || f.name)} 원단 정보"><header class="review-card-header"><span class="review-swatch" style="background:${card?.color || '#bbb'}" aria-hidden="true"></span><div class="review-card-title"><span class="review-sample-number">원단 ${index+1}</span><h3>${escape(card?.name || f.name)}</h3><p>${escape(composition)}</p></div><button class="review-remove" data-remove="${escape(f.id)}" aria-label="${escape(f.name)} 선택 해제">선택 해제</button></header>
    <div class="review-material-tags"><span>${escape(f.structure)}</span><span>${escape(stretch)}</span></div>
    <div class="review-basic-fields"><div class="review-section-label">내 원단 상태<span>모르는 항목은 미확인으로 두세요</span></div><div class="sample-fields">${reviewSelect('color_depth','색상 농도',[['unknown','미확인'],['dark','진한색'],['medium','중간색'],['light','밝은색']],sample.color_depth)}${reviewSelect('prewashed','사전 세탁',[['unknown','미확인'],['true','세탁했어요'],['false','세탁하지 않았어요']],sample.prewashed)}</div></div>
    ${processingFields(f,sample)}
    <details class="review-research"><summary><span>원단 특성과 연구 출처</span><span class="review-disclosure-hint">참고자료</span></summary><div class="review-research-body"><p class="review-reference-note">카탈로그 정보는 참고자료입니다. 실제 원단의 상태와 측정값을 대신하지 않습니다.</p><p>${escape(f.summary)}</p>${f.profile_details?.reported_care ? `<p>${escape(f.profile_details.reported_care)}</p>` : ''}<h4>추가로 확인할 정보</h4><ul class="review-gaps">${f.data_gaps.map(g=>`<li>${escape(g)}</li>`).join('')}</ul><h4>자료 출처</h4><ul class="review-source-list">${sourceList(f.source_ids)}</ul><button class="btn btn-ghost evidence-load" data-evidence="${escape(f.id)}">시험 조건과 연구 수치 보기</button><div class="evidence-content" aria-live="polite"></div></div></details></article>`;
  }).join('') || `<div class="review-empty"><span aria-hidden="true">＋</span><h3>함께 확인할 원단을 골라주세요</h3><p>원단을 2개 이상 선택하면 조합을 분석할 수 있어요.</p><button class="btn btn-primary" data-select-more>원단 고르기</button></div>`;
  updateAnalyzeButton();
}
function updatePurposePresets(){
  $$('#selected-summary [data-purpose]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.purpose===purpose)));
}
$('#selected-summary').addEventListener('click', e=>{
  const button=e.target.closest('[data-purpose]');if(!button)return;
  purpose=button.dataset.purpose;$('#purpose').value=purpose;invalidate();updatePurposePresets();updateAnalyzeButton();
});
let purpose = '';
function processingFields(f, sample) {
  let fields='';
  const boolOptions=[['unknown','미확인'],['true','가공되어 있어요'],['false','가공되지 않았어요']];
  if(f.category==='nylon')fields=reviewSelect('nylon_type','나일론 종류',[['unknown','미확인'],['nylon6','나일론 6'],['nylon66','나일론 6,6']],sample.nylon_type)+reviewSelect('coating','코팅·가공',[['unknown','미확인'],['none','코팅 없음'],['pu','PU'],['acrylic','아크릴'],['dwr','발수(DWR)'],['multiple','복합 가공'],['other','기타']],sample.coating)+reviewSelect('heat_set','열고정 여부',boolOptions,sample.heat_set);
  if(f.category==='wool')fields=reviewSelect('construction','직물·편물 구분',[['unknown','미확인'],['woven','직물'],['knit','편물']],sample.construction)+reviewSelect('shrinkproofed','방축 가공 여부',boolOptions,sample.shrinkproofed);
  return fields?`<details class="review-processing"><summary><span>소재별 추가 정보</span><span class="review-disclosure-hint">선택 입력</span></summary><div class="review-processing-body"><p>관리 라벨이나 원단 설명에서 확인한 정보만 선택해주세요.</p><div class="sample-fields">${fields}</div></div></details>`:'';
}
function updateAnalyzeButton(){
  const needsSelection=selected.size<2 || selected.size>5;
  $('#btn-test').disabled=busy || needsSelection || !purpose.trim();
  const helper=$('#review-next-hint');
  if(helper)helper.textContent=needsSelection?'함께 확인할 원단을 2~5개 선택해주세요.':!purpose.trim()?'제작 목적을 입력해주세요.':`${selected.size}개 원단의 주의사항과 필요한 테스트를 확인합니다.`;
}
$('#selected-fabrics').addEventListener('change',e=>{
  const field=e.target.dataset.field; if(!field)return;
  const id=e.target.closest('[data-id]').dataset.id;
  samples.get(id)[field]=['prewashed','heat_set','shrinkproofed'].includes(field)?(e.target.value==='unknown'?null:e.target.value==='true'):e.target.value;
  invalidate();
});
$('#selected-fabrics').addEventListener('click',async e=>{
  if(e.target.closest('[data-select-more]')){switchStep('select');return;}
  const remove=e.target.closest('[data-remove]');
  if(remove){selected.delete(remove.dataset.remove);invalidate();renderFabrics();renderReview();return;}
  const btn=e.target.closest('[data-evidence]'); if(!btn)return;
  const target=btn.parentElement.querySelector('.evidence-content');
  btn.disabled=true; target.textContent='연구 근거 조회 중...';
  try {
    const records=await API.getEvidence(btn.dataset.evidence);
    target.innerHTML=records.map(renderResearchRecord).join('') || '<p>등록된 연구 근거가 없습니다.</p>';
  } catch(error){target.textContent=`조회 실패: ${error.message}`;} finally{btn.disabled=false;}
});
// Research stays separate from user inputs and is presented as readable reference data.
const researchLabels = {
  warp_pct:'경사 수축률 (%)',weft_pct:'위사 수축률 (%)',before_mm:'시험 전 두께 (mm)',after_mm:'시험 후 두께 (mm)',increase_pct_reported:'보고된 두께 증가율 (%)',
  wash_temp_c:'세탁 온도 (℃)',wash_minutes:'세탁 시간 (분)',cycles:'반복 횟수',points:'측정 지점 수',detergent:'세제',drying:'건조 방식',drying_alternatives:'문서에 제시된 건조 방식',environment:'측정 환경',temp_c:'온도 (℃)',rh_pct:'상대습도 (%)',standards_reported:'문서 인용 시험 기준',
  nylon_grade:'나일론 첨부포 오염 등급',acetate_grade:'아세테이트 첨부포 오염 등급',cotton_grade:'면 첨부포 오염 등급',wool_grade:'양모 첨부포 오염 등급',adjacent_fibres:'첨부포 소재',
  care_wash_max_c_reported:'문서의 세탁 온도 (℃)',drying_caution_c_reported:'문서의 건조 주의 온도 (℃)',ironing_max_c_reported:'문서의 다림질 온도 (℃)',heat_exposure_c_reported:'문서의 열 노출 온도 (℃)',coatings_reported:'문서의 코팅 종류',
  profile_range_raw:'원문서의 범위 표기',wash_temp_c_conflicting:'문서 내 온도 불일치 (℃)',wash_conditions:'시험 조건',processing_required:'확인할 가공 정보',shrinkage_kinds:'구분할 수축 종류',reported_handwash_max_c:'문서의 손세탁 온도 (℃)',
  quantity:'측정 항목',not_directional_report_values:'방향별 수축률과 구분 필요',primary_locator:'원문 근거 위치',product:'활용 제품',reported_dimensions_cm:'문서의 재단 크기 (cm)',reported_needle_sizes:'문서의 바늘 규격',reported_body_cm:'문서의 몸판 크기 (cm)',intentional_felting:'의도적 펠트화 사례',reported_seam_cm:'문서의 시접 (cm)',reported_cushion_cm:'문서의 쿠션 크기 (cm)',reported_front_cm:'문서의 앞판 크기 (cm)',reported_back_cm:'문서의 뒷판 크기 (cm)',reported_overlap_cm:'문서의 겹침 분량 (cm)',
  thickness_mm:'두께 (mm)',gsm:'중량 (g/㎡)',warp_shrinkage_pct:'경사 수축률 (%)',weft_shrinkage_pct:'위사 수축률 (%)',first_wash_warp_pct:'첫 세탁 경사 수축률 (%)','10_washes_warp_pct':'10회 세탁 경사 수축률 (%)','10_washes_weft_pct':'10회 세탁 위사 수축률 (%)',sample:'연구 시료',load_kg:'세탁물 무게 (kg)',detergent_g:'세제량 (g)',measurement_repeats:'측정 횟수',use:'해석 시 주의사항',first_wash_increase_pct:'첫 세탁 증가율 (%)','10_washes_increase_pct':'10회 세탁 증가율 (%)',before_L:'시험 전 명도',first_wash_L:'첫 세탁 명도','10_washes_b':'10회 세탁 색 좌표',first_wash_white_L_decrease_pct:'첨부포 명도 감소율 (%)',reported_range_pct:'문서의 수축률 범위 (%)',quantitative_value:'정량 수치',observation:'관찰 내용','10_cycles_mm':'10회 후 두께 (mm)','50_cycles_mm':'50회 후 두께 (mm)',process:'처리 과정',yellow9_grade:'Yellow9 변퇴색 등급',other_dyes_grade:'기타 염료 변퇴색 등급',yellow9_cotton_grade:'Yellow9 면 오염 등급',yellow9_acetate_nylon_grade:'Yellow9 아세테이트·나일론 오염 등급',red11_blue56_cotton_grade:'Red11·Blue56 면 오염 등급'
};
function researchValue(value){
  if(value===null)return '자료에 기재되지 않음';
  if(typeof value==='boolean')return value?'예':'아니요';
  if(Array.isArray(value))return value.map(researchValue).join(' / ');
  if(typeof value==='object')return researchRows(value);
  const terms={cotton:'면',nylon:'나일론',acetate:'아세테이트',polyester:'폴리에스터',acrylic:'아크릴',wool:'양모',shrinkproofed:'방축 가공 여부',construction:'직물·편물 구분',relaxation:'이완 수축',felting:'펠팅 수축',combined:'복합 수축',unknown:'미확인',area_shrinkage:'면적 수축률'};
  return escape(terms[value] || value);
}
function researchRows(values){
  return `<dl class="research-values">${Object.entries(values).filter(([key])=>!['pages','verification_status'].includes(key)).map(([key,value])=>`<div><dt>${escape(researchLabels[key] || '추가 참고 항목')}</dt><dd>${researchValue(value)}</dd></div>`).join('')}</dl>`;
}
function renderResearchRecord(record){
  const titles={shrinkage:'수축률',felting_shrinkage:'펠팅 수축',thickness:'두께 변화',staining:'첨부포 이염',care_and_processing:'관리 및 가공',primary_source_protocol:'원문 시험 조건 대조',upcycling_reference:'활용 사례',profile_report:'조사 프로필',unverified_shrinkage:'수축률 참고 기록',color_change:'색상 변화'};
  return `<details class="evidence-record"><summary>${escape(titles[record.property] || '연구 참고자료')}<span>자세히 보기</span></summary><div class="evidence-record-body"><p class="research-sample">${escape(record.sample_description)}</p>${record.conditions.pages?`<p class="research-page">조사자료 ${escape(record.conditions.pages)}쪽</p>`:''}<h5>자료에 보고된 내용</h5>${researchRows(record.reported_value)}<h5>시험·관찰 조건</h5>${researchRows(record.conditions)}<p class="research-applicability">${escape(record.applicability)}</p><ul class="review-source-list">${sourceList([record.source_id])}</ul></div></details>`;
}
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
