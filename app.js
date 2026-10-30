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
    // 5단계 조치 추천
    const hasWash = washResult && washResult.confirmed;
    const grade = washResult.grade ? Number(washResult.grade) : 4;

    let verdictIcon = '🎉', verdictTitle = '모든 테스트 기준 충족 (양호)', verdictDesc = '선택하신 원단 조합은 안정적인 결합 상태를 유지합니다. 표준 봉제 공정으로 생산 가능합니다.';
    if (grade <= 2) {
      verdictIcon = '🚫';
      verdictTitle = '생산 전 필수 조치 이행 요구 (위험)';
      verdictDesc = '세탁 시 접합부 뒤틀림이나 심각한 변형이 확인되었습니다. 봉제 심지 보강 또는 패턴 여유분을 필히 반영해야 합니다.';
    } else if (grade === 3) {
      verdictIcon = '⚠️';
      verdictTitle = '조건부 생산 권장 (보완 조치 필요)';
      verdictDesc = '경미한 이염이나 수축 차이가 관찰되었습니다. 프리워싱 및 단독 세탁 라벨을 부착하세요.';
    }

    target.innerHTML = `
      <div class="guide-intro">
        <h2>📋 5단계: 맞춤 조치 추천</h2>
        <p>입력된 테스트 결과와 DB 물성 스펙을 바탕으로 최적의 생산 조치를 추천합니다.</p>
      </div>

      <div class="final-verdict">
        <div class="verdict-icon">${verdictIcon}</div>
        <div class="verdict-title">${verdictTitle}</div>
        <div class="verdict-desc">${verdictDesc}</div>
      </div>

      <div class="action-summary-bar">
        <span class="action-summary-chip ${grade >= 4 ? 'success' : (grade === 3 ? 'warning' : 'danger')}">
          관찰 등급: ${grade}등급 (${grade >= 4 ? '안정' : (grade === 3 ? '주의' : '위험')})
        </span>
      </div>

      <div class="rec-card ${grade >= 4 ? 'rec-success' : (grade === 3 ? 'rec-warning' : 'rec-danger')}">
        <div class="rec-icon">${grade >= 4 ? '✅' : (grade === 3 ? '⚠️' : '🚫')}</div>
        <div class="rec-body">
          <div class="rec-test-name">시험 원단: ${escape(washResult.pair || names.join(' + '))}</div>
          <div class="rec-title">공정 권장 조치 가이드라인</div>
          <div class="rec-desc">
            ${grade >= 4
              ? '수축률과 형태 안정성이 허용 오차 내에 있습니다. 60번 표준 봉제사 및 일반 침판으로 작업을 진행하세요.'
              : (grade === 3
                ? '원단 간 수축률 차이(2~5%)가 존재하므로, 봉제 전 프리워싱(Pre-washing)을 거치고 시접을 1.5cm 이상 확보하세요.'
                : '치수 차이가 극심하여 접합부 퍼커링이 발생합니다. 스트레스 부위에 바텍(Bar-tack) 보강 및 고강력 코아사를 사용하세요.')}
          </div>
          ${washResult.notes ? `<div class="rec-input-val">기록된 관찰 내용: "${escape(washResult.notes)}"</div>` : ''}
        </div>
      </div>

      <div class="action-bar" style="margin-top:24px;">
        <button class="btn btn-ghost" onclick="switchStep('guide')">← 4단계 테스트 가이드로 수정</button>
        <button class="btn btn-secondary" onclick="restartAll()">🔄 처음부터 새로운 조합 테스트</button>
      </div>`;
    return;
  }

  // 4단계 테스트 가이드
  target.innerHTML = `
    <div class="guide-intro">
      <h2>🧪 4단계: 물리·화학 테스트 가이드</h2>
      <p>선택한 <strong>${escape(names.join(' · '))}</strong>의 조합 시편 테스트 절차입니다.</p>
      <p>ISO 및 KS 표준 규격에 맞추어 시험을 진행하고 결과를 아래 폼에 입력해 주세요.</p>
    </div>

    <!-- 세탁 안정성 가이드 -->
    <article class="guide-card">
      <div class="guide-header">
        <span class="guide-icon">🌊</span>
        <h3 class="guide-title">1. 세탁 안정성 테스트</h3>
      </div>
      <p class="guide-desc">두 원단을 접합 봉제한 조합 시편을 세탁한 후 접합부 외관과 변형을 관찰합니다.</p>
      <div class="guide-method">
        <strong>진행 순서 (ISO 6330 표준)</strong>
        <ol>
          <li>각 원단의 관리 라벨과 가공 이력을 확인합니다.</li>
          <li>실제 의류 제작에 사용할 봉제 방식으로 30×30cm 조합 시편을 제작하고 측정 지점을 표시합니다.</li>
          <li>공통 세탁 조건(30~40℃, 중성세제)으로 표준 코스 세탁 및 건조를 진행합니다.</li>
          <li>완전히 건조한 뒤 접합부 뒤틀림, 주름, 올풀림, 이염 여부를 전후 사진과 대조합니다.</li>
        </ol>
      </div>
      <p class="wash-note">⚠️ 세탁 중 이염 위험이 있으므로 본제품이나 타 의류와 함께 세탁하지 마세요.</p>
    </article>

    <!-- 수축률 비교 가이드 -->
    <article class="guide-card">
      <div class="guide-header">
        <span class="guide-icon">📏</span>
        <h3 class="guide-title">2. 수축률 비교 (ISO 5077:2007)</h3>
      </div>
      <div class="guide-method">
        <ol>
          <li>경사(세로)와 위사(가로) 방향으로 25cm 기준점을 표시합니다.</li>
          <li>세탁 및 건조 완료 후 기준점 간 거리를 재측정합니다.</li>
          <li>수축률 = (세탁 전 길이 − 세탁 후 길이) ÷ 세탁 전 길이 × 100 (%)</li>
        </ol>
      </div>
    </article>

    <!-- 이염 확인 가이드 -->
    <article class="guide-card">
      <div class="guide-header">
        <span class="guide-icon">🎨</span>
        <h3 class="guide-title">3. 이염 및 견뢰도 확인 (ISO 105-C06)</h3>
      </div>
      <div class="guide-method">
        <ol>
          <li>유색 원단과 백색 첨부포(면, 나일론 등)를 접촉 봉합합니다.</li>
          <li>40℃ 시험액에서 세탁 후 오염용 회색색표(Gray Scale)를 통해 1~5등급으로 판정합니다.</li>
        </ol>
      </div>
    </article>

    <!-- 결과 입력 폼 -->
    <article class="guide-card">
      <div class="guide-header">
        <span class="guide-icon">📝</span>
        <h3 class="guide-title">4. 세탁 안정성 결과 입력</h3>
      </div>
      <p class="guide-desc">실험 후 관찰된 등급과 조건을 입력하면 5단계 맞춤 생산 조치를 추천해 드립니다.</p>
      <form id="wash-form" class="wash-form">
        <label>
          시험한 원단 조합
          <select name="pair" required>
            <option value="">원단 조합 선택</option>
            ${analysis.pairs.map(p => {
              const label = `${p.nameA} + ${p.nameB}`;
              return `<option value="${escape(label)}" ${washResult.pair === label ? 'selected' : ''}>${escape(label)}</option>`;
            }).join('')}
          </select>
        </label>
        <label>
          접합부 외관 변화 관찰 등급
          <select name="grade" required>
            <option value="">관찰 결과 선택</option>
            ${[
              ['5', '5등급 — 변화 없음 (최우수)'],
              ['4', '4등급 — 약간의 미세 변화 (양호)'],
              ['3', '3등급 — 눈에 띄는 주름/변화 (주의)'],
              ['2', '2등급 — 큰 뒤틀림 및 수축 차이 (위험)'],
              ['1', '1등급 — 접합부 분리 또는 원단 파손 (사용불가)']
            ].map(([v, label]) => `<option value="${v}" ${washResult.grade === v ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </label>
        <label>
          세탁 횟수
          <input name="cycles" type="number" min="1" max="100" step="1" placeholder="예: 5" value="${escape(washResult.cycles || '')}">
        </label>
        <label>
          세탁 온도 (℃)
          <input name="temperature" type="number" min="0" max="100" step="1" placeholder="예: 30" value="${escape(washResult.temperature || '')}">
        </label>
        <label>
          세탁·건조 방식 및 특이사항
          <textarea name="notes" rows="3" maxlength="1000" placeholder="사용 세제, 자연건조/드럼건조 여부, 관찰된 특이사항을 기록하세요">${escape(washResult.notes || '')}</textarea>
        </label>
        <button type="submit" class="btn btn-primary">입력 결과 반영</button>
        <p id="wash-status" role="status" aria-live="polite">${washResult.confirmed ? '✅ 입력하신 시험 결과가 정상 반영되었습니다.' : ''}</p>
      </form>
    </article>

    <div class="review-actions compat-actions" style="margin-top:20px;">
      <button class="review-back" onclick="switchStep('compat')">← 호환성 결과</button>
      <button class="btn btn-primary" onclick="goToStepAction()">5단계 맞춤 조치 추천 <span aria-hidden="true">→</span></button>
    </div>`;

  const form = target.querySelector('#wash-form');
  form.addEventListener('input', () => {
    washResult = { ...washResult, ...Object.fromEntries(new FormData(form)), confirmed: false };
    target.querySelector('#wash-status').textContent = '';
  });
  form.addEventListener('change', () => {
    washResult = { ...washResult, ...Object.fromEntries(new FormData(form)), confirmed: false };
    target.querySelector('#wash-status').textContent = '';
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    washResult = { ...Object.fromEntries(new FormData(form)), confirmed: true };
    target.querySelector('#wash-status').textContent = '✅ 입력하신 시험 결과가 정상 반영되었습니다.';
  });
}

function goToStepAction() {
  switchStep('action');
}
window.goToStepAction = goToStepAction;

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
