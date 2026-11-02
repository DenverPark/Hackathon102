// main branch action rules and mock result interface.
const MainActions = (() => {
  const _testGuides = [
    {
      id: 'shrinkage',
      name: '수축률 테스트',
      icon: '📏',
      desc: '각 원단을 동일 조건(40°C, 30분)으로 세탁 후 치수 변화를 측정합니다.',
      method: '① 10×10cm 시편 재단 → ② 40°C 물 30분 침지 → ③ 자연건조 → ④ 치수 재측정',
      unit: '%',
      inputType: 'number',
      inputLabel: '수축률 (%)',
      threshold: { good: 2, caution: 5 },
      // 어떤 조건에서 이 테스트가 필요한지 (DB 쿼리 조건 매핑)
      condition: (pairs) => pairs.some(p => p.detail.includes('수축') || p.level !== 'good'),
    },
    {
      id: 'pilling',
      name: '필링(보풀) 테스트',
      icon: '🔍',
      desc: '마틴데일법으로 원단 표면의 보풀 발생 정도를 평가합니다.',
      method: '① 시편을 마틴데일 장비에 장착 → ② 2,000회 마찰 → ③ 1~5등급 육안 평가',
      unit: '등급',
      inputType: 'select',
      inputOptions: [
        { value: '5', label: '5등급 (보풀 없음)' },
        { value: '4', label: '4등급 (경미)' },
        { value: '3', label: '3등급 (보통)' },
        { value: '2', label: '2등급 (심함)' },
        { value: '1', label: '1등급 (매우 심함)' },
      ],
      threshold: { good: 4, caution: 3 },
      condition: (pairs) => pairs.some(p => p.detail.includes('필링') || p.detail.includes('마찰')),
    },
    {
      id: 'colorfastness',
      name: '염색 견뢰도 테스트',
      icon: '🎨',
      desc: '세탁 및 마찰 시 염료 이염·탈색 정도를 평가합니다.',
      method: '① 시편 + 백포 부착 → ② 40°C 비눗물 30분 세탁 → ③ 그레이스케일 비교 평가',
      unit: '등급',
      inputType: 'select',
      inputOptions: [
        { value: '5', label: '5등급 (변색 없음)' },
        { value: '4', label: '4등급 (경미한 변색)' },
        { value: '3', label: '3등급 (눈에 띄는 변색)' },
        { value: '2', label: '2등급 (상당한 변색)' },
        { value: '1', label: '1등급 (심한 변색)' },
      ],
      threshold: { good: 4, caution: 3 },
      condition: (pairs) => pairs.some(p => p.detail.includes('염색') || p.detail.includes('이염') || p.detail.includes('견뢰')),
    },
    {
      id: 'tensile',
      name: '인장강도 테스트',
      icon: '💪',
      desc: '원단의 인장 파단 강도를 측정하여 봉제 내구성을 평가합니다.',
      method: '① 5×20cm 시편 재단 → ② 인장시험기 장착 → ③ 100mm/min 속도로 인장 → ④ 파단 강도 기록',
      unit: 'N',
      inputType: 'number',
      inputLabel: '파단 강도 (N)',
      threshold: { good: 300, caution: 150 },
      condition: (pairs) => pairs.some(p => p.detail.includes('강도') || p.detail.includes('인장') || p.detail.includes('내구')),
    },
    {
      id: 'seam_slip',
      name: '솔기 미끄러짐 테스트',
      icon: '🧷',
      desc: '봉제 솔기에서 원단이 미끄러지는 정도를 측정합니다.',
      method: '① 봉제된 시편 준비 → ② 솔기 수직 방향 인장 → ③ 6mm 미끄러짐 시 하중 기록',
      unit: 'N',
      inputType: 'number',
      inputLabel: '미끄러짐 하중 (N)',
      threshold: { good: 100, caution: 60 },
      condition: (pairs) => pairs.some(p => p.detail.includes('봉제') || p.detail.includes('솔기') || p.level === 'caution'),
    },
    {
      id: 'wash_stability',
      name: '세탁 안정성 테스트',
      icon: '🌊',
      desc: '반복 세탁 후 조합부의 변형, 분리, 외관 변화를 평가합니다.',
      method: '① 조합 시편 제작 → ② 5회 반복 세탁 (40°C) → ③ 접합부 상태 육안 평가',
      unit: '등급',
      inputType: 'select',
      inputOptions: [
        { value: '5', label: '5등급 (변화 없음)' },
        { value: '4', label: '4등급 (경미한 변화)' },
        { value: '3', label: '3등급 (눈에 띄는 변화)' },
        { value: '2', label: '2등급 (상당한 변형)' },
        { value: '1', label: '1등급 (분리/파손)' },
      ],
      threshold: { good: 4, caution: 3 },
      condition: () => true, // 항상 수행
    },
  ];

  const _actionRules = {
    shrinkage: [
      { check: (v) => v <= 2,            level: 'success', icon: '✅', title: '수축률 양호',                       desc: '수축률이 허용 범위 내입니다. 추가 처리 없이 생산 진행 가능합니다.' },
      { check: (v) => v > 2 && v <= 5,   level: 'warning', icon: '⚠️', title: '사전 수축 가공 권장',               desc: '수축률 차이가 있으므로 산포라이징(Sanforizing) 등 사전 수축 가공을 적용하세요. 패턴 설계 시 수축 여유분을 반영하세요.' },
      { check: (v) => v > 5,             level: 'danger',  icon: '🚫', title: '조합 재검토 필요',                  desc: '수축률 차이가 과도합니다. 해당 원단 조합을 변경하거나, 별도 패널로 분리 재단 후 탈착식 결합을 고려하세요.' },
    ],
    pilling: [
      { check: (v) => v >= 4,            level: 'success', icon: '✅', title: '필링 저항성 양호',                  desc: '보풀 발생이 미미합니다. 일반 봉제 공정으로 진행 가능합니다.' },
      { check: (v) => v === 3,           level: 'warning', icon: '⚠️', title: '안티필링 후처리 권장',              desc: '경미한 보풀이 예상됩니다. 안티필링 가공 또는 원단 표면 소모(singeing) 처리를 적용하세요.' },
      { check: (v) => v < 3,             level: 'danger',  icon: '🚫', title: '접합면 보강 필수',                  desc: '심한 보풀이 예상됩니다. 원단 간 접합면에 안감 또는 테이프 보강재를 사용하고, 마찰 방지 라이닝을 추가하세요.' },
    ],
    colorfastness: [
      { check: (v) => v >= 4,            level: 'success', icon: '✅', title: '염색 견뢰도 양호',                  desc: '이염 위험이 낮습니다. 일반 세탁 가이드 적용 가능합니다.' },
      { check: (v) => v === 3,           level: 'warning', icon: '⚠️', title: '색 분리 세탁 권장',                desc: '이염 가능성이 있습니다. 제품에 "첫 세탁 단독 세탁" 안내를 추가하고, 밝은 원단에 방오 코팅을 고려하세요.' },
      { check: (v) => v < 3,             level: 'danger',  icon: '🚫', title: '염색 공정 변경 필요',              desc: '심한 이염이 예상됩니다. 해당 원단의 염색 방법을 반응성 염료로 변경하거나, 색상 조합을 동계열로 변경하세요.' },
    ],
    tensile: [
      { check: (v) => v >= 300,          level: 'success', icon: '✅', title: '인장강도 충분',                     desc: '봉제 내구성이 양호합니다. 일반 봉제사(60번)로 진행 가능합니다.' },
      { check: (v) => v >= 150 && v<300, level: 'warning', icon: '⚠️', title: '봉제 보강 권장',                   desc: '강도가 중간 수준입니다. 이중 봉제 또는 보강 테이프를 적용하고, 봉제사를 굵은 것(40번)으로 교체하세요.' },
      { check: (v) => v < 150,           level: 'danger',  icon: '🚫', title: '구조 설계 변경 필요',              desc: '인장강도가 부족합니다. 해당 부위에 보강 심지를 삽입하거나, 스트레스 집중 부위의 패턴 설계를 변경하세요.' },
    ],
    seam_slip: [
      { check: (v) => v >= 100,          level: 'success', icon: '✅', title: '솔기 안정성 양호',                  desc: '솔기 미끄러짐 없이 안정적입니다. 일반 봉제 공정으로 진행하세요.' },
      { check: (v) => v >= 60 && v<100,  level: 'warning', icon: '⚠️', title: '봉제 밀도 증가 권장',              desc: '경미한 솔기 미끄러짐이 있습니다. 땀수(stitch density)를 늘리고, 시접을 1.5cm 이상 확보하세요.' },
      { check: (v) => v < 60,            level: 'danger',  icon: '🚫', title: '원단 조합 또는 봉제법 변경',        desc: '심한 솔기 미끄러짐입니다. 접착 봉제(bonding) 병행, 또는 마찰력 높은 안감 추가를 검토하세요.' },
    ],
    wash_stability: [
      { check: (v) => v >= 4,            level: 'success', icon: '✅', title: '세탁 안정성 양호',                  desc: '반복 세탁 후에도 접합부가 안정적입니다. 일반 세탁 가이드를 적용하세요.' },
      { check: (v) => v === 3,           level: 'warning', icon: '⚠️', title: '세탁 조건 제한 권장',              desc: '반복 세탁 시 변형이 예상됩니다. 세탁 온도를 30°C 이하로 제한하고, 망 세탁을 안내하세요.' },
      { check: (v) => v < 3,             level: 'danger',  icon: '🚫', title: '드라이클리닝 전용 권장',            desc: '물세탁 시 접합부 손상이 예상됩니다. 제품을 드라이클리닝 전용으로 지정하거나, 접합 방식을 탈착식으로 변경하세요.' },
    ],
  };


  function getActionRecommendations(testResults) {
    // → fetch('/api/actions/recommend', { method:'POST', body: JSON.stringify({testResults}) })
    //   testResults: [{ testId: 'shrinkage', value: 3.5 }, ...]
    const actions = [];

    testResults.forEach(({ testId, value }) => {
      const rules = _actionRules[testId];
      if (!rules) return;

      const numVal = Number(value);
      const matched = rules.find(r => r.check(numVal));
      if (matched) {
        const guide = _testGuides.find(g => g.id === testId);
        actions.push({
          testId,
          testName: guide ? guide.name : testId,
          inputValue: numVal,
          inputUnit: guide ? guide.unit : '',
          level: matched.level,
          icon: matched.icon,
          title: matched.title,
          desc: matched.desc,
        });
      }
    });

    return Promise.resolve(actions);
  }

  /** 테스트 결과 저장 (DB 저장 대비) */
  function saveTestResults(sessionId, testResults) {
    // → fetch('/api/test-results', { method:'POST', body: JSON.stringify({sessionId, testResults}) })
    console.log('[API] saveTestResults:', sessionId, testResults);
    return Promise.resolve({ success: true, sessionId });
  }

  return {getActionRecommendations, saveTestResults};
})();
