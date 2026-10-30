// ============================================================
//  api.js — 데이터 액세스 레이어 (Supabase PostgreSQL 연동 및 캐시)
// ============================================================

const API = (() => {

  // --- Supabase 설정 (필요 시 실제 URL/Key 교체 가능) ---
  const SUPABASE_CONFIG = {
    url: window.__SUPABASE_URL__ || 'https://mock-supabase-url.supabase.co',
    anonKey: window.__SUPABASE_ANON_KEY__ || 'mock-anon-key',
  };

  let supabase = null;
  if (window.supabase && SUPABASE_CONFIG.url !== 'https://mock-supabase-url.supabase.co') {
    try {
      supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log('✅ Supabase Client Initialized');
    } catch (e) {
      console.warn('Supabase 초기화 실패, 로컬 DB 캐시를 사용합니다:', e);
    }
  }

  // ----------------------------------------------------------
  //  [Local DB Cache] PDF 원본 및 Supabase Seed 기반 6종 원단 데이터
  // ----------------------------------------------------------
  const _fabrics = [
    {
      id: 1,
      name: '나일론',
      aliases: 'Nylon',
      category: '합성',
      color: '#2C2C2E',
      desc: '가볍고 내구성과 인장강도가 뛰어난 대표적 합성 섬유',
      tags: ['합성', '경량', '고강도'],
      investigator: '박병찬',
      investigation_date: '2026.10.21',
      properties: {
        fiber_composition: '나일론 6,6 (Nylon 6,6) 100% 또는 나일론 6 (Nylon 6) 100% (폴리우레탄 미포함)',
        weave_type: '고밀도 나일론 직물',
        structure_detail: '고밀도 평직/립스탑 직조 방식',
        thickness_mm: null,
        gsm: null,
        gsm_range_text: '미기재 (NULL)',
        elasticity: '비신축',
        elasticity_detail: '기본적인 비신축 직물 구조',
        shrinkage_warp_pct: 1.20,
        shrinkage_weft_pct: 0.80,
        shrinkage_avg_pct: 1.00,
        shrinkage_detail: '세탁 시 경사(세로) 1.2%, 위사(가로) 0.8% 이하. 열고정(Heat-setting) 완료로 일반 수축률은 낮으나 150℃ 이상 고온 노출 시 열수축 발생 가능.',
        color_fastness_detail: '기본 프로필 미기재 (NULL)',
        dye_transfer_detail: '산성 염료로 주로 염색되며, 세탁 및 마찰 시 다른 합성/천연 직물로 염료가 이염될 가능성 존재.',
        care_guide: '30℃ 이하 미온수/찬물, 중성세제 사용, 표준코스 또는 손세탁 권장. 고온 건조기 사용 금지(자연 건조 권장). 드라이클리닝 가능.',
        other_characteristics: '건조가 매우 빠름(속건성). PU/아크릴 방수 코팅 원단은 고온 다림질 시 손상 주의.'
      },
      tests: [
        {
          name: '치수 수축률 측정 (ISO 5077:2007)',
          condition: '32℃ 세탁 45분, 중성액체세제, 상온 자연건조 및 50℃ 저온 드럼건조',
          result: '5회 세탁 후 경사 1.2%, 위사 0.8% 수축'
        },
        {
          name: '두께 변화 측정 (ISO 5084:1996)',
          condition: '5회 반복 세탁 및 건조, 5개 지점 평균',
          result: '세탁 전 0.18mm → 5회 세탁 후 0.183mm (+1.67% 미세 증가)'
        },
        {
          name: '이염 측정 시험 (ISO 105-C06:2010)',
          condition: '40℃ 45분 세탁, 다섬유 첨부포 봉합',
          result: '나일론/아세테이트 첨부포 3~4급, 면 첨부포 4급'
        }
      ],
      sources: [
        { title: 'KCI 섬유공학 학술 논문 및 세탁 물성 연구', url: 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001270755' },
        { title: '섬유 수축률 및 치수 안정성 시험 표준 (HN Leading)', url: 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/' }
      ]
    },
    {
      id: 2,
      name: '울',
      aliases: '양모 (Wool)',
      category: '천연',
      color: '#8E7C6A',
      desc: '보온성과 탄력성이 우수한 단백질계 천연 동물성 섬유',
      tags: ['천연', '보온', '중량'],
      investigator: '박병찬',
      investigation_date: '2026.10.21',
      properties: {
        fiber_composition: '양모 100% (단백질 섬유, 케라틴 성분)',
        weave_type: '방모/수모 직물 또는 편물',
        structure_detail: '방모 및 수모 직물 또는 편물 구조',
        thickness_mm: 1.250,
        gsm: null,
        gsm_range_text: '방모 직물 기준 두께 1.25mm',
        elasticity: '편물: 고신축성 / 직물: 미세 신축성',
        elasticity_detail: '천연 크림프(Crimp) 구조로 인해 뛰어난 탄력성과 신축성 보유.',
        shrinkage_warp_pct: 11.40,
        shrinkage_weft_pct: 7.20,
        shrinkage_avg_pct: 9.30,
        shrinkage_detail: '수온 및 기계적 마찰 시 스케일 마찰로 인한 펠팅 현상 발생. 일반 물세탁 시 세로 8.0~15.0%, 가로 5.0~10.0%의 심각한 펠팅 수축 및 면적 감소 유발.',
        color_fastness_detail: '기본 프로필 미기재 (NULL)',
        dye_transfer_detail: '산성 염료 및 반응성 염료 염색. 습윤 조건이나 알칼리 세제 노출 시 염료 용출 및 타 직물로 이염 위험 존재 (오염 3급).',
        care_guide: '물세탁 및 일반 세탁기 세탁 금지(드라이클리닝 권장). 필요 시 울샴푸로 30℃ 이하 찬물에서 가볍게 손세탁 후 자연 건조.',
        other_characteristics: '보온성, 흡습성, 탄력성 우수. 열과 알칼리에 취약하며 스케일 엉킴 시 비가역적 수축 발생.'
      },
      tests: [
        {
          name: '펠팅 수축률 시험 (IWS TM 31 / ISO 5077)',
          condition: '42℃ 수온, 알칼리성 표준 세제, 40분 세탁',
          result: '1회 물세탁만으로 경사 수축률 11.4%, 위사 수축률 7.2% 발생'
        },
        {
          name: '두께 변화 측정 (ISO 5084:1996)',
          condition: '세탁 후 5개 지점 평균 산출',
          result: '세탁 전 1.25mm → 펠팅 후 1.62mm (+29.6% 두께 급증, 펠트화)'
        },
        {
          name: '세탁 시 타 섬유 오염도 측정 (ISO 105-C06)',
          condition: '40℃ 수온 세탁, 백색 면 및 울 첨부포 접촉',
          result: '첨부포 오염 등급 3급 (이염 위험 존재)'
        }
      ],
      sources: [
        { title: 'DCCA 및 플라즈마 처리가 양모직물의 형태안정성과 펠팅수축에 미치는 영향 (KCI)', url: 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755' }
      ]
    },
    {
      id: 3,
      name: '데님',
      aliases: 'DENIM (진 원단)',
      category: '천연',
      color: '#2D4A7A',
      desc: '3/1 능직으로 짜여 내구성이 매우 높고 인디고 염색 특성을 지닌 면직물',
      tags: ['천연', '능직', '중량'],
      investigator: '2026002925 자동차공학과 박서준',
      investigation_date: '2026.10.23',
      properties: {
        fiber_composition: '면 100% (경사/위사 모두 면섬유, 탄성섬유 미포함)',
        weave_type: '3/1, 2/1, 2/2 능직 (주로 3/1 능직)',
        structure_detail: '3/1 능직: 경사 3올 위, 위사 1올 아래 통과 교차. 한 올씩 사선 이동하며 특유의 대각선 능선 형성.',
        thickness_mm: 1.040,
        gsm: 389.20,
        gsm_range_text: '389.2 GSM (두께 1.04 mm)',
        elasticity: '비신축 데님',
        elasticity_detail: '스판덱스가 섞이지 않은 순수 100% 면 능직으로 비신축.',
        shrinkage_warp_pct: 5.50,
        shrinkage_weft_pct: 1.90,
        shrinkage_avg_pct: 3.70,
        shrinkage_detail: '경사(세로) 5.5%, 위사(가로) 1.9%. 첫 물세탁에서 경사 방향 4.6% 수축, 10회 세탁 후 경사 7.9%, 위사 2.6% 수축.',
        color_fastness_detail: '원포 L* 26.06 → 첫 세탁 후 22.41, 10회 후 b* -12.55 (직물 밀도 증가 및 경사 팽윤으로 색상이 더 어둡고 푸르게 변화).',
        dye_transfer_detail: '인디고 염색 견고도가 낮아 세탁 시 물빠짐 및 타 의류 이염 발생. 첫 세탁 시 백색포 L* 5.6% 감소로 이염 최대.',
        care_guide: '형태 변화 방지에는 드라이클리닝 권장. 30℃ 드럼세탁기 물세탁 가능하나 첫 물세탁 시 단독 세탁 필수.',
        other_characteristics: '원사 꼬임과 굵기가 강도·촉감에 영향. 워싱 등 화학적/기계적 후가공 용이.'
      },
      tests: [
        {
          name: '데님 세탁 수축률 측정 (ISO 5077:2007 참고)',
          condition: '30℃ 드럼세탁기 60분, 저온건조(60℃), 10회 세탁',
          result: '첫 세탁 시 경사 4.6% 수축, 10회 후 경사 7.9%, 위사 2.6% 수축'
        },
        {
          name: '데님 두께 변화 측정 (ISO 5084:1996 참고)',
          condition: '원포 0.54mm 시료, 10회 세탁 및 저온건조',
          result: '1회 물세탁 후 +10.5%, 10회 후 +20.3% 두께 증가 (팽윤 현상)'
        },
        {
          name: '색상 변화 및 이염 측정 (ISO 105-C06 / J03)',
          condition: 'Color-eye 2180 색채계 측정, 백색 면포 접촉',
          result: '첫 세탁 시 백색포 L* 5.6% 감소(이염 집중), 10회 후 색상 안정화'
        }
      ],
      sources: [
        { title: '세탁방법에 따른 데님직물의 변색과 변형 (한국의류학회지 P.115-120)', url: 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538' },
        { title: 'CottonWorks Denim Fiber & Fabrics', url: 'https://cottonworks.com/' }
      ]
    },
    {
      id: 4,
      name: '코튼 폴리에스터 블렌드',
      aliases: '면-폴리에스터 혼방',
      category: '혼방',
      color: '#B0C4B1',
      desc: '면의 흡습성과 폴리에스터의 형태안정성을 결합한 실용적 혼방 원단',
      tags: ['혼방', '실용', '중량'],
      investigator: '2026002925 자동차공학과 박서준',
      investigation_date: '2026.10.23',
      properties: {
        fiber_composition: '면(Cotton) 65%, 폴리에스터(Polyester) 35%',
        weave_type: '평직 (Plain Weave)',
        structure_detail: '날실과 씨실이 1:1로 번갈아 교차하는 안정적인 평직 조직',
        thickness_mm: null,
        gsm: 155.00,
        gsm_range_text: '155 ± 10 GSM',
        elasticity: '비신축 평직',
        elasticity_detail: '탄성사가 미포함된 일반 평직 구조',
        shrinkage_warp_pct: null,
        shrinkage_weft_pct: null,
        shrinkage_avg_pct: 9.00,
        shrinkage_detail: '평균 8~10% 수축률. 초기 1~5회 세탁·건조에서 수축 집중, 옆길이(경사 방향) 수축이 가장 큼.',
        color_fastness_detail: '분산염료 일욕염색 시 Yellow 9는 4급, Red 11·Blue 56·Violet 1은 4~5급의 우수한 견뢰도.',
        dye_transfer_detail: '폴리에스터는 분산염료, 면은 반응성/배트염료 사용. 잔류 염료로 인해 Yellow 9 기준 면 4급, 아세테이트 3~4급 이염.',
        care_guide: '진한 색상은 초기 분리 세탁. 일반 세탁기 찬물 또는 미온수 물세탁 가능. 흰색과 유색 구분 세탁.',
        other_characteristics: '탄성과 내마모성 우수, 치수 안정적, 구김 적고 세탁 용이, 빠른 건조.'
      },
      tests: [
        {
          name: '혼방 셔츠 세탁 및 건조 수축률 측정 (KS K 0472)',
          condition: '40℃ 세탁 12분, 헹굼 6분, 회전 드럼 건조(60℃)',
          result: '초기 1~5회에 수축이 집중 진행되며 옆길이 수축 최대'
        },
        {
          name: '반복 세탁·다림질 두께 변화 측정 (KS K ISO 6330)',
          condition: '150℃ 가정용 다리미 5회 다림질 병행, 50회 반복',
          result: '원포 0.198mm → 10회 후 0.224mm (+13.1%) → 50회 후 0.218mm'
        },
        {
          name: '교직물 변퇴색 및 첨부포 오염 측정 (KS K 0430 A-1)',
          condition: 'DBDCBS 처리 후 분산염료 일욕염색 시료',
          result: '변퇴색 4~5급 (Yellow 9 4급), 첨부포 오염 3~4급'
        }
      ],
      sources: [
        { title: '반복세탁 및 건조방법이 드레스셔츠의 물성에 미치는 영향(I)', url: 'https://koreascience.kr/article/JAKO199923659442800.pdf' },
        { title: '드레스셔츠 소재의 반복세탁과 다림질에 의한 물성변화에 관한 연구 (성신여대)', url: 'https://repository.sungshin.ac.kr/handle/2025.oak/3061' },
        { title: '폴리에스테르/면 복합소재의 단일분산염료 일욕염색 (한국염색가공학회지)', url: 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001055047' }
      ]
    },
    {
      id: 5,
      name: '면직물',
      aliases: '순면 (Cotton)',
      category: '천연',
      color: '#E8D5B7',
      desc: '통기성과 흡습성이 뛰어나며 피부 친화적인 천연 셀룰로오스 섬유',
      tags: ['천연', '통기성', '중량'],
      investigator: '2026005561 섬유시스템공학과 김예린',
      investigation_date: '2026.10.24',
      properties: {
        fiber_composition: '셀룰로오스 87%~90%, 수분 5~8%, 천연 불순물(밀납, 지방분 등)',
        weave_type: '평직 직물 (경사/위사 1:1 교차)',
        structure_detail: '낱실과 위사가 비슷하거나 같은 섬도/밀도로 단순하고 촘촘한 구조와 평평한 표면.',
        thickness_mm: null,
        gsm: null,
        gsm_range_text: '고급 평직 80~120, 중평직 100~150, 조평직 150~250 GSM',
        elasticity: '낮은 신축성',
        elasticity_detail: '신장률 3~7%, 20% 늘어났을 때 복원율 70~74% 수준 (인장회복성 낮음).',
        shrinkage_warp_pct: 4.80,
        shrinkage_weft_pct: 2.20,
        shrinkage_avg_pct: 4.00,
        shrinkage_detail: '평균 3~5% 수축. 첫 세탁 시 가장 많이 수축하고 세로 방향 수축이 더 큼. 수온 증가 시 수축 증가.',
        color_fastness_detail: '일반 견뢰도 4등급 이상으로 우수하나, 황백/소목 천연염색 시 매염제 없을 경우 변퇴색 1~2등급으로 저하 가능.',
        dye_transfer_detail: '염색 및 후처리 조건에 따라 상이. 세탁 및 습윤 마찰견뢰도를 기준으로 평가.',
        care_guide: '찬물 손세탁 권장. 중성세제로 뒤집어 세탁 시 원단 보호 가능. 세탁기 탈수는 약하게, 건조기 사용 시 수축 위험으로 자연 건조 권장.',
        other_characteristics: '젖으면 섬유가 부풂(팽윤). 땀과 습기를 잘 흡수함.'
      },
      tests: [
        {
          name: '면의 세탁견뢰도 테스트 (KS K ISO 105-C06:2007)',
          condition: '표준세제 4g 용해, 40℃ 물 헹굼 2회, 표준회색색표 판정',
          result: '면 섬유 세탁 견뢰도 4등급 이상, 특수 복합염 시 1~2등급'
        },
        {
          name: '면직물의 수축률 테스트 (BS-5A, ISO 6330)',
          condition: '40℃ 물 45분 세탁, 텀블드라이 건조기 사용',
          result: '무수지 가공 시 경사 약 4.8%, 위사 2.2% 수축 / 수지 3% 처리 시 2% 이내로 안정화'
        }
      ],
      sources: [
        { title: '한국섬유개발연구원 Textopia', url: 'https://www.textopia.or.kr/contents/site/selectPageIntroView.do?menuId=231' },
        { title: '비포름알데하이드계 수지 가공제 처리한 면직물의 특성 변화 (한국염색가공학회지)', url: 'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001670866' }
      ]
    },
    {
      id: 6,
      name: '폴리에스터',
      aliases: 'Polyester (PET)',
      category: '합성',
      color: '#C8D8E4',
      desc: '구김이 적고 형태안정성과 속건성이 우수한 대표적 합성 섬유',
      tags: ['합성', '경량', '속건'],
      investigator: '2026005561 섬유시스템공학과 김예린',
      investigation_date: '2026.10.25',
      properties: {
        fiber_composition: '주로 폴리에틸렌 테레프탈레이트(PET) 중합체 100%',
        weave_type: '직조 방식 다양',
        structure_detail: '용도에 따라 다양한 직조 방식 적용',
        thickness_mm: null,
        gsm: null,
        gsm_range_text: '섬도, 밀도, 직조에 따라 자유 조절',
        elasticity: '우수한 복원력',
        elasticity_detail: '일시적으로 늘어나더라도 하중이 제거되면 원래 길이로 복원되는 탄성 우수.',
        shrinkage_warp_pct: null,
        shrinkage_weft_pct: null,
        shrinkage_avg_pct: 0.80,
        shrinkage_detail: '수축률 1% 미만. 고분자 사슬의 높은 결정성으로 인해 수축과 늘어남에 강한 저항력 제공.',
        color_fastness_detail: '여러 번 세탁해도 변색이 거의 없음.',
        dye_transfer_detail: '고온에서 분산염료로 염색하므로 고온 세탁 시 다른 섬유로 염료 이동/이염 가능성 존재.',
        care_guide: '세탁 시 물 온도가 60℃를 넘지 않도록 주의. 중성세제 권장, 면이나 타 소재 옷과 혼합 세탁 지양.',
        other_characteristics: '성형 공정으로 강도/신장률 제어 가능. 소수성이 강해 수분을 거의 흡수하지 않고 건조가 매우 빠름.'
      },
      tests: [
        {
          name: '해도형 극세사 폴리에스터 염색 견뢰도 시험 (AATCC WOB)',
          condition: '고온염색법 및 환원 세정, DMF 용매 추출 분광분석',
          result: '염색 후 열처리에 따라 견뢰도 편차 있으나 전반적 세탁 견뢰도 우수 (3~5급)'
        },
        {
          name: '폴리에스터 섬유 수축률 시험 (ISO 가이드)',
          condition: '21℃ 상대습도 65% 항온조 24시간 전처리 후 세척',
          result: '일반적으로 수축률 1% 미만으로 우수한 치수 안정성 확인'
        }
      ],
      sources: [
        { title: '해도형 극세사 폴리에스테르의 염색성 및 세탁견뢰도 향상에 관한 연구 (DBpia)', url: 'https://www.dbpia.co.kr/pdf/pdfView.do?nodeId=NODE01798201' },
        { title: '섬유 수축률 시험 표준 가이드 (HN Leading)', url: 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/' }
      ]
    }
  ];

  // ----------------------------------------------------------
  //  [Table] compatibility — 원단 쌍별 호환성 (15개 조합)
  // ----------------------------------------------------------
  const _compatibility = {
    '1-2': { score: 45, level: 'caution', summary: '수축률 차이 큼',   detail: '나일론(수축 1% 미만)과 울(펠팅 수축 10% 이상)은 세탁 시 수축률 차이가 극심하여 접합부 울림 현상이 발생합니다.' },
    '1-3': { score: 60, level: 'caution', summary: '강도 및 두께 차이', detail: '나일론의 얇고 강한 인장강도 대비 데님(1.04mm)의 두꺼운 능직 구조로 봉제 시 바늘 호수(14~16호) 선택에 주의해야 합니다.' },
    '1-4': { score: 72, level: 'good',    summary: '양호한 조합',      detail: '나일론과 코튼 폴리 블렌드는 혼방사의 폴리 성분 덕분에 열처리 및 세탁 안정성이 양호합니다.' },
    '1-5': { score: 55, level: 'caution', summary: '흡습성 차이',      detail: '나일론은 소수성, 면직물은 높은 흡수성을 지녀 수분 접촉 시 건조 속도 차이로 인한 뒤틀림에 유의해야 합니다.' },
    '1-6': { score: 85, level: 'good',    summary: '우수한 조합',      detail: '나일론과 폴리에스터는 대표적인 합성 섬유로서 열처리 및 세탁 조건이 유사하여 매우 높은 호환성을 보입니다.' },
    '2-3': { score: 58, level: 'caution', summary: '관리 조건 상이',   detail: '울은 드라이클리닝 필수이며, 데님은 물세탁 중심 원단이므로 혼합 제품 제작 시 세탁 관리 가이드 일원화가 어렵습니다.' },
    '2-4': { score: 50, level: 'caution', summary: '필링 및 수축 주의', detail: '울과 폴리 혼방 원단 마찰 시 정전기 유발 및 필링(보풀) 발생 가능성이 높습니다.' },
    '2-5': { score: 65, level: 'good',    summary: '전통적 조합',      detail: '울과 면은 천연 섬유 간 조합으로 자연스러운 촉감을 주나, 세탁 시 울의 펠팅 수축에 따른 형태 변형에 유의해야 합니다.' },
    '2-6': { score: 35, level: 'bad',     summary: '비추천 조합',      detail: '울과 폴리에스터는 열 반응과 정전기 발생 특성이 극명히 달라 고온 프레스나 세탁 시 손상 위험이 큽니다.' },
    '3-4': { score: 78, level: 'good',    summary: '좋은 조합',        detail: '데님과 코튼 폴리 블렌드는 공통의 면 섬유 베이스를 공유하여 봉제성 및 촉감 호환성이 우수합니다.' },
    '3-5': { score: 90, level: 'good',    summary: '최적 조합',        detail: '동일한 순면 100% 기반으로 수축률 반응, 세탁 온도 및 인디고 염색 특성이 가장 잘 어우러집니다.' },
    '3-6': { score: 62, level: 'caution', summary: '열처리 주의',      detail: '데님(면)과 폴리에스터의 열 반응 차이로 인해 150도 이상의 고온 다림질 시 폴리 손상에 주의해야 합니다.' },
    '4-5': { score: 82, level: 'good',    summary: '우수한 호환',      detail: '코튼 폴리 블렌드와 면직물은 면 성분이 공통되므로 수축 거동이 유사하고 봉제 완성도가 높습니다.' },
    '4-6': { score: 88, level: 'good',    summary: '매우 좋은 조합',   detail: '혼방 원단 내 폴리에스터 성분과 폴리에스터가 완벽한 건조 및 세탁 호환성을 제공합니다.' },
    '5-6': { score: 55, level: 'caution', summary: '수축률 차이',      detail: '면직물은 세탁 시 3~5% 수축하는 반면 폴리에스터는 1% 미만이므로 접합선 주름(Puckering) 방지 처리가 필요합니다.' },
  };

  // ----------------------------------------------------------
  //  [Table] test_guides — 4단계 테스트 가이드 마스터
  // ----------------------------------------------------------
  const _testGuides = [
    {
      id: 'shrinkage',
      name: '수축률 테스트',
      icon: '📏',
      desc: '세탁 및 건조 후 각 원단 간 치수 변화율 차이를 측정합니다.',
      method: '① 30×30cm 시편 준비 → ② 40℃ 물 45분 세탁 → ③ 자연/저온 건조 → ④ 경사·위사 치수 재측정',
      unit: '%',
      inputType: 'number',
      inputLabel: '수축률 차이 (%)',
      threshold: { good: 2, caution: 5 },
      condition: (pairs) => pairs.some(p => p.detail.includes('수축') || p.level !== 'good'),
    },
    {
      id: 'pilling',
      name: '필링(보풀) 테스트',
      icon: '🔍',
      desc: '마틴데일 마찰 시험기를 이용하여 원단 표면의 보풀 및 마모도를 평가합니다.',
      method: '① 시편을 마틴데일 장비에 장착 → ② 2,000회 회전 마찰 → ③ 1~5등급 육안 판정',
      unit: '등급',
      inputType: 'select',
      inputOptions: [
        { value: '5', label: '5등급 (보풀 없음, 최우수)' },
        { value: '4', label: '4등급 (미세한 보풀 발생, 양호)' },
        { value: '3', label: '3등급 (보통 수준의 보풀, 주의)' },
        { value: '2', label: '2등급 (심한 보풀 형성, 위험)' },
        { value: '1', label: '1등급 (극심한 뭉침 및 보풀, 사용불가)' },
      ],
      threshold: { good: 4, caution: 3 },
      condition: (pairs) => pairs.some(p => p.detail.includes('필링') || p.detail.includes('마찰')),
    },
    {
      id: 'colorfastness',
      name: '염색 및 이염 견뢰도 테스트',
      icon: '🎨',
      desc: '세탁 과정에서 백색 첨부포로 염료가 이염되는 정도와 변퇴색을 측정합니다.',
      method: '① 시편 + 다섬유 첨부포 봉합 → ② 40℃ 세탁액 45분 세탁 → ③ 오염용 그레이스케일 비교',
      unit: '등급',
      inputType: 'select',
      inputOptions: [
        { value: '5', label: '5등급 (변색/이염 없음, 최우수)' },
        { value: '4', label: '4등급 (경미한 이염, 허용 가능)' },
        { value: '3', label: '3등급 (눈에 띄는 이염, 주의 필요)' },
        { value: '2', label: '2등급 (상당한 오염/이염 발생, 위험)' },
        { value: '1', label: '1등급 (극심한 이염/물빠짐, 사용불가)' },
      ],
      threshold: { good: 4, caution: 3 },
      condition: (pairs) => pairs.some(p => p.detail.includes('염색') || p.detail.includes('이염') || p.detail.includes('견뢰')),
    },
    {
      id: 'tensile',
      name: '인장/인열강도 테스트',
      icon: '💪',
      desc: '접합 봉제 부위의 인장 강도와 원단 파열 저항성을 평가합니다.',
      method: '① 폭 5cm 봉제 시편 준비 → ② 인장시험기 장착 (인장속도 100mm/min) → ③ 파단 시 하중(N) 측정',
      unit: 'N',
      inputType: 'number',
      inputLabel: '인장강도 (N)',
      threshold: { good: 200, caution: 150 },
      condition: (pairs) => pairs.some(p => p.detail.includes('강도') || p.detail.includes('두께') || p.level === 'caution'),
    },
  ];

  // ----------------------------------------------------------
  //  [Table] action_rules — 5단계 맞춤 조치 추천 규칙
  // ----------------------------------------------------------
  const _actionRules = {
    shrinkage: [
      { check: (v) => v <= 2,          level: 'success', icon: '✅', title: '수축률 안정적 (정상 생산 가능)', desc: '두 원단의 수축률 차이가 2% 이내로 안정적입니다. 별도의 방축 가공 없이 표준 봉제 공정을 진행할 수 있습니다.' },
      { check: (v) => v > 2 && v <= 5, level: 'warning', icon: '⚠️', title: '패턴 여유분 부여 및 방축 워싱 권장', desc: '수축률 차이가 2~5% 범위입니다. 봉제 전 원단 프리워싱(Pre-washing)을 거치거나 재단 시 3~5%의 패턴 여유분을 반영하세요.' },
      { check: (v) => v > 5,           level: 'danger',  icon: '🚫', title: '원단 수축 차이 극심 (조합 위험)', desc: '수축률 차이가 5%를 초과하여 세탁 후 심각한 뒤틀림과 봉제선 퍼커링이 발생합니다. 원단 교체 또는 개별 부위 분리 패턴 설계를 검토하세요.' },
    ],
    pilling: [
      { check: (v) => v >= 4,          level: 'success', icon: '✅', title: '마찰 내구성 우수', desc: '마찰에 의한 보풀 발생이 없어 활동성 의류 및 외부 마찰 부위에 안심하고 사용할 수 있습니다.' },
      { check: (v) => v === 3,         level: 'warning', icon: '⚠️', title: '표면 안티필링 가공 권장', desc: '마찰 부위에서 보풀이 발생할 수 있습니다. 효소 감량 또는 실리콘 유연제 안티필링 후가공을 적용하세요.' },
      { check: (v) => v < 3,           level: 'danger',  icon: '🚫', title: '보풀 발생 심각 (조합 부적합)', desc: '심각한 마모 및 보풀로 인해 혼합 사용 시 제품 수명이 극히 짧아집니다. 안감 배치로 직접 마찰을 방지하세요.' },
    ],
    colorfastness: [
      { check: (v) => v >= 4,          level: 'success', icon: '✅', title: '이염 위험 없음 (안전)', desc: '세탁 및 습윤 조건에서 이염 위험이 거의 없습니다. 밝은 색상과의 결합도 안전합니다.' },
      { check: (v) => v === 3,         level: 'warning', icon: '⚠️', title: '세탁 고착제(Fixer) 처리 및 단독세탁 라벨', desc: '미세 이염이 발생할 수 있으므로 봉제 전 염료 고착제 후처리를 진행하고 취급표시 라벨에 단독세탁을 명시하세요.' },
      { check: (v) => v < 3,           level: 'danger',  icon: '🚫', title: '심각한 이염 발생 (배색 금지)', desc: '밝은 원단과 함께 봉제 시 심각한 오염이 발생합니다. 밝은 원단과의 배색을 피하고 방염포 또는 코팅 처리가 필요합니다.' },
    ],
    tensile: [
      { check: (v) => v >= 200,        level: 'success', icon: '✅', title: '봉제 인장강도 충분', desc: '접합부 인장강도가 200N 이상으로 높은 내구성을 보장합니다.' },
      { check: (v) => v >= 150 && v<200, level: 'warning', icon: '⚠️', title: '봉제선 보강 스티치 필요', desc: '인장강도가 150~200N 수준입니다. 스트레스가 집중되는 부위에 더블 스티치나 바텍(Bar-tack) 보강 재봉을 적용하세요.' },
      { check: (v) => v < 150,         level: 'danger',  icon: '🚫', title: '봉제선 찢어짐 위험 (보강 필수)', desc: '인장강도가 150N 미만으로 당김 시 봉제선 터짐 위험이 큽니다. 심지(Interlining) 접착 및 고강력 코아사 사용이 필수적입니다.' },
    ],
  };

  // ==========================================================
  //  Public Methods
  // ==========================================================

  /** 전체 원단 목록 조회 */
  async function getFabrics() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('fabrics').select('*');
        if (!error && data && data.length > 0) return data.map(f => ({...f, data_origin:'database'}));
      } catch (e) {
        console.warn('Supabase getFabrics 실패, 로컬 캐시 사용:', e);
      }
    }
    return structuredClone(_fabrics).map(f => ({...f, data_origin:'local_example'}));
  }

  /** ID로 원단 상세 정보 조회 */
  async function getFabricDetail(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('fabrics')
          .select('*, fabric_properties(*), fabric_tests(*), fabric_sources(*)')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase getFabricDetail 실패, 로컬 캐시 사용:', e);
      }
    }
    return structuredClone(_fabrics.find(f => f.id === Number(id)));
  }

  /** ID 배열로 원단 목록 조회 */
  async function getFabricsByIds(ids) {
    const list = await getFabrics();
    return list.filter(f => ids.includes(f.id));
  }

  /** 두 원단의 쌍별 호환성 조회 */
  async function getCompatibility(idA, idB) {
    const minId = Math.min(idA, idB);
    const maxId = Math.max(idA, idB);
    const key = `${minId}-${maxId}`;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('compatibility')
          .select('*')
          .eq('fabric_a_id', minId)
          .eq('fabric_b_id', maxId)
          .single();
        if (!error && data) return {...data, score_origin:'database'};
      } catch (e) {
        console.warn('Supabase getCompatibility 실패, 로컬 캐시 사용:', e);
      }
    }

    const data = _compatibility[key] || {
      score: 50,
      level: 'caution',
      summary: '조합 데이터 참조',
      detail: '해당 원단 조합의 표준 봉제 및 세탁 시 주의가 필요합니다.',
    };
    return { ...data, fabric_a_id: minId, fabric_b_id: maxId, score_origin: _compatibility[key] ? 'local_example' : 'default' };
  }

  /** 선택된 원단들에 대한 전체 호환성 분석 */
  async function analyzeCompatibility(ids) {
    const sortedIds = [...ids].sort((a,b) => a-b);
    const fabrics = await getFabricsByIds(sortedIds);
    const pairs = [];

    for (let i = 0; i < sortedIds.length; i++) {
      for (let j = i + 1; j < sortedIds.length; j++) {
        const compat = await getCompatibility(sortedIds[i], sortedIds[j]);
        pairs.push({
          ...compat,
          nameA: fabrics.find(f => f.id === sortedIds[i]).name,
          nameB: fabrics.find(f => f.id === sortedIds[j]).name,
        });
      }
    }

    const avgScore = pairs.length > 0
      ? Math.round(pairs.reduce((s,p) => s + p.score, 0) / pairs.length)
      : 0;

    return { fabrics, pairs, avgScore };
  }

  /** 호환성 결과 기반 4단계 필요 테스트 가이드 조회 */
  async function getTestGuides(pairs) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('test_guides').select('*, test_input_options(*)');
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Supabase getTestGuides 실패, 로컬 캐시 사용:', e);
      }
    }
    const guides = _testGuides.filter(g => g.condition(pairs));
    return guides.map(({ condition, ...rest }) => rest);
  }

  /** 테스트 결과 기반 5단계 조치 추천 조회 */
  async function getActionRecommendations(testResults) {
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

    return actions;
  }

  /** 테스트 세션 및 결과 저장 */
  async function saveTestResults(sessionId, testResults) {
    if (supabase) {
      try {
        await supabase.from('test_sessions').insert([{ session_id: sessionId }]);
        const rows = testResults.map(r => ({
          session_id: sessionId,
          test_id: r.testId,
          input_value: String(r.value),
          numeric_value: isNaN(Number(r.value)) ? null : Number(r.value)
        }));
        await supabase.from('test_results').insert(rows);
      } catch (e) {
        console.warn('Supabase saveTestResults 실패:', e);
      }
    }
    console.log('[API] saveTestResults recorded:', sessionId, testResults);
    return { success: true, sessionId };
  }

  return {
    getFabrics,
    getFabricDetail,
    getFabricsByIds,
    getCompatibility,
    analyzeCompatibility,
    getTestGuides,
    getActionRecommendations,
    saveTestResults,
  };

})();
