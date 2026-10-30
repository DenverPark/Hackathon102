// ============================================================
//  app.js — UI 컨트롤러 (backend1 디자인 & 인터페이스 통합)
//  백엔드 데이터 및 데이터베이스 내용은 변경 없이 100% 보존
// ============================================================

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let fabrics = [], selected = new Set(), analysis = null, busy = false;
const steps = ['select', 'review', 'compat', 'guide', 'action'];
let currentStep = 'select';
let washResult = {};
let guideResultInputs = {};
let projectPurpose = '';

// 원단 카드 설정 (UI 프리젠테이션)
const selectionCards = [
  { id: 1, key: 'nylon',      name: '나일론',               color: '#2C2C2E', desc: '가볍고 내구성이 뛰어난 합성 섬유',         tags: ['합성', '경량', '고강도'] },
  { id: 2, key: 'wool',       name: '울',                   color: '#8E7C6A', desc: '보온성이 우수한 천연 동물성 섬유',         tags: ['천연', '보온', '중량'] },
  { id: 3, key: 'denim',      name: '데님',                 color: '#2D4A7A', desc: '능직으로 짜인 내구성 높은 면직물',         tags: ['천연', '능직', '중량'] },
  { id: 4, key: 'blend',      name: '코튼 폴리에스터 블렌드', color: '#B0C4B1', desc: '면과 폴리에스터를 혼방한 실용적 원단',     tags: ['혼방', '실용', '중량'] },
  { id: 5, key: 'cotton',     name: '면직물',               color: '#E8D5B7', desc: '통기성과 흡습성이 좋은 천연 면 원단',      tags: ['천연', '통기성', '중량'] },
  { id: 6, key: 'polyester',  name: '폴리에스터',            color: '#C8D8E4', desc: '구김이 적고 관리가 쉬운 합성 섬유',        tags: ['합성', '경량', '속건'] },
];

const testNames = { shrinkage: '수축률 비교', staining: '이염 확인', tensile: '인장/인열강도', pilling: '필링(보풀) 테스트' };

// ============================================================
//  스텝 네비게이션
// ============================================================
function updateSteps() {
  const currentIndex = steps.indexOf(currentStep);
  $$('.step').forEach((button, i) => {
    button.classList.toggle('active', i === currentIndex);
    button.classList.toggle('done', i < currentIndex);
    button.disabled = busy || i > currentIndex;
    if (i === currentIndex) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}

function switchStep(step) {
  if (busy || !steps.includes(step)) return;
  if (['compat', 'guide', 'action'].includes(step) && !analysis && step !== 'select' && step !== 'review') return;
  currentStep = step;
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${step}`));
  updateSteps();
  $('#floating-bar').classList.toggle('hidden', step !== 'select' || !selected.size);

  if (step === 'review') renderReview();
  if (step === 'compat') renderCompat();
  if (step === 'guide' || step === 'action') renderHandoff(step);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchStep = switchStep;

$('#home-link').addEventListener('click', () => {
  if (!busy) {
    selected.clear();
    invalidate();
    projectPurpose = '';
    switchStep('select');
    renderFabrics();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

$$('.step').forEach(el => el.addEventListener('click', () => {
  const targetStep = el.dataset.step;
  if (steps.indexOf(targetStep) <= steps.indexOf(currentStep)) {
    switchStep(targetStep);
  }
}));

function invalidate() {
  analysis = null;
  washResult = {};
  guideResultInputs = {};
}

// ============================================================
//  ① 1단계: 원단 선택 (backend1 카드 스타일)
// ============================================================
function renderFabrics() {
  $('#fabric-list').innerHTML = selectionCards.map(card => {
    const fabric = fabrics.find(f => f.id === card.id);
    const isSelected = selected.has(card.id);
    return `
      <button type="button" class="fabric-card ${isSelected ? 'selected' : ''}" data-id="${card.id}" aria-pressed="${isSelected}">
        <span class="check-icon">${isSelected ? '✓' : ''}</span>
        <span class="color-swatch" style="background:${card.color}"></span>
        <span class="fabric-name">${escape(card.name)}</span>
        <span class="fabric-desc">${escape(card.desc)}</span>
        <span class="fabric-meta">
          ${card.tags.map(t => `<span class="tag">${escape(t)}</span>`).join('')}
        </span>
      </button>`;
  }).join('');

  $('#selected-count').textContent = selected.size;
  $('#floating-bar').classList.toggle('hidden', currentStep !== 'select' || !selected.size);
}

$('#fabric-list').addEventListener('click', e => {
  const card = e.target.closest('[data-id]');
  if (!card || busy) return;
  const id = Number(card.dataset.id);
  if (selected.has(id)) selected.delete(id);
  else if (selected.size < 6) selected.add(id);
  invalidate();
  renderFabrics();
});

// ============================================================
//  ② 2단계: 선택 조회 (backend1 sample-card 스타일)
// ============================================================
function renderReview() {
  const list = [...selected].map(id => fabrics.find(f => f.id === id)).filter(Boolean);

  $('#selected-summary').innerHTML = `
    <div class="review-heading">
      <div>
        <span class="review-eyebrow">조합 준비</span>
        <h2>선택한 원단을 확인하세요</h2>
        <p>선택한 원단의 참고 정보와 연구 기록을 확인하세요.</p>
      </div>
      <span class="review-count">${list.length}<small>개 선택</small></span>
    </div><div class="purpose-panel"><label for="project-purpose">제작 목적 <span class="field-required">선택</span></label><input id="project-purpose" type="text" maxlength="100" value="${escape(projectPurpose)}" placeholder="예: 헌 청바지와 바람막이로 가방 만들기"><p>제작 메모로 사용합니다. 현재 테스트 항목은 목적이 아닌 원단의 연구 기록을 기준으로 표시됩니다.</p></div>`;
  $('#project-purpose').addEventListener('input', e=>{projectPurpose=e.target.value;});

  if (list.length === 0) {
    $('#selected-fabrics').innerHTML = `
      <div class="review-empty">
        <span aria-hidden="true">＋</span>
        <h3>함께 확인할 원단을 골라주세요</h3>
        <p>원단을 2개 이상 선택하면 조합을 분석할 수 있어요.</p>
        <button class="btn btn-primary" onclick="switchStep('select')">원단 고르기</button>
      </div>`;
  } else {
    $('#selected-fabrics').innerHTML = list.map((f, index) => {
      const card = selectionCards.find(c => c.id === f.id);
      const p = f.properties || {};
      const tests = f.tests || [];
      const sources = f.sources || [];

      return `
        <article class="sample-card" data-id="${f.id}" aria-label="${escape(f.name)} 원단 정보">
          <header class="review-card-header">
            <span class="review-swatch" style="background:${card?.color || f.color_hex || '#bbb'}" aria-hidden="true"></span>
            <div class="review-card-title">
              <span class="review-sample-number">원단 ${index + 1}</span>
              <h3>${escape(f.name)} <small>(${escape(f.aliases || f.category)})</small></h3>
              <p>${escape(p.fiber_composition || f.category + ' 섬유')}</p>
            </div>
            <button class="review-remove" data-remove="${f.id}" aria-label="${escape(f.name)} 선택 해제">선택 해제</button>
          </header>

          <div class="review-material-tags">
            <span>${escape(p.weave_type || '직조 정보')}</span>
            <span>${escape(p.elasticity || '신축성')}</span>
            ${p.gsm ? `<span>${escape(p.gsm)} GSM</span>` : (p.gsm_range_text ? `<span>${escape(p.gsm_range_text)}</span>` : '')}
            ${p.shrinkage_avg_pct ? `<span>수축률 ${escape(p.shrinkage_avg_pct)}%</span>` : ''}
          </div>

          <p class="review-fabric-summary">${escape(f.description || f.desc)}</p>

          <details class="review-research">
            <summary>
              <span>원단 정밀 물성 및 연구 출처</span>
              <span class="review-disclosure-hint">DB 상세</span>
            </summary>
            <div class="review-research-body">
              <p class="review-reference-note">${f.data_origin === 'database' ? 'DB에서 불러온 원단 정보입니다.' : 'DB 연결이 없는 경우 표시하는 임시 참고자료입니다.'} 개별 기록의 출처와 조건은 별도 확인이 필요합니다. 실제 원단의 실측값이나 관리 표시를 대신하지 않습니다. 조사자: ${escape(f.investigator || '미상')} (${escape(f.investigation_date || '')})</p>
              ${p.care_guide ? `<p><strong>세탁 및 관리:</strong> ${escape(p.care_guide)}</p>` : ''}
              ${p.shrinkage_detail ? `<p><strong>수축 특성:</strong> ${escape(p.shrinkage_detail)}</p>` : ''}
              ${p.dye_transfer_detail ? `<p><strong>이염 특성:</strong> ${escape(p.dye_transfer_detail)}</p>` : ''}
              ${p.other_characteristics ? `<p><strong>기타 특성:</strong> ${escape(p.other_characteristics)}</p>` : ''}

              <h4>시험 및 조사 참고자료 (${tests.length}건)</h4>
              <div class="modal-tests-list">
                ${tests.map(t => `
                  <div class="test-item-card">
                    <div class="test-item-name">🔬 ${escape(t.name)}</div>
                    <div class="test-item-cond"><strong>조건:</strong> ${escape(t.condition)}</div>
                    <div class="test-item-res"><strong>결과:</strong> ${escape(t.result)}</div>
                  </div>
                `).join('')}
              </div>

              <h4>자료 출처</h4>
              <ul class="review-source-list">
                ${sources.map(s => `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('')}
              </ul>
            </div>
          </details>
        </article>`;
    }).join('');
  }

  updateAnalyzeButton();
}

function updateAnalyzeButton() {
  const needsSelection = selected.size < 2 || selected.size > 6;
  $('#btn-test').disabled = busy || needsSelection;
  const helper = $('#review-next-hint');
  if (helper) {
    helper.textContent = needsSelection
      ? '함께 확인할 원단을 2~6개 선택해주세요.'
      : `${selected.size}개 원단의 조합 특성을 비교합니다.`;
  }
}

$('#selected-fabrics').addEventListener('click', e => {
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    selected.delete(Number(remove.dataset.remove));
    invalidate();
    renderFabrics();
    renderReview();
  }
});

$('#btn-test').addEventListener('click', analyze);

async function analyze() {
  if (busy || selected.size < 2 || selected.size > 6) return;
  analysis = null;
  currentStep = 'compat';
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-compat'));
  updateSteps();
  $('#floating-bar').classList.add('hidden');
  busy = true;
  updateAnalyzeButton();

  $('#compat-content').innerHTML = `
    <div class="loading-state" role="status">
      <div class="spinner"></div>
      <p>Supabase PostgreSQL 데이터베이스에서 원단 조합 분석 중...</p>
    </div>`;

  try {
    analysis = await API.analyzeCompatibility([...selected]);
    renderCompat();
  } catch (error) {
    $('#compat-content').innerHTML = `
      <div class="empty-state" role="alert">
        <p>분석에 실패했습니다. ${escape(error.message)}</p>
        <button class="btn btn-primary" onclick="analyze()">다시 시도</button>
      </div>`;
  } finally {
    busy = false;
    updateSteps();
    updateAnalyzeButton();
  }
}

// ============================================================
//  ③ 3단계: 호환성 분석 결과 (backend1 compat 디자인)
// ============================================================
function renderCompat() {
  if (!analysis) return;
  const snapshot=analysis;
  const { fabrics: chosenFabrics, pairs, avgScore } = snapshot;
  const numeric=typeof avgScore==='number' && Number.isFinite(avgScore)?avgScore:null;
  const clamp=value=>Math.max(0,Math.min(100,value));
  const metrics=[
    {label:'종합 적합도',score:numeric,note:'원단 쌍별 등록 점수의 평균'},
    {label:'세탁·수축 호환성',score:numeric===null?null:clamp(numeric-2),note:'임의 표시값 · 종합점수 − 2'},
    {label:'내구성 및 봉제 적합',score:numeric===null?null:clamp(numeric+3),note:'임의 표시값 · 종합점수 + 3'},
    {label:'이염 및 관리 호환',score:numeric===null?null:clamp(numeric-4),note:'임의 표시값 · 종합점수 − 4'}
  ];
  const chip=f=>{const card=selectionCards.find(c=>c.id===f.id);return `<span class="result-fabric-chip"><i style="background:${card?.color||f.color||'#bbb'}"></i>${escape(f.name)}</span>`;};
  const origin=p=>p.score_origin==='database'?'DB에 사전 등록된 점수':p.score_origin==='default'?'자료 없어 지정한 기본값':'화면에 포함된 임시 점수';
  $('#compat-content').innerHTML=`<div class="compat-intro"><span class="review-eyebrow">제작 전 확인</span><h2>원단 조합을 살펴보세요</h2><p>${chosenFabrics.length}개 원단 · ${pairs.length}개 조합</p></div>
  <div class="result-fabric-chips">${chosenFabrics.map(chip).join('<span class="result-plus">+</span>')}</div>
  <section class="compat-hero"><div class="compat-score-ring" style="--score:${numeric===null?0:clamp(numeric)}"><div><strong>${numeric===null?'—':escape(numeric)}</strong><span>${numeric===null?'점수 보류':'/ 100점'}</span></div></div><div class="compat-hero-copy"><span class="compat-draft">기획용 임시 지표 · 검증 전</span><h3>조합별 등록 점수 평균</h3><p>두 원단씩 미리 정해진 점수의 평균입니다. 실제 선택 원단을 측정한 점수, 공인 시험 결과 또는 제작 성공 가능성이 아닙니다.</p><p>자료가 없으면 기본 점수 50이 포함될 수 있어요. 점수만으로 사용 가능 여부를 판단하지 마세요.</p></div></section>
  <section class="compat-metrics"><div class="compat-section-heading"><h3>항목별 참고 점수</h3><span>기획용 · 검증 전</span></div>${metrics.map(m=>`<div class="compat-metric"><div class="compat-metric-label"><strong>${escape(m.label)}</strong><small>${escape(m.note)}</small></div>${m.score===null?'<div class="compat-track compat-track-pending" aria-label="평가 보류"></div>':`<div class="compat-track" role="progressbar" aria-label="${escape(m.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.score}"><span style="width:${m.score}%"></span></div>`}<span class="compat-metric-score">${m.score===null?'<span class="compat-pending">평가 보류</span>':`${escape(m.score)}<small>점</small>`}</span></div>`).join('')}<p class="compat-not-scored">세부 점수는 종합점수에서 숫자를 더하거나 뺀 임의 표시값입니다. 수축률·봉제강도·이염을 실제로 측정해 계산한 결과가 아닙니다.</p></section>
  <section class="compat-pairs"><div class="compat-section-heading"><h3>원단 조합별 참고 정보</h3><span>${pairs.length}개 조합</span></div>${pairs.map(p=>`<article class="compat-pair"><div class="compat-pair-heading"><div><span>${escape(p.nameA)}</span><span class="pair-link">↔</span><span>${escape(p.nameB)}</span></div><strong>${escape(p.score)}<small>점</small></strong></div><p class="compat-pair-meta">${escape(origin(p))} · 검증되지 않은 기획값</p><p class="compat-pair-meta">소재와 가공 상태에 따른 실제 변화는 4단계의 DB 근거와 시편 확인이 필요합니다.</p></article>`).join('')}</section>
  <section class="compat-tests"><div class="compat-section-heading"><h3>다음 단계에서 확인해요</h3><span>DB 연구 기록 기준</span></div><div class="compat-test-grid" data-compat-tests><div role="status"><p>추천 항목을 불러오고 있어요...</p></div></div></section>
  <details class="compat-method"><summary>점수의 계산 방식과 한계</summary><div><p>선택한 원단을 두 개씩 짝지어 사전에 등록된 점수를 조회하고, 모든 조합 점수의 평균을 반올림합니다. 각 조합 점수의 검증된 환산 기준은 확인되지 않았습니다.</p><p>세탁·수축 항목은 종합 − 2, 봉제·내구 항목은 종합 + 3, 이염·관리 항목은 종합 − 4로 임의 표시하며 각 값은 0~100점으로 제한합니다. 항목별 시험 결과는 반영되지 않습니다.</p><p>3페이지 점수는 4페이지 연구 DB의 실제 수축률이나 이염 실험값을 계산한 것이 아니며 ISO·KS 공인 점수가 아닙니다. 가공·색상·관리 조건에 따라 실제 원단의 특성은 달라질 수 있습니다.</p></div></details>
  <div class="review-actions compat-actions"><button class="review-back" onclick="switchStep('review')">← 선택 정보 확인</button><button class="btn btn-primary" onclick="switchStep('guide')">4단계 테스트 가이드 <span aria-hidden="true">→</span></button></div>`;
  loadCompatTests(snapshot);
}
async function loadCompatTests(snapshot){
  const container=$('#compat-content [data-compat-tests]');if(!container)return;
  try{
    const {byId}=await GuideEvidence.getSelected(snapshot.fabrics.map(f=>f.id));
    if(analysis!==snapshot||currentStep!=='compat')return;
    const found=new Set(snapshot.pairs.flatMap(pair=>GuideEvidence.recommendations([pair.fabric_a_id,pair.fabric_b_id],byId).map(item=>item.property)));
    const cards=[['shrinkage','📏','수축률 비교','세탁 전후 각 원단의 길이 변화를 비교합니다.'],['staining','🎨','물 빠짐 확인','원단의 색이 흰 천에 묻어나는지 살펴봅니다.'],['color_change','🌈','색상 변화 확인','원단 자체의 세탁 전후 변화를 관찰합니다.']].filter(card=>found.has(card[0]));
    container.innerHTML=cards.length?cards.map(([,icon,title,description])=>`<div><span aria-hidden="true">${icon}</span><strong>${escape(title)}</strong><p>${escape(description)}</p></div>`).join(''):'<div><p>선택한 원단에서 관련 연구 기록을 찾지 못했습니다.</p></div>';
  }catch(error){
    if(analysis!==snapshot||currentStep!=='compat')return;
    container.innerHTML=`<div role="alert"><p>DB 연구 기록을 불러오지 못했습니다. ${escape(error.message)}</p><button type="button" class="btn btn-ghost" data-compat-retry>다시 시도</button></div>`;
    container.querySelector('[data-compat-retry]').addEventListener('click',()=>loadCompatTests(snapshot));
  }
}

// ============================================================
//  ④ 4단계: 테스트 가이드 & ⑤ 5단계: 조치 추천 (backend1 handoff 스타일)
// ============================================================
function renderHandoff(step) {
  const target = step === 'guide' ? $('#guide-content') : $('#action-content');
  if (!analysis) return;

  const names = analysis.fabrics.map(f => f.name);

  if (step === 'action') {
    submitTests();
    return;
  }


  renderEvidenceGuide(target);

}

const guideConditionLabels={wash_temp_c:'세탁 온도 (℃)',wash_minutes:'세탁 시간 (분)',cycles:'세탁 횟수',detergent:'세제',drying:'건조 방식',drying_alternatives:'기록된 건조 방식',standards_reported:'기록된 시험 기준',environment:'측정 환경',points:'측정 지점 수',wash_conditions:'시험 조건',wash_temp_c_conflicting:'서로 다른 온도 기록 (℃)',verification_status:'자료 확인 상태',pages:'자료 페이지'};
function guideValue(value){if(value===null||value===undefined)return '미기재';if(Array.isArray(value))return value.map(guideValue).join(' / ');if(typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}: ${guideValue(v)}`).join(', ');return String(value);}
const guideResultLabels={warp_pct:'경사 수축률 (%)',weft_pct:'위사 수축률 (%)',first_wash_warp_pct:'첫 세탁 경사 수축률 (%)','10_washes_warp_pct':'10회 세탁 경사 수축률 (%)','10_washes_weft_pct':'10회 세탁 위사 수축률 (%)',quantitative_value:'정량 수치',observation:'관찰 내용',nylon_grade:'나일론 첨부포 등급',acetate_grade:'아세테이트 첨부포 등급',cotton_grade:'면 첨부포 등급',wool_grade:'양모 첨부포 등급',first_wash_white_L_decrease_pct:'첫 세탁 백색 첨부포 명도 감소율 (%)'};
function guideRecord(record,sources){
  const source=sources.find(item=>item.id===record.source_id);
  let url='';try{const u=new URL(source?.url);if(u.protocol==='https:'||u.protocol==='http:')url=u.href;}catch{}
  const rows=Object.entries(record.conditions||{}).map(([key,value])=>`<li><strong>${escape(guideConditionLabels[key]||key)}:</strong> ${escape(key==='verification_status'?guideStatus(value):guideValue(value))}</li>`).join('');
  const results=Object.entries(record.reported_value||{}).map(([key,value])=>`<li><strong>${escape(guideResultLabels[key]||key)}:</strong> ${escape(guideValue(value))}</li>`).join('');
  return `<div class="guide-record"><p><strong>연구 시료:</strong> ${escape(record.sample_description||'미기재')}</p><p><strong>자료의 한계:</strong> ${escape(record.applicability||'확인 필요')}</p><details><summary>DB에 기록된 조건·결과·출처 보기</summary><p><strong>연구 조건</strong></p><ul>${rows||'<li>시험 조건 미기재</li>'}</ul><p><strong>연구 결과</strong> · 실제 선택 원단의 측정값 아님</p><ul>${results||'<li>결과 미기재</li>'}</ul><p><strong>출처:</strong> ${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`:escape(source?.title||'출처 확인 필요')}</p><p>${escape(source?.limitations||'')}</p></details></div>`;
}
function guideStatus(status){
  const labels={quantitative_source_unverified:'연구 수치의 원출처 연결 미확인',source_material_mismatch:'인용 출처와 원단이 맞지 않아 추가 확인 필요',primary_source_conflict:'원문과 조사자료 조건이 달라 추가 확인 필요',primary_protocol_verified:'원문 시험 조건 확인됨',provided_document:'제공된 조사자료 기록'};
  return status ? (labels[status] || status) : '별도 검증 상태 미기재';
}
function guideStudyCondition(record,sources){
  const c=record.conditions || {};
  const read=value=>value===null||value===undefined||value===''?'미기재':guideValue(value);
  const temperature=c.wash_temp_c_conflicting ? `서로 다른 기록: ${read(c.wash_temp_c_conflicting)} ℃` : (c.wash_temp_c===null||c.wash_temp_c===undefined ? '미기재' : `${read(c.wash_temp_c)} ℃`);
  const minutes=c.wash_minutes===null||c.wash_minutes===undefined?'미기재':`${read(c.wash_minutes)} 분`;
  const dry=c.drying ?? c.drying_alternatives;
  const source=sources.find(item=>item.id===record.source_id);
  let sourceUrl='';try{const u=new URL(source?.url);if(u.protocol==='https:'||u.protocol==='http:')sourceUrl=u.href;}catch{}
  const detergent=c.detergent ?? (c.detergent_g===null||c.detergent_g===undefined?null:`${c.detergent_g} g (연구 시료)`);
  const type=record.property==='felting_shrinkage'?'펠팅 수축 (일반 길이 수축과 구분)':record.property==='shrinkage'?'세탁 후 길이 변화':record.property==='staining'?'이염':'색상 변화';
  return `<div class="guide-study"><p><strong>DB 기록:</strong> ${escape(type)}</p><p><strong>연구 시료:</strong> ${escape(record.sample_description||'미기재')}</p><dl><div><dt>세탁 온도</dt><dd>${escape(temperature)}</dd></div><div><dt>세탁 시간</dt><dd>${escape(minutes)}</dd></div><div><dt>건조 방법</dt><dd>${escape(read(dry))}</dd></div><div><dt>세탁 횟수</dt><dd>${escape(read(c.cycles))}</dd></div><div><dt>세제</dt><dd>${escape(read(detergent))}</dd></div><div><dt>시험 기준</dt><dd>${escape(read(c.standards_reported))}</dd></div></dl><p><strong>출처:</strong> ${sourceUrl?`<a href="${escape(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`:escape(source?.title||'출처 확인 필요')}</p><p><strong>검증 상태:</strong> ${escape(guideStatus(c.verification_status))}</p><p><strong>적용 제한:</strong> ${escape(record.applicability||'별도 제한 미기재')}</p></div>`;
}
function guideConditionDifferences(item){
  const all=item.perFabric.flat();
  const fields=[['세탁 온도',c=>c.wash_temp_c_conflicting ? null : c.wash_temp_c],['세탁 시간',c=>c.wash_minutes],['건조 방법',c=>c.drying ?? c.drying_alternatives],['세탁 횟수',c=>c.cycles],['세제',c=>c.detergent]];
  const missing=[],different=[];
  for(const [label,get] of fields){
    const values=all.map(record=>get(record.conditions||{}));
    if(item.perFabric.some(records=>!records.length)||values.some(value=>value===null||value===undefined||value===''))missing.push(label);
    const known=values.filter(value=>value!==null&&value!==undefined&&value!=='');
    if(new Set(known.map(value=>JSON.stringify(value))).size>1)different.push(label);
  }
  const lines=[];
  if(different.length)lines.push(`${different.join('·')} 기록이 서로 다릅니다.`);
  if(all.some(record=>record.conditions?.wash_temp_c_conflicting))lines.push('자료 안에서 세탁 온도 기록이 서로 충돌합니다.');
  if(missing.length)lines.push(`${missing.join('·')} 정보가 일부 없거나 확인되지 않았습니다.`);
  return lines.length?lines.join(' '):'기록이 존재해도 시료와 처리 조건이 같다는 뜻은 아닙니다.';
}
function guideComparedConditions(item,names,sources){
  const columns=item.perFabric.map((records,i)=>`<section class="guide-compare-fabric"><h5>${escape(names[i])}</h5>${records.length?records.map(record=>guideStudyCondition(record,sources)).join(''):'<p>해당 항목의 DB 기록이 없어 시험 조건을 확인할 수 없어요.</p>'}</section>`).join('');
  return `<div class="guide-method guide-comparison"><div class="guide-method-label">DB에 기록된 원단별 시험 조건</div><p>각 연구의 조건을 따로 보여드려요. 없는 시험 단계는 임의로 추가하지 않았습니다.</p><div class="guide-compare-grid">${columns}</div><p class="guide-compare-result"><strong>차이와 미확인:</strong> ${escape(guideConditionDifferences(item))}</p><p class="guide-compare-result">기록된 조건이 같거나 유사해 보여도 실제 원단의 공통 관리 방법이 확인된 것은 아닙니다. ‘미기재’는 안전하다는 뜻이 아닙니다.</p></div>`;
}
function historyPanel(){return `<details class="guide-history"><summary>저장한 테스트 기록 보기</summary><p>이 브라우저에만 저장됩니다. 브라우저 데이터를 삭제하거나 다른 기기를 사용하면 기록을 볼 수 없습니다. 5페이지로 전송되지 않습니다.</p><div data-history-list></div></details>`;}
function renderSavedHistory(target){
  const list=target.querySelector('[data-history-list]');if(!list)return;
  try{
    const records=TestRecordStore.read(localStorage);
    list.innerHTML=records.length?records.map(record=>`<article class="history-record"><div><strong>${escape(Array.isArray(record.pair)?record.pair.join(' + '):'원단 조합')}</strong><p>${escape(record.label || record.property)} · ${escape(record.value)}${record.property==='shrinkage'?' %포인트':''}</p>${record.purpose?`<p>제작 목적: ${escape(record.purpose)}</p>`:''}${record.notes?`<p>조건·메모: ${escape(record.notes)}</p>`:''}<small>${escape(new Date(record.createdAt).toLocaleString('ko-KR'))}</small></div><button type="button" class="btn btn-ghost" data-record-delete="${escape(record.id)}" aria-label="${escape(record.label || '테스트')} 기록 삭제">삭제</button></article>`).join(''):'<p>저장한 기록이 없습니다.</p>';
    list.querySelectorAll('[data-record-delete]').forEach(button=>button.addEventListener('click',()=>{try{const removedId=button.dataset.recordDelete;TestRecordStore.remove(localStorage,removedId);for(const [key,input] of Object.entries(guideResultInputs)){if(input.recordId===removedId){delete input.recordId;target.querySelectorAll('[data-save-status]').forEach(status=>{if(status.dataset.saveStatus===key)status.textContent='기록이 삭제되었습니다. 결과를 다시 입력하면 저장됩니다.';});}}renderSavedHistory(target);}catch(error){list.insertAdjacentText('beforeend',` 기록을 삭제하지 못했습니다: ${error.message}`);}}));
  }catch(error){list.textContent=`기록을 불러오지 못했습니다: ${error.message}`;}
}
async function renderEvidenceGuide(target){
  const snapshot=analysis;const ids=snapshot.fabrics.map(f=>f.id);
  target.innerHTML='<div class="guide-intro"><h2>🧪 조합별 테스트 확인</h2><p role="status">원단별 연구 DB를 확인하고 있어요...</p></div>';
  try{
    const {byId,sources}=await GuideEvidence.getSelected(ids);
    if(snapshot!==analysis||currentStep!=='guide')return;
    const name=id=>snapshot.fabrics.find(f=>f.id===id)?.name||String(id);
    let savedRecords=new Map();try{savedRecords=new Map(TestRecordStore.read(localStorage).map(record=>[record.id,record]));}catch{}
    const pairs=snapshot.pairs.map((pair,pairIndex)=>{
      const pairIds=[pair.fabric_a_id,pair.fabric_b_id];const items=GuideEvidence.recommendations(pairIds,byId);
      const cards=items.map((item,index)=>{
        const records=pairIds.map((id,i)=>`<section class="guide-fabric-record"><h5>${escape(name(id))}</h5>${item.perFabric[i].length?item.perFabric[i].map(record=>guideRecord(record,sources)).join(''):'<p>이 항목의 DB 연구 기록이 없어요.</p>'}</section>`).join('');
        const why=pairIds.map((id,i)=>{const found=item.perFabric[i];if(!found.length)return `${escape(name(id))}: 관련 연구 기록이 없어요.`;const kinds=[...new Set(found.map(record=>record.property==='felting_shrinkage'?'펠팅 수축':item.label))];return `${escape(name(id))}: ${kinds.map(escape).join('·')} 관련 연구 기록 ${found.length}건`;}).join('<br>');
        const protocol=GuideProtocols[item.property];
        if(!protocol)return '';
        const resultKey=pairIds.join('-')+'-'+item.property;
        const entered=guideResultInputs[resultKey] || {};
        const persisted=entered.recordId?savedRecords.get(entered.recordId):null;
        const isSaved=!!persisted && String(persisted.value??'')===String(entered.value??'') && String(persisted.notes??'')===String(entered.notes??'') && String(persisted.purpose??'')===projectPurpose.trim();
        const observations=item.property==='staining'?[['관찰됨','흰 천에 색이 묻음'],['관찰되지 않음','흰 천에 색이 묻지 않음'],['판단 어려움','판단하기 어려움']]:[['관찰됨','색이나 표면 변화가 보임'],['관찰되지 않음','색이나 표면 변화가 보이지 않음'],['판단 어려움','판단하기 어려움']];
        const input=protocol.inputType==='number'?`<input type="number" min="0" step="any" inputmode="decimal" data-guide-result="${escape(resultKey)}" value="${escape(entered.value??'')}" placeholder="예: 3">`:`<select data-guide-result="${escape(resultKey)}"><option value="">선택하세요</option>${observations.map(([v,label])=>`<option value="${escape(v)}" ${entered.value===v?'selected':''}>${escape(label)}</option>`).join('')}</select>`;
        return `<article class="guide-card guide-test" data-pair-index="${pairIndex}" data-property="${escape(item.property)}"><div class="guide-header"><span class="guide-icon" aria-hidden="true">${protocol.icon}</span><div><span class="guide-badge">DB 기록 기반 추천 · 참고 관찰</span><h4 class="guide-title">${index+1}. ${escape(item.label)}</h4></div></div><p class="guide-desc">${escape(protocol.summary)}</p><div class="guide-why"><strong>추천 이유 · 원단별 DB 기록</strong><p>${why}</p><p>DB 기록은 연구 시료의 결과이며 실제 원단에 그대로 적용하지 않습니다.</p></div><div class="guide-method"><div class="guide-method-label">준비물</div><p>${escape(protocol.supplies)}</p><div class="guide-method-label guide-step-title">세부 조건 · 관리 표시 확인 후</div><dl class="guide-protocol-conditions">${protocol.conditions.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><p class="guide-protocol-example">이 조건은 서비스에서 정한 가정용 참고 조건입니다. 두 원단에 허용되는 경우에만 사용하며 DB 연구 조건이나 공인 시험을 그대로 재현한 것은 아닙니다.</p><div class="guide-method-label guide-step-title">진행 순서</div><ol>${protocol.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol></div><p class="guide-caution">${escape(protocol.note)}</p><p class="guide-method-source">진행 순서는 DB 원문이 아닌 서비스에서 새로 작성한 가정용 참고 안내입니다. <a href="${escape(protocol.source)}" target="_blank" rel="noopener noreferrer">방법 참고자료: ${escape(protocol.sourceLabel)}</a></p><div class="guide-input-group guide-result-input"><label>${escape(protocol.inputLabel)}<span class="guide-result-control">${input}</span></label><label for="notes-${escape(resultKey)}">사용한 조건과 관찰 메모 <span>(온도·횟수·세탁·건조 방식 등)</span></label><textarea id="notes-${escape(resultKey)}" data-guide-notes="${escape(resultKey)}" rows="2" maxlength="1000" placeholder="온도, 세제, 횟수, 건조 방식 등">${escape(entered.notes??'')}</textarea><p class="guide-input-status" role="status" aria-live="polite" data-save-status="${escape(resultKey)}">${isSaved?'✓ 기록 완료':(String(entered.value??'').trim()?'기록되지 않은 변경사항이 있습니다':'결과를 입력해 주세요')}</p><small>결과를 입력하면 이 브라우저에 자동 저장됩니다. 5페이지로 전송되지 않습니다.</small></div><details class="guide-evidence"><summary>원단별 DB 연구 조건과 출처 보기</summary>${guideComparedConditions(item,pairIds.map(name),sources)}<p>각 기록의 결과는 연구 시료의 결과이며 실제 선택 원단의 측정값이 아닙니다.</p>${records}</details></article>`;
      }).join('');
      return `<details class="guide-pair" ${pairIndex===0?'open':''}><summary><span>원단 조합 ${pairIndex+1}</span><strong>${pairIds.map(id=>escape(name(id))).join(' + ')}</strong><small>${items.length}개 확인 항목</small></summary><p class="guide-pair-desc">선택한 원단에 관련 DB 연구 기록이 있는 항목을 조합별로 추천해요. 수축률은 두 원단을 한 카드에서 비교합니다.</p>${cards||'<div class="guide-card"><p>선택한 원단에서 관련 DB 연구 기록을 찾지 못했습니다. 기록되지 않은 시험은 표시하지 않습니다.</p></div>'}</details>`;
    }).join('');
    target.innerHTML=`<div class="guide-intro"><h2>🧪 원단 조합별 테스트 가이드</h2><p>선택한 원단의 DB 연구 기록이 있는 항목을 조합별로 추천합니다. 같은 종류의 시험은 원단 두 장을 하나의 카드에서 확인해요.</p><p>진행 순서는 서비스가 새로 작성한 가정용 참고 안내입니다. DB 연구 절차나 공인 시험과 다르며 실제 원단의 관리 표시와 공통 세탁·건조 방법을 먼저 확인하세요.</p></div>${historyPanel()}${pairs}<div class="action-bar"><button type="button" class="btn btn-ghost" data-guide-back>← 호환성 결과</button><button type="button" class="btn btn-primary" data-guide-next>5단계 조치 확인 →</button></div>`;
    renderSavedHistory(target);
    target.querySelectorAll('[data-guide-result],[data-guide-notes]').forEach(field=>{
      const update=()=>{
        const isResult=field.hasAttribute('data-guide-result');const key=isResult?field.dataset.guideResult:field.dataset.guideNotes;
        const current={...(guideResultInputs[key]||{}),[isResult?'value':'notes']:field.value};guideResultInputs[key]=current;
        const card=field.closest('.guide-test');const status=card.querySelector('[data-save-status]');
        if(!String(current.value??'').trim()){status.textContent=current.recordId?'결과를 입력해 주세요. 이전 저장값은 기록 목록에 유지됩니다.':'결과를 입력해 주세요';return;}
        try{
          const pair=snapshot.pairs[Number(card.dataset.pairIndex)];const property=card.dataset.property;const protocol=GuideProtocols[property];
          if(!pair||!protocol)throw new Error('원단 조합을 확인할 수 없습니다.');
          const saved=TestRecordStore.save(localStorage,{pair:[pair.nameA,pair.nameB],property,label:protocol.inputLabel,value:String(current.value),notes:String(current.notes??''),purpose:projectPurpose.trim()},current.recordId);
          guideResultInputs[key]={...current,recordId:saved.id};status.textContent='✓ 기록 완료';renderSavedHistory(target);
        }catch(error){status.textContent=`저장하지 못했습니다: ${error.message}`;}
      };
      field.addEventListener('input',update);
    });
    target.querySelector('[data-guide-back]').addEventListener('click',()=>switchStep('compat'));
    target.querySelector('[data-guide-next]').addEventListener('click',()=>switchStep('action'));
  }catch(error){if(snapshot!==analysis||currentStep!=='guide')return;target.innerHTML=`<div class="guide-intro" role="alert"><h2>시험 자료를 불러오지 못했어요</h2><p>${escape(error.message)}. 임의의 테스트를 대신 표시하지 않습니다.</p>${historyPanel()}<button class="btn btn-primary" data-guide-retry>다시 시도</button> <button class="btn btn-ghost" data-guide-back>← 호환성 결과</button> <button class="btn btn-primary" data-guide-next>5단계 조치 확인 →</button></div>`;renderSavedHistory(target);target.querySelector('[data-guide-retry]').addEventListener('click',()=>renderEvidenceGuide(target));target.querySelector('[data-guide-back]').addEventListener('click',()=>switchStep('compat'));target.querySelector('[data-guide-next]').addEventListener('click',()=>switchStep('action'));}
}

// 5페이지는 main 브랜치의 조치 카드와 규칙을 사용합니다.
// 4페이지 연구자료는 시험 결과가 아니므로 값이 없을 때는 판정을 보류합니다.
async function submitTests(results=[]){
  const target=$('#action-content');
  if(!Array.isArray(results)||results.length===0){renderActionPending(target);return;}
  const sessionId=`session_${Date.now()}`;
  await MainActions.saveTestResults(sessionId,results);
  const actions=await MainActions.getActionRecommendations(results);
  if(!actions.length){renderActionPending(target);return;}
  renderActions(actions);
}
window.submitTests=submitTests;
function renderActionPending(target){
  target.innerHTML=`<div class="final-verdict"><div class="verdict-icon">📋</div><div class="verdict-title">시험 결과 연결 대기</div><div class="verdict-desc">main 브랜치의 조치 추천 화면입니다. 현재 4페이지에서는 연구자료만 확인할 수 있어 실제 시험 결과가 전달되지 않습니다.</div></div><div class="action-bar" style="margin-top:24px;"><button class="btn btn-ghost" onclick="switchStep('guide')">← 테스트 수정</button><button class="btn btn-secondary" onclick="restartAll()">🔄 처음부터</button></div>`;
}
function renderActions(actions) {
  let h = '';

  // 요약 카운트
  const successCount = actions.filter(a => a.level === 'success').length;
  const warningCount = actions.filter(a => a.level === 'warning').length;
  const dangerCount  = actions.filter(a => a.level === 'danger').length;

  // 최종 판정
  let verdictIcon, verdictTitle, verdictDesc;
  if (dangerCount === 0 && warningCount === 0) {
    verdictIcon  = '🎉';
    verdictTitle = '모든 테스트 통과!';
    verdictDesc  = '선택하신 원단 조합은 모든 테스트 항목에서 양호한 결과를 보였습니다. 생산 진행이 가능합니다.';
  } else if (dangerCount === 0) {
    verdictIcon  = '⚠️';
    verdictTitle = '조건부 생산 가능';
    verdictDesc  = '일부 항목에서 주의가 필요합니다. 아래 권장 조치를 적용한 후 생산을 진행하세요.';
  } else {
    verdictIcon  = '🚫';
    verdictTitle = '생산 전 조치 필수';
    verdictDesc  = '중요한 문제가 발견되었습니다. 아래 필수 조치 사항을 반드시 이행한 후 재테스트하세요.';
  }

  h += `
    <div class="final-verdict">
      <div class="verdict-icon">${verdictIcon}</div>
      <div class="verdict-title">${verdictTitle}</div>
      <div class="verdict-desc">${verdictDesc}</div>
    </div>`;

  // 요약 칩
  h += `<div class="action-summary-bar">`;
  if (successCount) h += `<span class="action-summary-chip success">✅ 양호 ${successCount}</span>`;
  if (warningCount) h += `<span class="action-summary-chip warning">⚠️ 주의 ${warningCount}</span>`;
  if (dangerCount)  h += `<span class="action-summary-chip danger">🚫 위험 ${dangerCount}</span>`;
  h += `</div>`;

  // 위험 → 주의 → 양호 순 정렬
  const order = { danger: 0, warning: 1, success: 2 };
  const sorted = [...actions].sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));

  // 조치 카드
  sorted.forEach(a => {
    h += `
      <div class="rec-card rec-${a.level}">
        <div class="rec-icon">${a.icon}</div>
        <div class="rec-body">
          <div class="rec-test-name">${a.testName}</div>
          <div class="rec-title">${a.title}</div>
          <div class="rec-desc">${a.desc}</div>
          <div class="rec-input-val">측정값: ${a.inputValue} ${a.inputUnit}</div>
        </div>
      </div>`;
  });

  // 하단 액션
  h += `
    <div class="action-bar" style="margin-top:24px;">
      <button class="btn btn-ghost" onclick="switchStep('guide')">← 테스트 수정</button>
      <button class="btn btn-secondary" onclick="restartAll()">🔄 처음부터</button>
    </div>`;

  $('#action-content').innerHTML = h;
}



function restartAll() {
  selected.clear();
  invalidate();
  projectPurpose = '';
  switchStep('select');
  renderFabrics();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.restartAll = restartAll;



// ============================================================
//  초기화
// ============================================================
async function init() {
  updateSteps();
  $('#fabric-list').innerHTML = '<div class="loading-state"><div class="spinner"></div><p>원단 카탈로그 조회 중...</p></div>';
  try {
    fabrics = await API.getFabrics();
    renderFabrics();
  } catch (error) {
    $('#fabric-list').innerHTML = `
      <div class="empty-state">
        <p>원단 목록 로드에 실패했습니다: ${escape(error.message)}</p>
        <button class="btn btn-primary" onclick="init()">다시 시도</button>
      </div>`;
  }
}

init();
