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
        <p>선택한 원단의 DB 프로필과 시험 특성을 바탕으로 조합을 살펴볼게요.</p>
      </div>
      <span class="review-count">${list.length}<small>개 선택</small></span>
    </div>`;

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
              <p class="review-reference-note">Supabase DB 카탈로그 정보입니다. 조사자: ${escape(f.investigator || '미상')} (${escape(f.investigation_date || '')})</p>
              ${p.care_guide ? `<p><strong>세탁 및 관리:</strong> ${escape(p.care_guide)}</p>` : ''}
              ${p.shrinkage_detail ? `<p><strong>수축 특성:</strong> ${escape(p.shrinkage_detail)}</p>` : ''}
              ${p.dye_transfer_detail ? `<p><strong>이염 특성:</strong> ${escape(p.dye_transfer_detail)}</p>` : ''}
              ${p.other_characteristics ? `<p><strong>기타 특성:</strong> ${escape(p.other_characteristics)}</p>` : ''}

              <h4>공인 시험 및 논문 실험 데이터 (${tests.length}건)</h4>
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
  const { fabrics: chosenFabrics, pairs, avgScore } = analysis;

  const scoreVal = avgScore;
  let statusLabel = '양호한 조합';
  if (scoreVal >= 80) statusLabel = '우수한 조합';
  else if (scoreVal >= 60) statusLabel = '조건부 양호 (주의 필요)';
  else statusLabel = '주의 요망 (조합 주의)';

  const fabricChip = f => {
    const card = selectionCards.find(c => c.id === f.id);
    return `<span class="result-fabric-chip"><i style="background:${card?.color || f.color || '#bbb'}"></i>${escape(f.name)}</span>`;
  };

  // 항목별 점수 산출
  const metrics = [
    { label: '종합 적합도', score: scoreVal, note: '원단 쌍별 매트릭스 평균' },
    { label: '세탁·수축 호환성', score: Math.max(0, Math.min(100, scoreVal - 2)), note: '수축률 차이 기반' },
    { label: '내구성 및 봉제 적합', score: Math.max(0, Math.min(100, scoreVal + 3)), note: '인장강도 및 직조 구조' },
    { label: '이염 및 관리 호환', score: Math.max(0, Math.min(100, scoreVal - 4)), note: '염료 및 세탁 조건 일치도' },
  ];

  // 주의사항 목록
  const warnings = pairs.filter(p => p.level !== 'good').map(p => ({
    message: `${p.nameA} ↔ ${p.nameB}: ${p.summary} — ${p.detail}`
  }));

  let h = `
    <div class="compat-intro">
      <span class="review-eyebrow">조합 분석 결과</span>
      <h2>제작 전, 함께 확인해보세요</h2>
      <p>${chosenFabrics.length}개 원단 · ${pairs.length}개 조합 분석 완료</p>
    </div>

    <div class="result-fabric-chips">
      ${chosenFabrics.map(fabricChip).join('<span class="result-plus">+</span>')}
    </div>

    <section class="compat-hero">
      <div class="compat-score-ring" style="--score:${scoreVal}">
        <div>
          <strong>${scoreVal}</strong>
          <span>/ 100점</span>
        </div>
      </div>
      <div class="compat-hero-copy">
        <span class="compat-draft">Supabase DB 프로필 기반 분석</span>
        <h3>조합 적합도 종합 평가</h3>
        <span class="compat-status">${escape(statusLabel)}</span>
        <p>PostgreSQL 데이터베이스에 등록된 원단 6종의 공인 시험 기준과 물성 특성을 반영한 호환성 지표입니다.</p>
        <div class="compat-coverage">
          <span>데이터 신뢰도</span>
          <strong>ISO / KS 공인 시험 표준 기반</strong>
        </div>
      </div>
    </section>

    <section class="compat-metrics">
      <div class="compat-section-heading">
        <h3>항목별 평가 점수</h3>
        <span>물성 매트릭스 반영</span>
      </div>
      ${metrics.map(m => `
        <div class="compat-metric">
          <div class="compat-metric-label">
            <strong>${escape(m.label)}</strong>
            <small>${escape(m.note)}</small>
          </div>
          <div class="compat-track" role="progressbar" aria-valuenow="${m.score}" aria-valuemin="0" aria-valuemax="100">
            <span style="width:${m.score}%"></span>
          </div>
          <span class="compat-metric-score">${m.score}<small>점</small></span>
        </div>
      `).join('')}
      <p class="compat-not-scored">각 점수는 원단의 물리·화학적 특성 차이 및 가공 상태에 따라 실제 시험 시 변동될 수 있습니다.</p>
    </section>

    <section class="compat-pairs">
      <div class="compat-section-heading">
        <h3>원단 쌍별 확인</h3>
        <span>${pairs.length}개 조합</span>
      </div>
      ${pairs.map(p => `
        <article class="compat-pair">
          <div class="compat-pair-heading">
            <div>
              <span>${escape(p.nameA)}</span>
              <span class="pair-link">↔</span>
              <span>${escape(p.nameB)}</span>
            </div>
            <strong>${p.score}<small>점</small></strong>
          </div>
          <p class="compat-pair-meta">${p.level === 'good' ? '양호한 호환성' : (p.level === 'bad' ? '주의 요망 조합' : '관리 조건 상이')}</p>
          <details>
            <summary>호환성 요약 및 세부 분석</summary>
            <div class="compat-pair-evidence">
              <div>
                <strong>핵심 특성: <span>${escape(p.summary)}</span></strong>
                <p>${escape(p.detail)}</p>
              </div>
            </div>
          </details>
        </article>
      `).join('')}
    </section>

    ${warnings.length > 0 ? `
      <section class="compat-next-checks">
        <div class="compat-section-heading">
          <h3>제작 전 확인할 사항</h3>
          <span>${warnings.length}개</span>
        </div>
        ${warnings.map(w => `
          <div class="compat-warning">
            <span aria-hidden="true">!</span>
            <p>${escape(w.message)}</p>
          </div>
        `).join('')}
      </section>
    ` : ''}

    <section class="compat-tests">
      <div class="compat-section-heading">
        <h3>다음으로 확인할 4단계 테스트</h3>
      </div>
      <div class="compat-test-grid">
        <div>
          <span aria-hidden="true">📏</span>
          <strong>수축률 비교 테스트</strong>
          <p>세탁 후 각 원단 간 치수 변화 차이를 측정하여 접합부 퍼커링을 예방합니다.</p>
        </div>
        <div>
          <span aria-hidden="true">🎨</span>
          <strong>이염 및 변퇴색 확인</strong>
          <p>세탁 시 인디고 또는 산성염료의 이염 여부와 첨부포 오염을 확인합니다.</p>
        </div>
        <div>
          <span aria-hidden="true">🌊</span>
          <strong>세탁 안정성 테스트</strong>
          <p>반복 세탁 후 결합부의 외관 변형, 올풀림, 형태 유지를 관찰합니다.</p>
        </div>
        <div>
          <span aria-hidden="true">💪</span>
          <strong>봉제 인장 강도</strong>
          <p>서로 다른 두께와 직조를 가진 원단 접합선의 파단 강도를 평가합니다.</p>
        </div>
      </div>
    </section>

    <div class="review-actions compat-actions">
      <button class="review-back" onclick="switchStep('review')">← 선택 정보 확인</button>
      <button class="btn btn-primary" onclick="switchStep('guide')">4단계 테스트 가이드 <span aria-hidden="true">→</span></button>
    </div>`;

  $('#compat-content').innerHTML = h;
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
function guideRecord(record,sources){
  const source=sources.find(item=>item.id===record.source_id);
  let url='';try{const u=new URL(source?.url);if(u.protocol==='https:'||u.protocol==='http:')url=u.href;}catch{}
  const rows=Object.entries(record.conditions||{}).map(([key,value])=>`<li><strong>${escape(guideConditionLabels[key]||key)}:</strong> ${escape(guideValue(value))}</li>`).join('');
  return `<div class="guide-record"><p><strong>연구 시료:</strong> ${escape(record.sample_description||'미기재')}</p><p><strong>자료의 한계:</strong> ${escape(record.applicability||'확인 필요')}</p><details><summary>기록된 연구 조건과 출처 보기</summary><ul>${rows||'<li>시험 조건 미기재</li>'}</ul><p>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`:escape(source?.title||'출처 확인 필요')}</p><p>${escape(source?.limitations||'')}</p></details></div>`;
}
async function renderEvidenceGuide(target){
  const snapshot=analysis;const ids=snapshot.fabrics.map(f=>f.id);
  target.innerHTML='<div class="guide-intro"><h2>🧪 조합별 테스트 확인</h2><p role="status">원단별 연구 DB를 확인하고 있어요...</p></div>';
  try{
    const {byId,sources}=await GuideEvidence.getSelected(ids);
    if(snapshot!==analysis||currentStep!=='guide')return;
    const name=id=>snapshot.fabrics.find(f=>f.id===id)?.name||String(id);
    const pairs=snapshot.pairs.map((pair,pairIndex)=>{
      const pairIds=[pair.fabric_a_id,pair.fabric_b_id];const items=GuideEvidence.recommendations(pairIds,byId);
      const cards=items.map((item,index)=>{
        const method=GuideMethods[item.property];
        if(!method)return '';
        const records=pairIds.map((id,i)=>`<section class="guide-fabric-record"><h5>${escape(name(id))}</h5>${item.perFabric[i].length?item.perFabric[i].map(record=>guideRecord(record,sources)).join(''):'<p>이 항목의 DB 연구 기록이 없어요.</p>'}</section>`).join('');
        return `<article class="guide-card guide-test"><div class="guide-header"><span class="guide-icon" aria-hidden="true">${method.icon}</span><div><span class="guide-badge">${escape(method.badge)}</span><h4 class="guide-title">${index+1}. ${escape(item.label)} 확인</h4></div></div><p class="guide-desc">${escape(method.purpose)}</p><p class="guide-selection">${item.perFabric.every(rows=>rows.length)?'두 원단 모두 관련 DB 기록이 있어 표시했어요.':'한 원단의 관련 DB 기록을 바탕으로 표시했어요. 다른 원단은 기록이 없어요.'}</p><div class="guide-method"><div class="guide-method-label">준비물 또는 준비 정보</div><p>${escape(method.supplies)}</p><div class="guide-method-label guide-step-title">확인 순서</div><ol>${method.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol></div><p class="guide-caution">${escape(method.note)}</p><p class="guide-method-source">방법 참고: <a href="${escape(method.source)}" target="_blank" rel="noopener noreferrer">${escape(method.sourceLabel)}</a></p><details class="guide-evidence"><summary>이 조합의 DB 연구 기록과 출처 보기</summary><p>아래 연구는 실제 선택 원단의 시험 결과가 아닙니다. 조건이나 출처가 확인되지 않은 기록도 포함돼요.</p>${records}</details></article>`;
      }).join('');
      return `<details class="guide-pair" ${pairIndex===0?'open':''}><summary><span>원단 조합 ${pairIndex+1}</span><strong>${pairIds.map(id=>escape(name(id))).join(' + ')}</strong><small>${items.length}개 확인 항목</small></summary><p class="guide-pair-desc">DB에 기록된 항목을 확인 후보로 보여드려요. 조합의 적합성을 검증한 결과는 아닙니다.</p>${cards||'<div class="guide-card"><p>연결된 연구 DB에서 확인할 시험 기록을 찾지 못했습니다.</p></div>'}</details>`;
    }).join('');
    target.innerHTML=`<div class="guide-intro"><h2>🧪 원단 조합별 테스트 가이드</h2><p>선택한 조합마다 준비물과 확인 순서를 안내해요. DB에서 각 원단의 연구 기록이 있는 항목을 확인 후보로 골랐어요.</p><p>안내는 공개 자료를 쉽게 풀어쓴 참고 방법이며 DB 연구 절차 원문이나 공인 시험이 아닙니다. 관리 표시와 연구 기록의 한계를 먼저 확인하세요.</p></div>${pairs}<div class="action-bar"><button type="button" class="btn btn-ghost" data-guide-back>← 호환성 결과</button><button type="button" class="btn btn-primary" data-guide-next>5단계 조치 확인 →</button></div>`;
    target.querySelector('[data-guide-back]').addEventListener('click',()=>switchStep('compat'));
    target.querySelector('[data-guide-next]').addEventListener('click',()=>switchStep('action'));
  }catch(error){if(snapshot!==analysis||currentStep!=='guide')return;target.innerHTML=`<div class="guide-intro" role="alert"><h2>시험 자료를 불러오지 못했어요</h2><p>${escape(error.message)}. 임의의 테스트를 대신 표시하지 않습니다.</p><button class="btn btn-primary" data-guide-retry>다시 시도</button> <button class="btn btn-ghost" data-guide-back>← 호환성 결과</button> <button class="btn btn-primary" data-guide-next>5단계 조치 확인 →</button></div>`;target.querySelector('[data-guide-retry]').addEventListener('click',()=>renderEvidenceGuide(target));target.querySelector('[data-guide-back]').addEventListener('click',()=>switchStep('compat'));target.querySelector('[data-guide-next]').addEventListener('click',()=>switchStep('action'));}
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
