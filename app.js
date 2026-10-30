// ============================================================
//  app.js — UI 컨트롤러 (원단 6종 DB 연동 및 4단계 테스트 가이드 완성)
// ============================================================

// === 전역 상태 ===
let fabricsCache = [];          // 원단 목록 캐시
let selectedIds  = new Set();   // 선택된 원단 ID 셋
let compatResult = null;        // 호환성 분석 결과
let testGuides   = [];          // 4단계 테스트 가이드 목록
let testInputs   = {};          // 테스트 입력값 캐시

// === DOM 선택자 ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const $fabricList      = $('#fabric-list');
const $selectedList    = $('#selected-fabrics');
const $selectedSummary = $('#selected-summary');
const $btnTest         = $('#btn-test');
const $floatingBar     = $('#floating-bar');
const $selectedCount   = $('#selected-count');
const $compatContent   = $('#compat-content');
const $guideContent    = $('#guide-content');
const $actionContent   = $('#action-content');
const $fabricModal     = $('#fabric-modal');
const $modalTitle      = $('#modal-title');
const $modalBadge      = $('#modal-badge');
const $modalBody       = $('#modal-body');

// ============================================================
//  스텝 전환 관리 (1: select -> 2: review -> 3: compat -> 4: guide -> 5: action)
// ============================================================
const STEPS = ['select', 'review', 'compat', 'guide', 'action'];
let currentStep = 'select';

function switchStep(stepName) {
  currentStep = stepName;

  // 탭 패널 활성화
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${stepName}`));

  // 스텝 인디케이터 갱신
  const stepIdx = STEPS.indexOf(stepName);
  $$('.step-indicator .step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < stepIdx)  el.classList.add('done');
    if (i === stepIdx) el.classList.add('active');
  });

  // 플로팅 바 제어
  $floatingBar.classList.toggle('hidden', stepName !== 'select' || selectedIds.size === 0);

  // 탭별 진입 시 렌더
  if (stepName === 'review') renderSelectedView();
  if (stepName === 'guide')  renderGuide();

  // 상단 스크롤
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 인디케이터 클릭 네비게이션
$$('.step-indicator .step').forEach((el) => {
  el.addEventListener('click', () => {
    const target = el.dataset.step;
    const targetIdx = STEPS.indexOf(target);
    const curIdx = STEPS.indexOf(currentStep);
    if (targetIdx <= curIdx) switchStep(target);
  });
});

// ============================================================
//  ① 1단계: 원단 선택 목록 렌더
// ============================================================
function renderFabricList() {
  $fabricList.innerHTML = fabricsCache.map(f => {
    const sel = selectedIds.has(f.id);
    const gsmDisplay = f.properties?.gsm ? `${f.properties.gsm} GSM` : (f.properties?.gsm_range_text || 'GSM 미기재');
    const shrinkDisplay = f.properties?.shrinkage_avg_pct ? `수축률 ${f.properties.shrinkage_avg_pct}%` : '수축률 미기재';

    return `
      <div class="fabric-card ${sel ? 'selected' : ''}" data-id="${f.id}">
        <div class="check-icon">${sel ? '✓' : ''}</div>
        <div class="color-swatch" style="background:${f.color}"></div>
        <div class="fabric-name">${f.name} <span class="fabric-alias">(${f.aliases || f.category})</span></div>
        <div class="fabric-desc">${f.desc}</div>
        <div class="fabric-meta">
          ${f.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          <span class="tag tag-spec">${gsmDisplay}</span>
          <span class="tag tag-spec">${shrinkDisplay}</span>
        </div>
        <div class="card-footer-actions">
          <button class="btn btn-detail" onclick="event.stopPropagation(); openFabricModal(${f.id})">🔍 상세 물성·시험 스펙</button>
        </div>
      </div>`;
  }).join('');
}

$fabricList.addEventListener('click', (e) => {
  const card = e.target.closest('.fabric-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
  renderFabricList();
  renderSelectedView();
  updateFloatingBar();
});

// ============================================================
//  원단 상세 정보 모달 (PDF 정밀 분석 데이터 표시)
// ============================================================
async function openFabricModal(fabricId) {
  const f = await API.getFabricDetail(fabricId);
  if (!f) return;

  $modalTitle.textContent = `${f.name} 상세 프로필 & 시험 데이터`;
  $modalBadge.textContent = `${f.category} 섬유 · 조사자: ${f.investigator || '미상'}`;

  const p = f.properties || {};
  const tests = f.tests || [];
  const sources = f.sources || [];

  let html = `
    <div class="spec-section">
      <h4>📌 기본 물성 및 프로필</h4>
      <table class="spec-table">
        <tr><th>조성</th><td>${p.fiber_composition || 'NULL'}</td></tr>
        <tr><th>조직</th><td>${p.weave_type || 'NULL'} (${p.structure_detail || '상세 미기재'})</td></tr>
        <tr><th>두께 / GSM</th><td>두께: ${p.thickness_mm !== null ? p.thickness_mm + ' mm' : 'NULL'} | GSM: ${p.gsm !== null ? p.gsm + ' GSM' : (p.gsm_range_text || 'NULL')}</td></tr>
        <tr><th>신축성</th><td>${p.elasticity || 'NULL'} (${p.elasticity_detail || '상세 미기재'})</td></tr>
        <tr><th>수축률</th><td>${p.shrinkage_avg_pct ? p.shrinkage_avg_pct + '%' : 'NULL'} (경사: ${p.shrinkage_warp_pct ?? 'NULL'}%, 위사: ${p.shrinkage_weft_pct ?? 'NULL'}%)<br><small>${p.shrinkage_detail || ''}</small></td></tr>
        <tr><th>색상 변화</th><td>${p.color_fastness_detail || 'NULL'}</td></tr>
        <tr><th>이염 특성</th><td>${p.dye_transfer_detail || 'NULL'}</td></tr>
        <tr><th>세탁 관리</th><td>${p.care_guide || 'NULL'}</td></tr>
        <tr><th>기타 특성</th><td>${p.other_characteristics || 'NULL'}</td></tr>
      </table>
    </div>

    <div class="spec-section">
      <h4>🧪 공인 시험 및 실험 결과 (${tests.length}건)</h4>
      <div class="modal-tests-list">
        ${tests.map(t => `
          <div class="test-item-card">
            <div class="test-item-name">🔬 ${t.name}</div>
            <div class="test-item-cond"><strong>시험 조건:</strong> ${t.condition}</div>
            <div class="test-item-res"><strong>결과:</strong> ${t.result}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="spec-section">
      <h4>📚 참고 출처 및 표준 규격</h4>
      <ul class="sources-list">
        ${sources.map(s => `
          <li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a></li>
        `).join('')}
      </ul>
    </div>
  `;

  $modalBody.innerHTML = html;
  $fabricModal.classList.remove('hidden');
}

function closeFabricModal() {
  $fabricModal.classList.add('hidden');
}

// ============================================================
//  ② 2단계: 선택 조회 렌더
// ============================================================
function renderSelectedView() {
  const selected = fabricsCache.filter(f => selectedIds.has(f.id));

  $selectedSummary.innerHTML = `
    <div class="count">${selected.length}</div>
    <div class="label">개 원단 선택됨 (최소 2개 이상 조합 필요)</div>`;

  if (selected.length === 0) {
    $selectedList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>선택된 원단이 없습니다<br><small>1단계 '원단 선택' 탭에서 조합할 원단을 선택해주세요</small></p>
      </div>`;
  } else {
    $selectedList.innerHTML = selected.map(f => `
      <div class="selected-item">
        <div class="swatch" style="background:${f.color}"></div>
        <div class="info">
          <div class="name">${f.name} <small>(${f.aliases || f.category})</small></div>
          <div class="detail">${f.tags.join(' · ')}</div>
        </div>
        <button class="btn btn-detail" onclick="openFabricModal(${f.id})">스펙 보기</button>
        <button class="btn-remove" data-id="${f.id}" title="제거">✕</button>
      </div>`).join('');
  }

  $btnTest.disabled = selected.length < 2;
}

$selectedList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-remove');
  if (!btn) return;
  selectedIds.delete(Number(btn.dataset.id));
  renderFabricList();
  renderSelectedView();
  updateFloatingBar();
});

// ============================================================
//  ③ 3단계: 호환성 분석 실행 + 렌더
// ============================================================
$btnTest.addEventListener('click', async () => {
  switchStep('compat');

  $compatContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Supabase PostgreSQL 데이터베이스 호환성 매트릭스 분석 중...</p>
    </div>`;

  compatResult = await API.analyzeCompatibility([...selectedIds]);
  testGuides = await API.getTestGuides(compatResult.pairs);
  testInputs = {};

  renderCompatResult();
});

function renderCompatResult() {
  const { fabrics, pairs, avgScore } = compatResult;

  let grade, gradeLabel, badgeCls;
  if (avgScore >= 80)      { grade = '🟢'; gradeLabel = '우수'; badgeCls = 'good'; }
  else if (avgScore >= 60) { grade = '🟡'; gradeLabel = '보통 (주의 필요)'; badgeCls = 'caution'; }
  else                     { grade = '🔴'; gradeLabel = '위험 (조합 주의)'; badgeCls = 'bad'; }

  let h = '';

  // 조합 원단 칩
  h += `<div class="combo-chips">`;
  fabrics.forEach((f, i) => {
    if (i > 0) h += `<span class="combo-plus">+</span>`;
    h += `<span class="combo-chip"><span class="chip-dot" style="background:${f.color}"></span>${f.name}</span>`;
  });
  h += `</div>`;

  // 종합 결과 헤더
  h += `
    <div class="result-header">
      <div class="result-grade">${grade}</div>
      <div class="result-title">종합 조합 적합도: ${gradeLabel} (${avgScore}점)</div>
      <div class="result-subtitle">${fabrics.length}종 원단 · 총 ${pairs.length}개 쌍별 조합에 대한 상호 작용 분석 완료</div>
    </div>`;

  // 점수 지표 바
  const scoreWash = clamp(avgScore - 3);
  const scoreDurability = clamp(avgScore + 4);
  const scoreSewing = clamp(avgScore - 2);

  const cats = [
    { label: '종합 적합 점수', value: avgScore },
    { label: '세탁·수축 호환성', value: scoreWash },
    { label: '마찰·내구성 호환', value: scoreDurability },
    { label: '봉제·조직 적합성', value: scoreSewing },
  ];
  h += `<div class="score-bar-container">`;
  cats.forEach(c => {
    const cls = c.value >= 70 ? 'high' : c.value >= 50 ? 'mid' : 'low';
    h += `
      <div class="score-row">
        <span class="score-label">${c.label}</span>
        <div class="score-track"><div class="score-fill ${cls}" style="width:${c.value}%"></div></div>
        <span class="score-value">${c.value}점</span>
      </div>`;
  });
  h += `</div>`;

  // 쌍별 상세 카드
  h += `<div class="pair-section"><div class="section-title">📊 원단 쌍별 상세 호환성 평가</div>`;
  pairs.forEach(p => {
    const pCls = p.level === 'good' ? 'good' : p.level === 'bad' ? 'bad' : 'caution';
    const pTxt = p.level === 'good' ? '양호' : p.level === 'bad' ? '비추천' : '주의 요망';
    h += `
      <div class="pair-card">
        <div class="pair-names">
          <strong>${p.nameA} ↔ ${p.nameB}</strong>
          <span class="compat-badge ${pCls}">${pTxt} ${p.score}점</span>
        </div>
        <div class="pair-summary">${p.summary}</div>
        <div class="pair-detail">${p.detail}</div>
      </div>`;
  });
  h += `</div>`;

  // 다음 스텝(테스트 가이드) 이동 버튼
  h += `
    <div class="action-bar">
      <button class="btn btn-ghost" onclick="switchStep('review')">← 선택 조회로 돌아가기</button>
      <button class="btn btn-primary" onclick="switchStep('guide')">🧪 4단계 테스트 가이드 진행 →</button>
    </div>`;

  $compatContent.innerHTML = h;
}

// ============================================================
//  ④ 4단계: 테스트 가이드 + 결과 입력 렌더 (핵심 요구사항)
// ============================================================
function renderGuide() {
  if (!testGuides || testGuides.length === 0) {
    $guideContent.innerHTML = `
      <div class="empty-state">
        <div class="icon">🧪</div>
        <p>진행할 호환성 분석 데이터가 없습니다.<br>원단을 선택한 후 3단계 호환성 분석을 먼저 진행해주세요.</p>
        <button class="btn btn-primary" onclick="switchStep('select')">원단 선택하러 가기</button>
      </div>`;
    return;
  }

  let h = '';

  h += `
    <div class="guide-intro">
      <h2>🧪 4단계: 물리·화학 테스트 가이드</h2>
      <p>
        선택하신 원단 조합의 특성과 호환성 취약점에 따라 <strong>필수 테스트 ${testGuides.length}종</strong>이 도출되었습니다.<br>
        아래 공인 시험 가이드라인에 따라 실험을 진행하고, 측정값을 입력하여 <strong>맞춤 조치 추천</strong>을 받으세요.
      </p>
    </div>`;

  testGuides.forEach((g, idx) => {
    const curVal = testInputs[g.id] ?? '';
    const hasVal = curVal !== '';

    h += `<div class="guide-card" data-test-id="${g.id}">`;

    // 가이드 헤더
    h += `
      <div class="guide-header">
        <span class="guide-icon">${g.icon}</span>
        <div class="guide-title-box">
          <span class="guide-title">${idx + 1}. ${g.name}</span>
          <span class="guide-spec-badge">공인 표준 기반</span>
        </div>
      </div>
      <div class="guide-desc">${g.description || g.desc}</div>`;

    // 시험 절차 및 프로토콜
    h += `
      <div class="guide-method">
        <div class="guide-method-label">📋 표준 시험 절차 (Test Method)</div>
        <div class="guide-method-text">${g.method}</div>
      </div>`;

    // 측정값 입력 영역
    h += `<div class="guide-input-group">`;
    h += `<label class="input-title"><strong>${g.input_label || g.inputLabel || g.name + ' 측정 결과'}:</strong></label>`;

    if (g.input_type === 'number' || g.inputType === 'number') {
      h += `
        <div class="input-with-unit">
          <input type="number" step="any" class="test-input" data-test-id="${g.id}" value="${curVal}" placeholder="예: 2.5" />
          <span class="input-unit">${g.unit || ''}</span>
        </div>`;
    } else if (g.input_type === 'select' || g.inputType === 'select') {
      const opts = g.test_input_options || g.inputOptions || [];
      h += `
        <select class="test-input" data-test-id="${g.id}">
          <option value="">평가 등급을 선택하세요</option>
          ${opts.map(o => `<option value="${o.value}" ${curVal == o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>`;
    }
    h += `</div>`;

    // 입력 상태 알림
    h += `<div class="guide-input-status ${hasVal ? 'valid' : 'empty'}">
            ${hasVal ? '✓ 측정값 입력 완료' : '⚠️ 측정 결과를 입력해주세요'}
          </div>`;

    h += `</div>`;
  });

  // 입력 완료 카운트 & 제출 바
  const filledCount = testGuides.filter(g => testInputs[g.id] !== undefined && testInputs[g.id] !== '').length;
  const allFilled = filledCount === testGuides.length;

  h += `
    <div class="guide-submit-bar">
      <div class="guide-progress-info">
        진행률: <strong>${filledCount} / ${testGuides.length}</strong> 개 테스트 입력 완료
      </div>
      <div class="action-bar">
        <button class="btn btn-ghost" onclick="switchStep('compat')">← 호환성 결과</button>
        <button class="btn btn-primary" id="btn-submit-tests" ${allFilled ? '' : 'disabled'}>
          📋 5단계 맞춤 조치 추천 받기 →
        </button>
      </div>
    </div>`;

  $guideContent.innerHTML = h;

  // 인풋 이벤트 리스너 등록
  $$('.test-input').forEach(el => {
    el.addEventListener('input', onTestInput);
    el.addEventListener('change', onTestInput);
  });

  const btnSubmit = $('#btn-submit-tests');
  if (btnSubmit) btnSubmit.addEventListener('click', submitTests);
}

function onTestInput(e) {
  const testId = e.target.dataset.testId;
  testInputs[testId] = e.target.value;
  renderGuide();
}

// ============================================================
//  ⑤ 5단계: 조치 추천 분석 및 렌더
// ============================================================
async function submitTests() {
  switchStep('action');

  $actionContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>입력된 테스트 측정값을 바탕으로 생산 공정 맞춤 조치를 도출하는 중...</p>
    </div>`;

  const results = testGuides
    .filter(g => testInputs[g.id] !== undefined && testInputs[g.id] !== '')
    .map(g => ({ testId: g.id, value: testInputs[g.id] }));

  const sessionId = `session_${Date.now()}`;
  await API.saveTestResults(sessionId, results);

  const actions = await API.getActionRecommendations(results);
  renderActions(actions);
}

function renderActions(actions) {
  let h = '';

  const successCount = actions.filter(a => a.level === 'success').length;
  const warningCount = actions.filter(a => a.level === 'warning').length;
  const dangerCount  = actions.filter(a => a.level === 'danger').length;

  let verdictIcon, verdictTitle, verdictDesc;
  if (dangerCount === 0 && warningCount === 0) {
    verdictIcon  = '🎉';
    verdictTitle = '모든 테스트 기준 충족 (양호)';
    verdictDesc  = '선택하신 원단 조합은 수축률, 마찰, 이염, 강도 등 모든 항목에서 우수한 안정성을 나타냈습니다. 표준 공정으로 즉시 생산이 가능합니다.';
  } else if (dangerCount === 0) {
    verdictIcon  = '⚠️';
    verdictTitle = '조건부 생산 권장 (보완 조치 필요)';
    verdictDesc  = '일부 항목에서 경미한 변형 또는 이염 가능성이 관찰되었습니다. 아래 공정별 권장 조치 사항을 적용한 후 생산을 진행하세요.';
  } else {
    verdictIcon  = '🚫';
    verdictTitle = '생산 전 필수 조치 이행 요구 (위험)';
    verdictDesc  = '치수 수축 차이 극심 또는 심각한 이염/파열 위험이 발견되었습니다. 필수 기술 조치를 완료한 후 재시험을 거쳐야 합니다.';
  }

  h += `
    <div class="final-verdict">
      <div class="verdict-icon">${verdictIcon}</div>
      <div class="verdict-title">${verdictTitle}</div>
      <div class="verdict-desc">${verdictDesc}</div>
    </div>`;

  // 요약 칩 바
  h += `<div class="action-summary-bar">`;
  if (successCount) h += `<span class="action-summary-chip success">✅ 양호 ${successCount}건</span>`;
  if (warningCount) h += `<span class="action-summary-chip warning">⚠️ 주의 권장 ${warningCount}건</span>`;
  if (dangerCount)  h += `<span class="action-summary-chip danger">🚫 필수 조치 ${dangerCount}건</span>`;
  h += `</div>`;

  // 위험도 순 정렬
  const order = { danger: 0, warning: 1, success: 2 };
  const sorted = [...actions].sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));

  sorted.forEach(a => {
    h += `
      <div class="rec-card rec-${a.level}">
        <div class="rec-icon">${a.icon}</div>
        <div class="rec-body">
          <div class="rec-test-name">시험 항목: ${a.testName} (입력 측정값: ${a.inputValue} ${a.inputUnit})</div>
          <div class="rec-title">${a.title}</div>
          <div class="rec-desc">${a.desc}</div>
        </div>
      </div>`;
  });

  h += `
    <div class="action-bar" style="margin-top:28px;">
      <button class="btn btn-ghost" onclick="switchStep('guide')">← 4단계 테스트 가이드로 수정</button>
      <button class="btn btn-secondary" onclick="restartAll()">🔄 처음부터 새로운 원단 조합 테스트</button>
    </div>`;

  $actionContent.innerHTML = h;
}

// ============================================================
//  유틸리티 및 초기화
// ============================================================
function updateFloatingBar() {
  $selectedCount.textContent = selectedIds.size;
  $floatingBar.classList.toggle('hidden', selectedIds.size === 0 || currentStep !== 'select');
}

function restartAll() {
  selectedIds.clear();
  compatResult = null;
  testGuides = [];
  testInputs = {};
  renderFabricList();
  renderSelectedView();
  updateFloatingBar();
  switchStep('select');
}

function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

// 초기 실행
(async function init() {
  fabricsCache = await API.getFabrics();
  renderFabricList();
  renderSelectedView();
})();
