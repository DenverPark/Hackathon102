// ============================================================
//  app.js — UI 컨트롤러
//  데이터는 모두 api.js (API 레이어)를 통해 접근
// ============================================================

// === 상태 ===
let fabricsCache = [];          // 원단 목록 캐시
let selectedIds  = new Set();
let compatResult = null;        // 호환성 분석 결과
let testGuides   = [];          // 진행 테스트 가이드 목록
let testInputs   = {};          // 사용자 테스트 결과 입력값

// === DOM ===
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

// ============================================================
//  스텝 전환
// ============================================================
const STEPS = ['select', 'review', 'compat', 'guide', 'action'];
let currentStep = 'select';

function switchStep(stepName) {
  currentStep = stepName;

  // 패널 전환
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${stepName}`));

  // 인디케이터 업데이트
  const stepIdx = STEPS.indexOf(stepName);
  $$('.step-indicator .step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < stepIdx)  el.classList.add('done');
    if (i === stepIdx) el.classList.add('active');
  });

  // 플로팅 바 — 원단 선택 탭에서만 표시
  $floatingBar.classList.toggle('hidden', stepName !== 'select' || selectedIds.size === 0);

  // 탭별 렌더 트리거
  if (stepName === 'review') renderSelectedView();
}

// 인디케이터 클릭으로 이전 스텝 이동 (완료된 스텝만)
$$('.step-indicator .step').forEach((el) => {
  el.addEventListener('click', () => {
    const target = el.dataset.step;
    const targetIdx = STEPS.indexOf(target);
    const curIdx = STEPS.indexOf(currentStep);
    if (targetIdx <= curIdx) switchStep(target);
  });
});


// ============================================================
//  ① 원단 선택 렌더
// ============================================================
function renderFabricList() {
  $fabricList.innerHTML = fabricsCache.map(f => {
    const sel = selectedIds.has(f.id);
    return `
      <div class="fabric-card ${sel ? 'selected' : ''}" data-id="${f.id}">
        <div class="check-icon">${sel ? '✓' : ''}</div>
        <div class="color-swatch" style="background:${f.color}"></div>
        <div class="fabric-name">${f.name}</div>
        <div class="fabric-desc">${f.desc}</div>
        <div class="fabric-meta">
          ${f.tags.map(t => `<span class="tag">${t}</span>`).join('')}
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
//  ② 선택 조회 렌더
// ============================================================
function renderSelectedView() {
  const selected = fabricsCache.filter(f => selectedIds.has(f.id));

  $selectedSummary.innerHTML = `
    <div class="count">${selected.length}</div>
    <div class="label">개 원단 선택됨</div>`;

  if (selected.length === 0) {
    $selectedList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>선택된 원단이 없습니다<br><small>원단 선택 탭에서 원단을 선택해주세요</small></p>
      </div>`;
  } else {
    $selectedList.innerHTML = selected.map(f => `
      <div class="selected-item">
        <div class="swatch" style="background:${f.color}"></div>
        <div class="info">
          <div class="name">${f.name}</div>
          <div class="detail">${f.tags.join(' · ')}</div>
        </div>
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

$('#btn-clear') && document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-clear') {
    selectedIds.clear();
    renderFabricList(); renderSelectedView(); updateFloatingBar();
  }
});


// ============================================================
//  ③ 호환성 분석 실행 + 렌더
// ============================================================
$btnTest.addEventListener('click', async () => {
  switchStep('compat');

  // 로딩
  $compatContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>호환성 분석 중...</p>
    </div>`;

  // API 호출 (→ 추후 fetch로 교체)
  compatResult = await API.analyzeCompatibility([...selectedIds]);

  // 필요 테스트 가이드도 함께 조회
  testGuides = await API.getTestGuides(compatResult.pairs);
  testInputs = {};

  renderCompatResult();
});

function renderCompatResult() {
  const { fabrics, pairs, avgScore } = compatResult;

  let grade, gradeLabel;
  if (avgScore >= 80)      { grade = '🟢'; gradeLabel = '우수'; }
  else if (avgScore >= 60) { grade = '🟡'; gradeLabel = '보통'; }
  else                     { grade = '🔴'; gradeLabel = '주의'; }

  let h = '';

  // 조합 칩
  h += `<div class="combo-chips">`;
  fabrics.forEach((f, i) => {
    if (i > 0) h += `<span class="combo-plus">+</span>`;
    h += `<span class="combo-chip"><span class="chip-dot" style="background:${f.color}"></span>${f.name}</span>`;
  });
  h += `</div>`;

  // 헤더
  h += `
    <div class="result-header">
      <div class="result-grade">${grade}</div>
      <div class="result-title">조합 적합도: ${gradeLabel} (${avgScore}점)</div>
      <div class="result-subtitle">${fabrics.length}종 원단 · ${pairs.length}개 조합 분석 완료</div>
    </div>`;

  // 점수 바
  const cats = [
    { label: '종합 점수', value: avgScore },
    { label: '세탁 호환', value: clamp(avgScore + rand(-7,8)) },
    { label: '내구성',    value: clamp(avgScore + rand(-5,10)) },
    { label: '봉제 적합', value: clamp(avgScore + rand(-8,6)) },
  ];
  h += `<div class="score-bar-container">`;
  cats.forEach(c => {
    const cls = c.value >= 70 ? 'high' : c.value >= 50 ? 'mid' : 'low';
    h += `
      <div class="score-row">
        <span class="score-label">${c.label}</span>
        <div class="score-track"><div class="score-fill ${cls}" style="width:${c.value}%"></div></div>
        <span class="score-value">${c.value}</span>
      </div>`;
  });
  h += `</div>`;

  // 쌍별 상세
  h += `<div class="pair-section"><div class="section-title">📊 원단 쌍별 호환성</div>`;
  pairs.forEach(p => {
    const badgeCls = p.level === 'good' ? 'good' : p.level === 'bad' ? 'bad' : 'caution';
    const badgeTxt = p.level === 'good' ? '양호' : p.level === 'bad' ? '비추천' : '주의';
    h += `
      <div class="pair-card">
        <div class="pair-names">
          ${p.nameA} ↔ ${p.nameB}
          <span class="compat-badge ${badgeCls}">${badgeTxt} ${p.score}점</span>
        </div>
        <div class="pair-detail">${p.detail}</div>
      </div>`;
  });
  h += `</div>`;

  // 다음 스텝 버튼
  h += `
    <div class="action-bar">
      <button class="btn btn-ghost" onclick="switchStep('review')">← 선택 조회</button>
      <button class="btn btn-primary" onclick="switchStep('guide')">테스트 가이드 →</button>
    </div>`;

  $compatContent.innerHTML = h;
}


// ============================================================
//  ④ 테스트 가이드 + 결과 입력 렌더
// ============================================================
function renderGuide() {
  let h = '';

  h += `
    <div class="guide-intro">
      <h2>🧪 테스트 진행 가이드</h2>
      <p>호환성 분석 결과에 따라 아래 ${testGuides.length}개 테스트를 진행하세요.<br>결과를 입력하면 맞춤 조치를 추천해드립니다.</p>
    </div>`;

  testGuides.forEach((g, idx) => {
    const curVal = testInputs[g.id] ?? '';
    const hasVal = curVal !== '';

    h += `<div class="guide-card" data-test-id="${g.id}">`;

    // 헤더
    h += `
      <div class="guide-header">
        <span class="guide-icon">${g.icon}</span>
        <span class="guide-title">${idx + 1}. ${g.name}</span>
      </div>
      <div class="guide-desc">${g.desc}</div>`;

    // 방법
    h += `
      <div class="guide-method">
        <div class="guide-method-label">시험 방법</div>
        ${g.method}
      </div>`;

    // 입력
    h += `<div class="guide-input-group">`;
    h += `<label>${g.inputLabel || g.name + ' 결과'}:</label>`;

    if (g.inputType === 'number') {
      h += `<input type="number" step="any" class="test-input" data-test-id="${g.id}" value="${curVal}" placeholder="측정값 입력" />`;
      if (g.unit) h += `<span class="input-unit">${g.unit}</span>`;
    } else if (g.inputType === 'select') {
      h += `<select class="test-input" data-test-id="${g.id}">`;
      h += `<option value="">선택하세요</option>`;
      g.inputOptions.forEach(o => {
        h += `<option value="${o.value}" ${curVal == o.value ? 'selected' : ''}>${o.label}</option>`;
      });
      h += `</select>`;
    }
    h += `</div>`;

    // 입력 상태
    h += `<div class="guide-input-status ${hasVal ? 'valid' : 'empty'}">
            ${hasVal ? '✓ 입력 완료' : '결과를 입력해주세요'}
          </div>`;

    h += `</div>`;
  });

  // 입력 카운트 + 제출 버튼
  const filledCount = testGuides.filter(g => testInputs[g.id] !== undefined && testInputs[g.id] !== '').length;
  const allFilled = filledCount === testGuides.length;

  h += `
    <div style="text-align:center; margin: 16px 0 8px; font-size:13px; color:#6e6e73;">
      ${filledCount} / ${testGuides.length}개 테스트 결과 입력됨
    </div>
    <div class="action-bar">
      <button class="btn btn-ghost" onclick="switchStep('compat')">← 호환성 결과</button>
      <button class="btn btn-primary" id="btn-submit-tests" ${allFilled ? '' : 'disabled'}>
        📋 조치 추천 받기
      </button>
    </div>`;

  $guideContent.innerHTML = h;

  // 이벤트 바인딩: 입력 변경
  $$('.test-input').forEach(el => {
    el.addEventListener('input', onTestInput);
    el.addEventListener('change', onTestInput);
  });

  // 이벤트 바인딩: 제출
  const btnSubmit = $('#btn-submit-tests');
  if (btnSubmit) btnSubmit.addEventListener('click', submitTests);
}

function onTestInput(e) {
  const testId = e.target.dataset.testId;
  testInputs[testId] = e.target.value;
  renderGuide(); // 상태 갱신 (입력값 유지됨)
}

// 가이드 탭이 활성화될 때 렌더
const origSwitch = switchStep;
// switchStep을 확장
const _switchStep = switchStep;


// ============================================================
//  ⑤ 테스트 결과 제출 → 조치 추천
// ============================================================
async function submitTests() {
  switchStep('action');

  $actionContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>테스트 결과를 분석하고 조치를 생성 중...</p>
    </div>`;

  // 입력값 정리
  const results = testGuides
    .filter(g => testInputs[g.id] !== undefined && testInputs[g.id] !== '')
    .map(g => ({ testId: g.id, value: testInputs[g.id] }));

  // API: 결과 저장
  const sessionId = `session_${Date.now()}`;
  await API.saveTestResults(sessionId, results);

  // API: 조치 추천 조회
  const actions = await API.getActionRecommendations(results);

  renderActions(actions);
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

  $actionContent.innerHTML = h;
}


// ============================================================
//  유틸
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
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }


// ============================================================
//  switchStep 오버라이드 — guide 탭 진입 시 렌더
// ============================================================
const _origSwitchStep = switchStep;
// 이미 정의된 switchStep을 래핑 — guide 진입 시 renderGuide 호출
const __origSS = window.switchStep || switchStep;

// switchStep을 재정의하지 않고 MutationObserver로 대응
// 대신, 탭 전환 시 guide를 렌더하는 로직을 switchStep에 직접 포함
// → switchStep은 이미 전역이므로 아래처럼 재할당

(function patchSwitchStep() {
  const original = switchStep;
  window.switchStep = function(stepName) {
    original(stepName);
    if (stepName === 'guide') renderGuide();
  };
})();


// ============================================================
//  초기화
// ============================================================
(async function init() {
  fabricsCache = await API.getFabrics();
  renderFabricList();
  renderSelectedView();
})();
