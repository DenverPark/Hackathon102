import { API } from './api.js?v=0.8.3';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let fabrics = [], sources = [], selected = new Set(), analysis = null, busy = false;
const steps = ['select','review','compat','guide','action'];
let currentStep = 'select';
let washResult = {};
const colors = {denim:'#2D4A7A',blend:'#B0C4B1'};
// Presentation matches main. Only records returned by Supabase are selectable.
const selectionCards = [
  {id:'nylon100',name:'나일론',color:'#2C2C2E',desc:'가볍고 내구성이 뛰어난 합성 섬유',tags:['합성','경량','고강도']},
  {id:'wool100',name:'울',color:'#8E7C6A',desc:'보온성이 우수한 천연 동물성 섬유',tags:['천연','보온','중량']},
  {id:'denim-cotton100',name:'데님',color:'#2D4A7A',desc:'능직으로 짜인 내구성 높은 면직물',tags:['천연','능직','중량']},
  {id:'cotton65-poly35',name:'코튼 폴리에스터 블렌드',color:'#B0C4B1',desc:'면과 폴리에스터를 혼방한 실용적 원단',tags:['혼방','실용','중량']},
  {id:'cotton100',name:'면직물',color:'#E8D5B7',desc:'통기성과 흡습성이 좋은 천연 면 원단',tags:['천연','통기성','중량']},
  {id:'polyester100',name:'폴리에스터',color:'#C8D8E4',desc:'구김이 적고 관리가 쉬운 합성 섬유',tags:['합성','경량','속건']},
];
const testNames = {shrinkage:'수축률 비교',staining:'이염 확인'};
const fieldNames = {color_depth:'색상 농도',prewashed:'사전 세탁 여부',staining_grade:'첨부포 이염 등급',comparable_shrinkage:'동일 조건 수축률',measurement:'실측 정보',nylon_type:'나일론 종류',coating:'코팅·가공',heat_set:'열고정 여부',construction:'직물·편물 구분',shrinkproofed:'방축 가공 여부',shrinkage_kind:'수축 종류'};

function errorView(target, error, retry) {
  target.innerHTML = `<div class="empty-state" role="alert"><p>연결에 실패했습니다. ${escape(error.message)}</p><button class="btn btn-primary" data-retry>다시 시도</button></div>`;
  target.querySelector('[data-retry]').addEventListener('click', retry);
}
function updateSteps() {
  const currentIndex=steps.indexOf(currentStep);
  $$('.step').forEach((button,i)=>{
    button.classList.toggle('active',i===currentIndex);
    button.classList.toggle('done',i<currentIndex);
    button.disabled=busy || i>=currentIndex;
    if(i===currentIndex) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
}
function switchStep(step) {
  if (busy || !steps.includes(step) || (['compat','guide','action'].includes(step) && !analysis)) return;
  currentStep = step;
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${step}`));
  updateSteps();
  $('#floating-bar').classList.toggle('hidden',step !== 'select' || !selected.size);
  if (step === 'review') renderReview();
  if (step === 'guide' || step === 'action') renderHandoff(step);
}
window.switchStep = switchStep;
$('#home-link').addEventListener('click',()=>{ if (!busy) { selected.clear(); invalidate(); switchStep('select'); renderFabrics(); window.scrollTo({top:0,behavior:'smooth'}); } });
$$('.step').forEach(el => el.addEventListener('click',() => {
  if (steps.indexOf(el.dataset.step) <= steps.indexOf(currentStep)) switchStep(el.dataset.step);
}));
function invalidate() { analysis = null; washResult = {}; }
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
  else if (selected.size < 6) selected.add(id);
  else return;
  invalidate(); renderFabrics();
});
function renderReview() {
  const list=[...selected].map(id=>fabrics.find(f=>f.id===id)).filter(Boolean);
  $('#selected-summary').innerHTML=`<div class="review-heading"><div><span class="review-eyebrow">조합 준비</span><h2>선택한 원단을 확인하세요</h2><p>선택한 원단의 특성을 바탕으로 조합을 살펴볼게요.</p></div><span class="review-count">${list.length}<small>개 선택</small></span></div>`;
  $('#selected-fabrics').innerHTML=list.map((f,index)=>{
    const card=selectionCards.find(c=>c.id===f.id);
    const composition=Object.entries(f.composition).map(([key,value])=>`${({cotton:'면',polyester:'폴리에스터',nylon:'나일론',wool:'울'})[key] || key} ${value}%`).join(' · ');
    const stretch=f.stretch==='non_stretch'?'비신축':f.stretch==='construction_dependent'?'조직에 따라 다름':f.stretch==='unknown'?'':f.stretch;
    return `<article class="sample-card" data-id="${escape(f.id)}" aria-label="${escape(card?.name || f.name)} 원단 정보"><header class="review-card-header"><span class="review-swatch" style="background:${card?.color || '#bbb'}" aria-hidden="true"></span><div class="review-card-title"><span class="review-sample-number">원단 ${index+1}</span><h3>${escape(card?.name || f.name)}</h3>${composition?`<p>${escape(composition)}</p>`:''}</div><button class="review-remove" data-remove="${escape(f.id)}" aria-label="${escape(f.name)} 선택 해제">선택 해제</button></header>
    ${[f.structure,stretch].filter(v=>v && !String(v).includes('미확인')).length?`<div class="review-material-tags">${[f.structure,stretch].filter(v=>v && !String(v).includes('미확인')).map(v=>`<span>${escape(v)}</span>`).join('')}</div>`:''}
    <p class="review-fabric-summary">${escape(f.summary)}</p>
    <details class="review-research"><summary><span>원단 특성과 연구 출처</span><span class="review-disclosure-hint">참고자료</span></summary><div class="review-research-body"><p class="review-reference-note">카탈로그 정보는 참고자료입니다. 실제 원단의 상태와 측정값을 대신하지 않습니다.</p>${f.profile_details?.reported_care?`<p>${escape(f.profile_details.reported_care)}</p>`:''}<h4>자료 출처</h4><ul class="review-source-list">${sourceList(f.source_ids)}</ul><button class="btn btn-ghost evidence-load" data-evidence="${escape(f.id)}">시험 조건과 연구 수치 보기</button><div class="evidence-content" aria-live="polite"></div></div></details></article>`;
  }).join('') || `<div class="review-empty"><span aria-hidden="true">＋</span><h3>함께 확인할 원단을 골라주세요</h3><p>원단을 2개 이상 선택하면 조합을 분석할 수 있어요.</p><button class="btn btn-primary" data-select-more>원단 고르기</button></div>`;
  updateAnalyzeButton();
}
function updateAnalyzeButton(){
  const needsSelection=selected.size<2 || selected.size>6;
  $('#btn-test').disabled=busy || needsSelection;
  const helper=$('#review-next-hint');
  if(helper)helper.textContent=needsSelection?'함께 확인할 원단을 2~6개 선택해주세요.':`${selected.size}개 원단의 조합 특성을 비교합니다.`;
}
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
  if(busy || selected.size<2 || selected.size>6)return;
  analysis=null;
  switchStep('review');
  currentStep='compat';
  $$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-compat'));
  updateSteps();
  $('#floating-bar').classList.add('hidden');
  busy=true; updateSteps(); updateAnalyzeButton();
  $('#compat-content').innerHTML='<div class="loading-state" role="status"><div class="spinner"></div><p>Supabase에서 조합 분석 중...</p></div>';
  try {
    analysis=await API.analyzeCatalogue([...selected]);
    renderAnalysis();
    window.dispatchEvent(new CustomEvent('layermatch:analysis',{detail:structuredClone(analysis)}));
  } catch(error){errorView($('#compat-content'),error,analyze);}
  finally{busy=false;updateSteps();updateAnalyzeButton();}
}
function renderAnalysis(){
  const result=analysis.compatibility;
  if(!result){errorView($('#compat-content'),new Error('조합 결과를 확인할 수 없습니다.'),analyze);return;}
  const score=value=>value===null || value===undefined?null:Math.max(0,Math.min(100,Number(value)));
  const metricValue=value=>score(value)===null?'<span class="compat-pending">평가 보류</span>':`${escape(score(value))}<small>점</small>`;
  const fabricChip=f=>{const card=selectionCards.find(c=>c.id===f.fabric_id);return `<span class="result-fabric-chip"><i style="background:${card?.color || '#bbb'}"></i>${escape(card?.name || f.name)}</span>`;};
  const displayLabel=d=>d.id==='staining'?'이염 참고 점수':d.label;
  const displayText=text=>String(text ?? '').replaceAll('임의로 정한 기획 가정','임의 기준').replaceAll('기획 가정','임의 기준');
  const explanations={shrinkage:'소재 분류별 반응 가정',stretch:'DB에 등록된 신축 분류',care:'소재별 관리 조건의 확인 필요성',staining:''};
  const warnings=[...new Map(analysis.warnings.map(w=>[w.code,w])).values()];
  $('#compat-content').innerHTML=`<div class="compat-intro"><span class="review-eyebrow">조합 분석 결과</span><h2>제작 전, 함께 확인해보세요</h2><p>${analysis.fabric_snapshots.length}개 원단 · ${result.pairs.length}개 조합</p></div>
  <div class="result-fabric-chips">${analysis.fabric_snapshots.map(fabricChip).join('<span class="result-plus">+</span>')}</div>
  <section class="compat-hero"><div class="compat-score-ring" style="--score:${score(result.score) ?? 0}"><div><strong>${score(result.score)===null?'—':escape(score(result.score))}</strong><span>${score(result.score)===null?'점수 보류':'/ 100점'}</span></div></div><div class="compat-hero-copy"><span class="compat-draft">원단 프로필 기반 · 검증 전</span><h3>조합 적합도 참고 점수</h3><span class="compat-status">${escape(result.label)}</span><p>DB의 소재 분류에 임의 기준을 적용한 추정치입니다. 실제 시료의 호환성이나 제작 성공을 보장하지 않습니다.</p><div class="compat-coverage"><span>근거 수준</span><strong>${escape(result.confidence)}</strong></div></div></section>
  <section class="compat-metrics"><div class="compat-section-heading"><h3>항목별 참고 점수</h3><span>평가 가능한 항목만 반영</span></div>${result.dimensions.map(d=>{const v=score(d.score);return `<div class="compat-metric"><div class="compat-metric-label"><strong>${escape(displayLabel(d))}</strong><small>${escape(explanations[d.id] || '')}</small></div>${v===null?'<div class="compat-track compat-track-pending" aria-label="평가 보류"></div>':`<div class="compat-track" role="progressbar" aria-label="${escape(displayLabel(d))}" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><span style="width:${v}%"></span></div>`}<span class="compat-metric-score">${metricValue(d.score)}</span></div>`;}).join('')}<p class="compat-not-scored">이염 참고 점수는 실제 이염 위험이나 시험 등급이 아니며 종합 점수에 반영하지 않습니다. 내구성과 봉제 적합성은 평가하지 않습니다.</p></section>
  <section class="compat-pairs"><div class="compat-section-heading"><h3>원단 쌍별 확인</h3><span>${result.pairs.length}개 조합</span></div>${result.pairs.map(pair=>`<article class="compat-pair"><div class="compat-pair-heading"><div>${pair.fabric_ids.map(id=>{const f=analysis.fabric_snapshots.find(s=>s.fabric_id===id);const card=selectionCards.find(c=>c.id===id);return `<span>${escape(card?.name || f?.name || id)}</span>`;}).join('<span class="pair-link">↔</span>')}</div><strong>${metricValue(pair.score)}</strong></div><p class="compat-pair-meta">${pair.score===null?'자료 부족으로 평가 보류':'소재 분류에 따른 기획용 추정 · 실제 시험 전'}</p><details><summary>점수 근거와 확인할 사항</summary><div class="compat-pair-evidence">${pair.dimensions.map(d=>`<div><strong>${escape(displayLabel(d))} <span>${metricValue(d.score)}</span></strong><p>${escape(displayText(d.reason))}</p></div>`).join('')}<ul>${pair.warnings.map(w=>`<li>${escape(displayText(w.message))}</li>`).join('')}</ul><details><summary>관련 연구 출처</summary><ul>${sourceList([...new Set(pair.source_ids)])}</ul></details></div></details></article>`).join('')}</section>
  <section class="compat-next-checks"><div class="compat-section-heading"><h3>제작 전 확인할 사항</h3><span>${warnings.length}개</span></div>${warnings.map(w=>`<div class="compat-warning"><span aria-hidden="true">!</span><p>${escape(displayText(w.message))}</p></div>`).join('')}</section>
  <section class="compat-tests"><div class="compat-section-heading"><h3>다음으로 확인할 테스트</h3></div><div class="compat-test-grid">${analysis.recommended_tests.map(t=>`<div><span aria-hidden="true">${t.test_type==='shrinkage'?'↔':'◐'}</span><strong>${escape(testNames[t.test_type] || t.test_type)}</strong><p>${escape(t.reason)}</p></div>`).join('')}</div></section>
  <details class="compat-method"><summary>점수 계산 기준과 적용 범위</summary><div><p>${escape(displayText(result.disclaimer))}</p><ul><li>세탁 수축 반응 차이(40%): 소재 범주에 가정한 등급 나일론·폴리에스터 1, 면직물·데님·면폴리 2, 울 3의 차이를 이용해 90 − 15 × 등급 차이로 계산합니다. 이 등급은 실측 수축률이 아닙니다.</li><li>신축 특성(30%): 두 DB 프로필이 비신축이면 85점으로 가정합니다. 하나라도 미확정이면 해당 항목을 제외합니다.</li><li>관리 조건(30%): 울 포함 60점, 울이 없고 나일론 또는 폴리에스터 포함 70점, 그 외 현재 소재는 80점으로 가정합니다.</li><li>평가를 보류한 항목의 비중은 다른 항목에 나누어 반영합니다. 전체 점수는 원단 쌍별 점수의 평균입니다.</li></ul><p>위 점수와 가중치는 해커톤 기획을 위한 임의 가정이며 연구나 표준이 제시한 수치가 아닙니다. 낮은 점수만으로 사용 불가를, 높은 점수만으로 안전을 판단할 수 없습니다. 이염 참고 점수는 데님 포함 시 60점, 그 외 70점으로 임의 지정하며 종합 점수에는 반영하지 않습니다. 실제 이염·내구성·봉제 적합성은 평가하지 않습니다.</p><small>기획 기준 ${escape(result.version)}</small></div></details>
  <div class="review-actions compat-actions"><button class="review-back" data-back>← 선택 정보 확인</button><button class="btn btn-primary" data-guide>테스트 가이드 <span aria-hidden="true">→</span></button></div>`;
  $('#compat-content [data-back]').addEventListener('click',()=>switchStep('review'));
  $('#compat-content [data-guide]').addEventListener('click',()=>switchStep('guide'));
}
function renderHandoff(step){
  const target=step==='guide'?$('#guide-content'):$('#action-content');
  if(step==='action'){
    target.innerHTML=`<div class="guide-intro"><h2>조치 추천 연결</h2><p>조치 추천은 팀 담당자의 백엔드 연결 후 제공됩니다.</p></div><div class="action-bar"><button class="btn btn-ghost" data-back>← 분석 결과</button></div>`;
    target.querySelector('[data-back]').addEventListener('click',()=>switchStep('compat')); return;
  }
  const names=analysis.fabric_snapshots.map(f=>selectionCards.find(c=>c.id===f.fabric_id)?.name || f.name);
  const references=['iso-6330-2021','iso-5077-2007','iso-105-c06-2010','iso-105-a03-2019'];
  target.innerHTML=`<div class="guide-intro"><h2>🧪 테스트 진행 가이드</h2><p>선택한 ${escape(names.join(' · '))}의 조합 시편을 확인하세요.</p><p>아래는 가정에서 관찰하기 위한 참고 절차입니다. 공인 시험성적서나 합격 판정이 아닙니다.</p></div>
  <article class="guide-card"><div class="guide-header"><span class="guide-icon">🌊</span><h3 class="guide-title">세탁 안정성 테스트</h3></div><p class="guide-desc">두 원단을 함께 사용했을 때 세탁 후 접합부와 외관의 변화를 관찰합니다. 여러 원단을 선택했다면 확인할 두 원단을 골라 시편별로 진행하세요.</p>
  <div class="guide-method"><strong>준비물</strong><p>원단 시편 두 장, 봉제 도구, 줄자, 표기 도구, 기록지와 촬영 기기</p><strong>진행 순서</strong><ol><li>각 원단의 관리 라벨과 가공 상태를 확인합니다. 두 원단에 공통으로 허용되는 세탁 방법이 불명확하면 물세탁하지 말고 제조사 또는 시험기관에 확인합니다.</li><li>실제 제작에 사용할 방향과 봉제 방식으로 조합 시편을 만들고, 각 원단에 측정 위치와 방향을 표시합니다. 세탁 전 길이와 접합부 사진을 기록합니다.</li><li>두 원단에 적합한 공통 세탁·건조 방법으로 시편을 처리합니다. 온도, 세제, 세탁 방식, 횟수 및 건조 방법을 기록하고 같은 조건으로 전후를 비교합니다.</li><li>완전히 건조한 뒤 같은 위치를 측정하고, 접합부의 뒤틀림·주름·올풀림·파손과 색 변화 또는 이염을 세탁 전 사진과 비교합니다.</li><li>아래에 실제 관찰 결과와 조건을 입력합니다. 결과는 시험한 해당 시편과 조건에만 적용됩니다.</li></ol></div>
  <p class="wash-note">세탁 중 색이 옮을 수 있으므로 본제품이나 다른 세탁물과 함께 시험하지 마세요. 수축·변형은 복구되지 않을 수 있습니다.</p>
  <details class="wash-sources"><summary>DB의 관련 표준과 연구 출처</summary><p>ISO 자료는 시험 방법의 공개 소개입니다. 아래 가정용 절차 및 관찰 등급은 공인 표준 시험과 다릅니다.</p><ul class="review-source-list">${sourceList(references)}</ul></details></article>
  <article class="guide-card"><div class="guide-header"><span class="guide-icon">📏</span><h3 class="guide-title">수축률 비교</h3></div><div class="guide-method"><ol><li>각 원단의 경사·위사 방향을 구분해 측정 구간을 표시하고 세탁 전 길이를 기록합니다.</li><li>공통으로 허용되는 같은 세탁·건조 조건을 사용하고 조건과 횟수를 기록합니다.</li><li>완전히 건조한 뒤 표시한 구간을 다시 측정합니다. 각 방향의 변화율은 (세탁 전 길이 − 세탁 후 길이) ÷ 세탁 전 길이 × 100입니다. 양수는 수축, 음수는 늘어남을 뜻합니다.</li><li>같은 조건과 방향의 결과만 비교합니다. 이 차이만으로 접합부 변형이나 합격 여부를 확정할 수 없습니다.</li></ol></div></article>
  <article class="guide-card"><div class="guide-header"><span class="guide-icon">🎨</span><h3 class="guide-title">이염 확인</h3></div><div class="guide-method"><ol><li>실제로 사용할 색상과 염색 상태의 원단 시편을 준비하고 세탁 전 사진을 기록합니다.</li><li>두 원단의 관리 라벨을 확인하고 공통으로 허용되는 세탁 조건이 있을 때 별도 시편으로 관찰합니다.</li><li>건조 후 상대 원단에 색이 옮았는지 살펴보고, 원단 자체의 색 변화와 상대 원단 오염을 구분해 기록합니다.</li><li>눈으로 본 결과는 참고 관찰입니다. 공인 견뢰도 등급이 필요하면 적합한 첨부포와 표준 시험을 시험기관에 의뢰합니다.</li></ol></div></article>
  <article class="guide-card"><div class="guide-header"><span class="guide-icon">📝</span><h3 class="guide-title">세탁 안정성 결과 입력</h3></div><p class="guide-desc">관찰 정도는 임시 기록용 5단계이며, 표준 등급이나 품질 합격 판정이 아닙니다. 입력 내용은 이 탭에서만 유지되고 저장되지 않습니다.</p>
  <form id="wash-form" class="wash-form"><label>시험한 원단 조합<select name="pair" required><option value="">조합 선택</option>${analysis.compatibility.pairs.map(p=>{const label=p.fabric_ids.map(id=>selectionCards.find(c=>c.id===id)?.name||id).join(' + ');const key=p.fabric_ids.join('|');return `<option value="${escape(key)}" ${washResult.pair===key?'selected':''}>${escape(label)}</option>`;}).join('')}</select></label>
  <label>접합부 변화 관찰<select name="grade" required><option value="">관찰 결과 선택</option>${[['5','5 — 변화 없음'],['4','4 — 약간의 변화'],['3','3 — 눈에 띄는 변화'],['2','2 — 큰 변형'],['1','1 — 접합부 분리 또는 파손']].map(([v,label])=>`<option value="${v}" ${washResult.grade===v?'selected':''}>${label}</option>`).join('')}</select></label>
  <label>세탁 횟수<input name="cycles" type="number" min="1" max="100" step="1" placeholder="예: 1" value="${escape(washResult.cycles||'')}"></label><label>세탁 온도 (℃)<input name="temperature" type="number" min="0" max="100" step="0.1" placeholder="실제 사용한 온도" value="${escape(washResult.temperature||'')}"></label>
  <label>세탁·건조 방식 및 관찰 내용<textarea name="notes" rows="3" maxlength="1000" placeholder="세제, 세탁 방식, 건조 방법과 변화 등을 기록하세요">${escape(washResult.notes||'')}</textarea></label><button type="submit" class="btn btn-primary">입력 결과 확인</button><p id="wash-status" role="status" aria-live="polite">${washResult.confirmed?'입력한 결과를 확인했습니다. 이 탭에서만 유지됩니다.':''}</p></form></article>
  <div class="action-bar"><button class="btn btn-ghost" data-back>← 호환성 결과</button><button class="btn btn-primary" data-next>조치 추천 →</button></div>`;
  const form=target.querySelector('#wash-form');
  form.addEventListener('input',()=>{washResult={...washResult,...Object.fromEntries(new FormData(form)),confirmed:false};target.querySelector('#wash-status').textContent='';});
  form.addEventListener('change',()=>{washResult={...washResult,...Object.fromEntries(new FormData(form)),confirmed:false};target.querySelector('#wash-status').textContent='';});
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;washResult={...Object.fromEntries(new FormData(form)),confirmed:true};target.querySelector('#wash-status').textContent='입력한 결과를 확인했습니다. 이 탭에서만 유지됩니다.';});
  target.querySelector('[data-back]').addEventListener('click',()=>switchStep('compat'));
  target.querySelector('[data-next]').addEventListener('click',()=>switchStep('action'));
}
// Team integration: full server response and recommended_tests[].test_type, no mock save.
window.LayerMatch=Object.freeze({getAnalysis:()=>analysis?structuredClone(analysis):null});
async function init(){
  updateSteps();
  $('#fabric-list').innerHTML='<p role="status">Supabase 원단 목록 조회 중...</p>';
  try{[fabrics,sources]=await Promise.all([API.listFabrics(),API.listSources()]);renderFabrics();}
  catch(error){errorView($('#fabric-list'),error,init);}
}
init();
