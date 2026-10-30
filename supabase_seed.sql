-- ============================================================
-- 🧵 Supabase PostgreSQL 데이터 삽입 스크립트 (seed.sql)
-- 원단 6종 정밀 데이터 및 호환성/테스트 가이드 데이터
-- ============================================================

-- ------------------------------------------------------------
-- 1. fabrics 데이터 삽입
-- ------------------------------------------------------------
INSERT INTO fabrics (id, name, aliases, category, color_hex, description, tags, investigator, investigation_date) VALUES
(1, '나일론', 'Nylon', '합성', '#2C2C2E', '가볍고 내구성과 인장강도가 뛰어난 대표적 합성 섬유', ARRAY['합성', '경량', '고강도'], '박병찬', '2026-10-21'),
(2, '울', '양모 (Wool)', '천연', '#8E7C6A', '보온성과 탄력성이 우수한 단백질계 천연 동물성 섬유', ARRAY['천연', '보온', '중량'], '박병찬', '2026-10-21'),
(3, '데님', 'DENIM (진 원단)', '천연', '#2D4A7A', '3/1 능직으로 짜여 내구성이 매우 높고 인디고 염색 특성을 지닌 면직물', ARRAY['천연', '능직', '중량'], '2026002925 자동차공학과 박서준', '2026-10-23'),
(4, '코튼 폴리에스터 블렌드', '면-폴리에스터 혼방', '혼방', '#B0C4B1', '면의 흡습성과 폴리에스터의 형태안정성을 결합한 실용적 혼방 원단', ARRAY['혼방', '실용', '중량'], '2026002925 자동차공학과 박서준', '2026-10-23'),
(5, '면직물', '순면 (Cotton)', '천연', '#E8D5B7', '통기성과 흡습성이 뛰어나며 피부 친화적인 천연 셀룰로오스 섬유', ARRAY['천연', '통기성', '중량'], '2026005561 섬유시스템공학과 김예린', '2026-10-24'),
(6, '폴리에스터', 'Polyester (PET)', '합성', '#C8D8E4', '구김이 적고 형태안정성과 속건성이 우수한 대표적 합성 섬유', ARRAY['합성', '경량', '속건'], '2026005561 섬유시스템공학과 김예린', '2026-10-25')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  aliases = EXCLUDED.aliases,
  category = EXCLUDED.category,
  color_hex = EXCLUDED.color_hex,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  investigator = EXCLUDED.investigator,
  investigation_date = EXCLUDED.investigation_date;

SELECT setval('fabrics_id_seq', (SELECT MAX(id) FROM fabrics));

-- ------------------------------------------------------------
-- 2. fabric_properties 데이터 삽입 (1:1)
-- ------------------------------------------------------------
INSERT INTO fabric_properties (
    fabric_id, fiber_composition, weave_type, structure_detail,
    thickness_mm, gsm, gsm_range_text,
    elasticity, elasticity_detail,
    shrinkage_warp_pct, shrinkage_weft_pct, shrinkage_avg_pct, shrinkage_detail,
    color_fastness_detail, dye_transfer_detail, care_guide, other_characteristics
) VALUES
(
    1,
    '나일론 6,6 (Nylon 6,6) 100% 또는 나일론 6 (Nylon 6) 100% (폴리우레탄 등 탄성 섬유 미포함)',
    '고밀도 나일론 직물',
    '고밀도 평직/립스탑 직조 방식',
    NULL,
    NULL,
    NULL,
    '비신축',
    '기본적인 비신축 직물 구조',
    1.20, 0.80, 1.00,
    '세탁 시 경사(세로) 1.2%, 위사(가로) 0.8% 이하. 합성섬유 특성상 열고정(Heat-setting)이 완료되어 일반 수축률은 매우 낮으나, 150℃ 이상의 고온 노출 시 열수축 발생 가능.',
    NULL,
    '산성 염료로 주로 염색되며, 세탁 및 마찰 시 다른 합성/천연 직물로 염료가 이염될 가능성이 존재.',
    '30℃ 이하의 미온수 또는 찬물에서 중성세제를 사용하여 세탁기 표준코스 또는 손세탁 권장. 고온 건조기 사용 시 열에 의한 원단 수축 및 주름 발생 위험이 있으므로 자연 건조 권장. 드라이클리닝 가능.',
    '건조가 매우 빠름(속건성). PU/아크릴 방수 코팅 원단은 고온 다림질 시 코팅 손상 위험.'
),
(
    2,
    '양모 100% (단백질 섬유, 케라틴 성분)',
    '방모/수모 직물 또는 편물',
    '방모 및 수모 직물 또는 편물 구조',
    1.250,
    NULL,
    '방모 직물 기준 두께 1.25mm',
    '편물: 고신축성 / 직물: 미세 신축성',
    '천연 크림프(Crimp) 구조로 인해 뛰어난 탄력성과 신축성 보유.',
    11.40, 7.20, 9.30,
    '수온 및 기계적 마찰 작용 시 스케일 마찰로 인한 비가역적 펠팅 현상 발생. 일반 물세탁 시 세로 수축률 8.0~15.0%, 가로 수축률 5.0~10.0%의 심각한 펠팅 수축 및 면적 감소 유발.',
    NULL,
    '산성 염료 및 반응성 염료로 염색됨. 습윤 조건이나 알칼리성 세제 노출 시 염료 용출 및 다른 직물로의 이염 위험 존재 (오염 등급 3급).',
    '물세탁 및 일반 세탁기 세탁 금지(드라이클리닝 필수 권장). 물세탁 필요 시 울 전용 중성세제를 사용하여 30℃ 이하의 찬물에서 가볍게 손세탁 후 형태를 잡아 평면 자연 건조.',
    '보온성, 흡습성, 탄력성이 우수하나 수분, 열, 마찰이 가해지면 스케일이 서로 엉켜 돌이킬 수 없는 펠팅 수축 발생. 알칼리에 취약.'
),
(
    3,
    '면 100% (경사와 위사 모두 면섬유로 구성된 비신축 데님, 폴리우레탄 등 탄성섬유 미포함)',
    '3/1, 2/1, 2/2 능직 (주로 3/1 능직)',
    '3/1 능직: 하나의 경사가 위사 3올 위를 지나고 다음 위사 1올 아래를 통과하는 방식으로 교차. 교차 위치가 한 올씩 사선 방향으로 이동하며 데님 특유의 사선 능선 형성.',
    1.040,
    389.20,
    '389.2 GSM (1.04 mm)',
    '비신축 데님',
    '스판덱스가 섞이지 않은 순수 100% 면 능직으로 신축성이 없음.',
    5.50, 1.90, 3.70,
    '경사(세로) 5.5%, 위사(가로) 1.9% 수축. 첫 물세탁에서 경사 방향 수축(4.6%)이 가장 크게 일어나며, 10회 세탁 후 경사 7.9%, 위사 2.6% 수축.',
    '세탁 전 원포 L* 26.06에서 첫 세탁 후 22.41, 10회 후 b* -12.55로 변화. 직물 밀도 증가 및 경사 팽윤으로 흰색 위사가 가려져 원포보다 색상이 더 어둡고 푸르게 변화.',
    '세탁 시 인디고 염색 견고도가 낮아 물빠짐 발생 및 다른 부위/의류에 이염. 첫 물세탁에서 백색포 L* 값이 5.6% 감소하여 이염이 가장 심함.',
    '형태 변화를 줄이는 데는 드라이클리닝이 가장 효과적임. 30℃에서 드럼세탁기 표준코스 물세탁 가능하나 첫 물세탁 시 단독 세탁 필수.',
    '원사 꼬임과 굵기가 강도, 뻣뻣함, 촉감 등에 큰 영향을 미침. 화학적·기계적 워싱 후가공 용이.'
),
(
    4,
    '면(Cotton) 65%, 폴리에스터(Polyester) 35%',
    '평직 (Plain Weave)',
    '날실과 씨실이 1:1로 교차하는 평직 구조로 안정적인 직조 형태',
    NULL,
    155.00,
    '155 ± 10 GSM',
    '비신축 평직',
    '스판사가 포함되지 않은 평직으로 비신축 특성을 가짐.',
    NULL, NULL, 9.00,
    '평균 8~10% 수축률. 초기 1~5회 세탁·건조에서 수축이 크게 진행되며, 옆길이(경사 방향) 수축이 가장 큼.',
    '분산염료 4종 일욕염색 시 Yellow 9는 4급, Red 11, Blue 56, Violet 1은 4~5급의 우수한 세탁 견뢰도를 보임.',
    '폴리에스터는 분산염료, 면은 반응성/배트염료를 사용. 미고착 잔류 염료가 있을 시 세탁 중 이염 가능 (Yellow 9 면 첨부포 4급, 아세테이트/나일론 3~4급).',
    '진한 색상의 혼방 의류는 초기 세탁 시 단독 분리 세탁. 일반 가정용 세탁기 찬물 또는 미온수 물세탁 가능. 흰색과 유색 분리 세탁.',
    '건조/습한 조건에서 탄성과 내마모성이 우수하며 치수가 안정적임. 뻣뻣하고 구김이 적으며 세탁이 용이하고 건조가 빠름.'
),
(
    5,
    '셀룰로오스 87%~90%, 수분 5~8%, 천연 불순물(밀납, 지방분, 회분, 색소 등)',
    '평직 직물 (경사/위사 1:1 교차)',
    '낱실과 위사가 비슷하거나 같은 섬도와 밀도를 가지며 단순하고 촘촘한 구조와 평평한 표면을 형성.',
    NULL,
    NULL,
    '고급 평직물 80~120 GSM, 중평직 100~150 GSM, 조평직 150~250 GSM',
    '낮은 신축성',
    '신장률 3~7%, 20% 신장 시 복원율 70~74% 수준으로 인장회복성이 낮음.',
    4.80, 2.20, 4.00,
    '평균 3~5% 수축. 첫 세탁 시 가장 많이 수축하고 세로 방향 수축이 더 큼. 수온이 높을수록 수축 증가.',
    '면 섬유 세탁 견뢰도는 대체로 4등급 이상으로 우수하나, 황백/소목 천연염색 시 매염제가 없으면 변퇴색 1~2등급으로 저하 가능.',
    '염색 및 후처리 조건, 세탁/마찰 환경에 따라 상이. 세탁 및 습윤 마찰견뢰도를 기준으로 평가.',
    '손세탁 권장. 고온 세탁을 피하고 찬물 중성세제 세탁. 뒤집어 세탁 권장. 세탁기 사용 시 탈수는 약하게 진행. 건조기 사용 시 수축되므로 자연 건조 권장.',
    '젖으면 섬유가 부풂(팽윤). 흡습성이 매우 우수하여 땀과 습기를 빠르게 흡수.'
),
(
    6,
    '주로 폴리에틸렌 테레프탈레이트(PET) 중합체 100%',
    '직조 방식 다양',
    '용도에 따라 다양한 직조 및 편직 구조 적용',
    NULL,
    NULL,
    '실의 굵기(섬도), 밀도, 직조 방식에 따라 자유롭게 조절됨',
    '우수한 탄성 및 복원력',
    '일시적으로 늘어나더라도 하중이 제거되면 원래 길이로 되돌아오는 탄성 회복력이 매우 뛰어남.',
    NULL, NULL, 0.80,
    '수축률 1% 미만. 고분자 사슬이 체계적으로 배열된 높은 결정 구조로 인해 열과 세탁에 의한 수축 및 늘어남에 강한 저항성을 가짐.',
    '여러 번 세탁해도 변색이 거의 없음.',
    '고온에서 분산염료로 염색되므로, 고온 세탁 시 다른 섬유로 염료가 열이행 및 이염될 가능성이 존재함.',
    '세탁 시 물 온도가 60℃를 넘지 않도록 관리. 강한 알칼리 비누나 유연제보다는 중성세제 사용 권장. 면이나 타 섬유와 혼합 세탁 시 오염 주의.',
    '섬유 성형 공정을 통해 강도와 신장률 제어 가능. 소수성이 매우 강해 수분 흡수가 적고 건조가 극히 빠름.'
)
ON CONFLICT (fabric_id) DO UPDATE SET
  fiber_composition = EXCLUDED.fiber_composition,
  weave_type = EXCLUDED.weave_type,
  structure_detail = EXCLUDED.structure_detail,
  thickness_mm = EXCLUDED.thickness_mm,
  gsm = EXCLUDED.gsm,
  gsm_range_text = EXCLUDED.gsm_range_text,
  elasticity = EXCLUDED.elasticity,
  elasticity_detail = EXCLUDED.elasticity_detail,
  shrinkage_warp_pct = EXCLUDED.shrinkage_warp_pct,
  shrinkage_weft_pct = EXCLUDED.shrinkage_weft_pct,
  shrinkage_avg_pct = EXCLUDED.shrinkage_avg_pct,
  shrinkage_detail = EXCLUDED.shrinkage_detail,
  color_fastness_detail = EXCLUDED.color_fastness_detail,
  dye_transfer_detail = EXCLUDED.dye_transfer_detail,
  care_guide = EXCLUDED.care_guide,
  other_characteristics = EXCLUDED.other_characteristics;

-- ------------------------------------------------------------
-- 3. fabric_tests 공인 시험 데이터 삽입
-- ------------------------------------------------------------
INSERT INTO fabric_tests (fabric_id, test_type, test_name, test_purpose, sample_info, standard_code, test_conditions, results_summary, result_metrics, notes, source_url) VALUES
-- 나일론
(1, 'shrinkage', '나일론 직물의 세탁 및 건조에 따른 치수 수축률 측정', '반복 세탁 및 건조 조건에서 나일론 직물의 경사 및 위사 방향 치수 변화 측정', '100% 나일론 평직 원단', 'ISO 5077:2007, KS K ISO 6330', '{"temperature_c": 32, "duration_min": 45, "detergent": "중성 액체세제", "drying": "상온 자연건조 및 50도 저온 드럼건조", "cycles": 5}', '5회 세탁 후 경사 1.2%, 위사 0.8% 수축으로 우수한 치수 안정성을 보임', '{"warp_pct": 1.2, "weft_pct": 0.8, "cycles": 5}', '고온(70도 이상) 건조 시 열수축 급증 가능', 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/'),
(1, 'thickness', '나일론 직물의 세탁 전후 두께 변화 측정', '세탁 및 건조 반복에 따른 두께 변화 및 올 조임 현상 평가', '나일론 평직 원포', 'ISO 5084:1996, KS K 0506', '{"sample_points": 5, "cycles": 5}', '세탁 전 0.18mm에서 5회 세탁 후 0.183mm로 약 1.67% 미세 증가', '{"thickness_before_mm": 0.180, "thickness_after_mm": 0.183, "change_pct": 1.67}', '면이나 울 직물과 달리 세탁에 의한 실의 팽윤이나 구조적 변형이 미비함', 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/'),
(1, 'dye_transfer', '나일론 직물의 세탁 시 이염 측정', '나일론에서 용출된 염료가 다섬유 첨부포로 이염되는 정도 평가', '나일론 시료 및 다섬유 첨부포', 'ISO 105-C06:2010 / KS K 0430 A-1', '{"temperature_c": 40, "duration_min": 45, "multifiber": ["면", "나일론", "아세테이트", "폴리에스터", "아크릴", "모"]}', '나일론/아세테이트 첨부포 3~4급, 면 첨부포 4급', '{"grade_nylon": "3-4", "grade_acetate": "3-4", "grade_cotton": "4"}', '동일 나일론 및 아세테이트에 미세 이염 발생할 수 있어 초기 세탁 시 이염 주의 표기 필요', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755'),

-- 울
(2, 'shrinkage', '양모 직물/편물의 세탁 방식에 따른 펠팅 수축률 측정', '기계 세탁 시 수온과 마찰 작용에 의한 양모 표면 스케일 엉킴 및 수축 관찰', '방축 미가공 100% 양모 직물 시료 (30cm x 30cm)', 'IWS TM 31, ISO 5077 / KS K 0465', '{"temperature_c": 42, "duration_min": 40, "detergent": "일반 알칼리성 표준 세제"}', '방축 미가공 순모 직물 1회 세탁만으로 경사 수축률 11.4%, 위사 수축률 7.2%의 심각한 펠팅 수축 발생', '{"warp_pct": 11.4, "weft_pct": 7.2, "cycles": 1}', '슈퍼워시 가공된 양모에는 본 수치가 동일하게 적용되지 않음', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755'),
(2, 'thickness', '양모 직물의 세탁 펠팅에 따른 두께 변화 측정', '펠팅 수축으로 인한 양모 직물의 두께 증가 및 조직 밀도 변화 관찰', '100% 양모 직물 시료', 'ISO 5084:1996 / KS K 0506', '{"sample_points": 5, "cycles": 1}', '세탁 전 1.25mm에서 세탁 및 펠팅 후 1.62mm로 두께가 29.6% 급증', '{"thickness_before_mm": 1.25, "thickness_after_mm": 1.62, "increase_pct": 29.6}', '섬유 간 스케일 엉킴으로 밀도가 높아지고 두꺼워지는 펠트화 현상 입증', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755'),
(2, 'dye_transfer', '양모 직물의 세탁 시 타 섬유 오염도 측정', '세탁 중 양모 직물에서 빠져나온 염료의 첨부포 이염도 측정', '양모 직물 및 백색 면, 울 첨부포', 'ISO 105-C06 / KS K 0430 A-1', '{"temperature_c": 40}', '오염 등급 3급 (면 및 울 첨부포 이염 위험 존재)', '{"grade_wool": 3, "grade_cotton": 3}', '미온수 세탁 시 산성염료 탈색으로 인한 이염 주의', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755'),

-- 데님
(3, 'shrinkage', '데님 직물의 세탁에 따른 수축률 측정', '물세탁 및 드라이클리닝에 따른 경사·위사 치수 변화 측정', '면 100% 데님 원단', 'ISO 5077:2007 참고', '{"temperature_c": 30, "duration_min": 60, "detergent_g": 10, "drying": "면 저온건조 최고 60도", "cycles": 10}', '첫 세탁 시 경사 4.6% 수축, 10회 물세탁 후 경사 7.9%, 위사 2.6% 수축', '{"warp_pct_1": 4.6, "warp_pct_10": 7.9, "weft_pct_10": 2.6}', '경사 방향 수축이 위사보다 훨씬 큼', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538'),
(3, 'thickness', '데님 직물의 세탁에 따른 두께 변화 측정', '세탁 횟수에 따른 두께 변화 및 형태 변화 평가', '면 100% 데님 원단 (원포 0.54mm)', 'ISO 5084:1996 참고', '{"temperature_c": 30, "duration_min": 60, "cycles": 10}', '원포 0.54mm 대비 첫 세탁 후 10.5%, 2회 후 15.5%, 10회 후 20.3% 증가', '{"thickness_initial_mm": 0.54, "increase_pct_1": 10.5, "increase_pct_10": 20.3}', '실의 팽윤 및 위치 변화로 두께 증가', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538'),
(3, 'color_change', '데님 직물의 세탁에 따른 색상 변화 측정', '세탁 횟수에 따른 명도(L*)와 색상(b*) 변화 분석', '면 100% 데님 원단', 'ISO 105-J03:2009 참고', '{"device": "Color-eye 2180 (McBeth)", "cycles": 10}', '첫 세탁 시 L* 26.06 -> 22.41로 감소, 10회 후 b* -12.55로 더 짙고 푸르게 변화', '{"L_initial": 26.06, "L_1": 22.41, "b_10": -12.55}', '흰색 위사가 가려져 겉보기 색상이 더 짙어짐', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538'),
(3, 'dye_transfer', '데님 직물의 세탁에 따른 이염 측정', '세탁 중 다른 백색 직물로 옮겨가는 염료 이염 정도 평가', '데님 및 백색 면 진 직물 (30cm x 30cm)', 'ISO 105-C06:2010 참고', '{"temperature_c": 30, "duration_min": 60, "cycles": 10}', '첫 세탁 시 백색포 L* 값이 5.6% 감소하여 이염 최대, 10회 후 안정화', '{"delta_L_pct_1": -5.6, "stabilized_cycles": 10}', '첫 세탁 시 단독 세탁 필수 권장', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538'),

-- 혼방
(4, 'shrinkage', '면·폴리에스터 혼방 셔츠의 세탁 및 건조에 따른 수축률 측정', '반복 세탁 및 건조에 따른 드레스셔츠 부위별 치수 변화 측정', '면 80%·폴리 20% 드레스셔츠 시료', 'KS K 0472, KS K 0465', '{"temperature_c": 40, "wash_min": 12, "rinse_min": 6, "dryer_temp_c": 60, "cycles": 20}', '초기 1~5회 세탁·건조에서 수축 집중, 옆길이 수축이 가장 큼', '{"active_shrinkage_cycles": "1-5"}', '봉제 상태와 혼방비에 따라 수축률 차이 존재', 'https://koreascience.kr/article/JAKO199923659442800.pdf'),
(4, 'thickness', '면·폴리에스터 혼방 직물의 반복 세탁·건조·다림질에 따른 두께 변화 측정', '반복 세탁 및 다림질 처리에 따른 두께 변화 확인', '폴리에스터 60%·면 40% 평직 원단', 'KS K ISO 6330, KS K 0506', '{"iron_temp_c": 150, "pressure": "1kPa", "cycles": 50}', '원포 0.198mm -> 10회 처리 후 0.224mm (+13.1%) -> 50회 후 0.218mm (+10.1%)', '{"thickness_0": 0.198, "thickness_10": 0.224, "thickness_50": 0.218}', '두께가 처리 횟수에 단순 비례하지 않음', 'https://repository.sungshin.ac.kr/handle/2025.oak/3061'),
(4, 'color_change', '폴리에스터·면 교직물의 세탁에 따른 변퇴색 측정', '염색한 교직물의 세탁 후 색상 변화 및 견뢰도 평가', '폴리 65%·면 35% 교직물 (DBDCBS 처리)', 'KS K 0430 A-1:2001', '{"dye_types": ["Yellow 9", "Red 11", "Blue 56", "Violet 1"]}', 'Yellow 9 변퇴색 4급, Red 11·Blue 56·Violet 1은 4~5급의 우수한 견뢰도', '{"grade_yellow9": "4", "grade_others": "4-5"}', '특수 브릿지 화합물 처리 시료의 결과임', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001055047'),

-- 면직물
(5, 'colorfastness', '면직물 세탁견뢰도 테스트', '세탁 과정에서 변퇴색과 이염의 정도 측정', '면 직물 시편', 'KS K ISO 105-C06:2007', '{"temperature_c": 40, "detergent_g": 4}', '면 섬유 세탁견뢰도는 4등급 이상으로 우수하나, 복합염 시 매염제 없을 경우 1~2등급으로 저하', '{"standard_grade": "4+", "complex_dye_grade": "1-2"}', '염료 종류와 매염제 사용 여부에 따른 편차 고려 필요', 'https://dcollection.sungshin.ac.kr/public_resource/pdf/000000006948_20261029051448.pdf'),
(5, 'shrinkage', '면직물의 수축률 테스트', '면직물의 수축률 변화 및 수지 가공 효과 측정', '면직물 시편 35cm x 25cm', 'BS-5A, ISO 6330', '{"temperature_c": 40, "duration_min": 45}', '무수지 상태 경사 약 4.8%, 위사 약 2.2% 수축 / 수지 3% 처리 시 경사·위사 약 2% 이내 안정화', '{"untreated_warp": 4.8, "untreated_weft": 2.2, "treated_avg": 2.0}', '셀룰로오스 섬유 특성상 수지가공 여부에 따라 치수 안정성 차이 큼', 'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001670866'),

-- 폴리에스터
(6, 'colorfastness', '폴리에스터 섬유 염색 견뢰도 시험', '해도형 극세사 폴리에스테르의 염색성 및 세탁견뢰도 평가', '극세사 폴리에스터 직물', 'AATCC WOB 세제 표준', '{"extraction_solvent": "DMF"}', '염색 후 열처리 조건에 따라 견뢰도 편차 발생하나 전반적으로 우수한 세탁 견뢰도 유지', '{"grade_range": "3-5"}', '염색 후 열처리에 의한 염료 열이행 관리 중요', 'https://www.dbpia.co.kr/pdf/pdfView.do?nodeId=NODE01798201'),
(6, 'shrinkage', '폴리에스터 섬유 수축률 시험', '폴리에스터 직물의 세탁 및 건조 치수 안정성 확인', '500mm x 500mm 시료', 'ISO 치수안정성 시험 기준', '{"temp_c": 21, "rh_pct": 65, "dry_hours": 24}', '일반적으로 수축률 1% 미만으로 우수한 치수 안정성 입증', '{"shrinkage_pct": "<1.0"}', '건조 방식에 따른 미세 차이 존재', 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/');

-- ------------------------------------------------------------
-- 4. fabric_sources 자료 출처 정보 삽입
-- ------------------------------------------------------------
INSERT INTO fabric_sources (fabric_id, source_type, title, url, page_info) VALUES
(1, 'academic_paper', 'KCI 섬유공학 학술 논문 및 세탁 물성 연구', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001270755', NULL),
(1, 'standard', '섬유 수축률 및 치수 안정성 시험 표준', 'https://www.hnleading.com/ko/shrinkage-testing-pre-treatment-process-for-dimensional-stability/', NULL),
(2, 'academic_paper', 'DCCA 및 플라즈마 처리가 양모직물의 형태안정성과 펠팅수축에 미치는 영향', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001270755', NULL),
(3, 'official_web', 'CottonWorks Denim Fiber & Fabrics', 'https://cottonworks.com/', NULL),
(3, 'academic_paper', '데님 직물의 워싱 가공 효과에 관한 연구', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001092857', NULL),
(3, 'academic_paper', '세탁방법에 따른 데님직물의 변색과 변형 (한국의류학회지)', 'https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001421538', 'P.115-120'),
(4, 'academic_paper', '반복세탁 및 건조방법이 드레스셔츠의 물성에 미치는 영향(I)', 'https://koreascience.kr/article/JAKO199923659442800.pdf', 'P.182-187'),
(4, 'academic_paper', '드레스셔츠 소재의 반복세탁과 다림질에 의한 물성변화에 관한 연구', 'https://repository.sungshin.ac.kr/handle/2025.oak/3061', 'P.10-18'),
(4, 'academic_paper', '이반응형 브릿지 화합물을 이용한 폴리에스테르/면 복합소재의 단일분산염료 일욕염색(Ⅱ)', 'https://journal.kci.go.kr/ksdf/archive/articlePdf?artiId=ART001055047', 'P.2-4'),
(5, 'official_web', '한국섬유개발연구원 Textopia', 'https://www.textopia.or.kr/contents/site/selectPageIntroView.do?menuId=231', NULL),
(5, 'academic_paper', '비포름알데하이드계 수지 가공제 처리한 면직물의 물리화학적 특성 변화 (한국염색가공학회지)', 'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001670866', 'P.121-130'),
(6, 'academic_paper', '해도형 극세사 폴리에스테르의 염색성 및 세탁견뢰도 향상에 관한 연구', 'https://www.dbpia.co.kr/pdf/pdfView.do?nodeId=NODE01798201', '실험 2.3.3 / 결과 3.1');

-- ------------------------------------------------------------
-- 5. fabric_upcycling 업사이클링 활용 사례 삽입
-- ------------------------------------------------------------
INSERT INTO fabric_upcycling (fabric_id, case_number, product_name, materials, steps, precautions, source_url) VALUES
(1, 1, '나일론 바람막이 재활용 스트링 파우치', '폐 나일론 바람막이 점퍼 조각 (18cm x 32cm 2장), 나일론 끈 2줄', '["1. 겉감/안감 재단", "2. 끈 통로 창구멍 남기고 옆선 재봉", "3. 바닥 모서리 2cm 삼각형 박음질 입체화", "4. 겉감/안감 입구 박음질 후 뒤집기", "5. 끈 2줄 반대 방향 통과"]', '나일론은 얇고 미끄러우므로 시침핀 고정 필수 및 9~11호 얇은 바늘 사용', 'https://nalmadasopum.com/making-note/2026/04/25/pouch-making.html'),
(1, 2, '접이식 친환경 장바구니', '폐 텐트 나일론 립스탑 원단 (30cm x 39.5cm 2장), 손잡이 끈', '["1. 립스탑 몸통 및 손잡이 재단", "2. 통솔 방식으로 안감 없이 올풀림 마감", "3. 상단 입구 접어 끈 고정 스티치", "4. 안쪽 소형 접이 주머니 부착"]', '방수 코팅층 열변형 방지를 위해 110도 이하 저온 및 덧천 대고 다림질', 'https://www.youtube.com/watch?v=C1X0tiRRt5o'),
(2, 1, '헌 울 스웨터를 활용한 겨울용 벙어리장갑', '수축되었거나 버려진 울 스웨터 니트', '["1. 뜨거운 물로 의도적 세탁·건조하여 펠트화", "2. 손 모양 패턴 제작", "3. 밑단 시보리를 손목으로 활용해 4장 재단", "4. 겉끼리 마주보게 봉제 후 뒤집기"]', '올풀림 방지를 위해 반드시 사전 고온 세탁으로 펠트 가공 후 재단', 'https://positive-info.tistory.com/104'),
(2, 2, '지퍼 없는 울 쿠션 커버', '폐 울 스웨터 또는 모직 자켓 원단 (42cm x 42cm 1장, 42cm x 27cm 2장)', '["1. 앞판 1장, 뒷판 2장 재단", "2. 뒷판 겹침 단 0.5cm 박음질", "3. 앞판/뒷판 겹쳐 사방 1cm 박음질", "4. 틈새로 뒤집고 쿠션 솜 삽입"]', '원단 늘어남 방지 위해 시침핀 고정 필수, 겹침 분량 8~10cm 이상 확보', 'https://swtlol89.tistory.com/92'),
(3, 1, '청바지 데님 핸드폰 케이스', '청바지 데님 조각, 투명 케이스, 의류용 양면테이프, 칼, 자', '["1. 케이스를 데님 위에 대고 재단선 표시", "2. 재단선 따라 재단", "3. 원단 뒷면에 양면테이프 부착", "4. 케이스 위에 밀착 부착"]', '청바지 조각 변형 방지를 위해 표면 코팅된 원단 사용 권장', 'https://www.thefirstmedia.net/news/articleView.html?idxno=19527'),
(3, 2, '청바지 리폼 실내화', '폐 청바지 데님, 퀼트솜, 시침핀', '["1. 발등 및 발바닥 부분 재단", "2. 등판과 바닥 겉 맞대어 바느질", "3. 퀼트솜 삽입 후 테두리 봉제", "4. 창구멍 통해 뒤집은 후 공그르기 마감"]', '가장자리 바느질 시 뒤집을 창구멍을 반드시 남길 것', 'https://pluiesoleilatelier.tistory.com/tag/%EC%B2%AD%EB%B0%94%EC%A7%80%EC%9E%AC%ED%99%9C%EC%9A%A9');

-- ------------------------------------------------------------
-- 6. compatibility 원단 쌍별 호환성 데이터 (15개 조합)
-- ------------------------------------------------------------
INSERT INTO compatibility (fabric_a_id, fabric_b_id, score, level, summary, detail) VALUES
(1, 2, 45, 'caution', '수축률 차이 큼', '나일론(수축 1% 미만)과 울(펠팅 수축 10% 이상)은 세탁 시 수축률 차이가 극심하여 접합부 울림 현상이 발생합니다.'),
(1, 3, 60, 'caution', '강도 및 두께 차이', '나일론의 얇고 강한 인장강도 대비 데님(1.04mm)의 두꺼운 능직 구조로 봉제 시 바늘 호수(14~16호) 선택에 주의해야 합니다.'),
(1, 4, 72, 'good', '양호한 조합', '나일론과 코튼 폴리 블렌드는 혼방사의 폴리 성분 덕분에 열처리 및 세탁 안정성이 양호합니다.'),
(1, 5, 55, 'caution', '흡습성 차이', '나일론은 소수성, 면직물은 높은 흡수성을 지녀 수분 접촉 시 건조 속도 차이로 인한 뒤틀림에 유의해야 합니다.'),
(1, 6, 85, 'good', '우수한 조합', '나일론과 폴리에스터는 대표적인 합성 섬유로서 열처리 및 세탁 조건이 유사하여 매우 높은 호환성을 보입니다.'),
(2, 3, 58, 'caution', '관리 조건 상이', '울은 드라이클리닝 필수이며, 데님은 물세탁 중심 원단이므로 혼합 제품 제작 시 세탁 관리 가이드 일원화가 어렵습니다.'),
(2, 4, 50, 'caution', '필링 및 수축 주의', '울과 폴리 혼방 원단 마찰 시 정전기 유발 및 필링(보풀) 발생 가능성이 높습니다.'),
(2, 5, 65, 'good', '전통적 조합', '울과 면은 천연 섬유 간 조합으로 자연스러운 촉감을 주나, 세탁 시 울의 펠팅 수축에 따른 형태 변형에 유의해야 합니다.'),
(2, 6, 35, 'bad', '비추천 조합', '울과 폴리에스터는 열 반응과 정전기 발생 특성이 극명히 달라 고온 프레스나 세탁 시 손상 위험이 큽니다.'),
(3, 4, 78, 'good', '좋은 조합', '데님과 코튼 폴리 블렌드는 공통의 면 섬유 베이스를 공유하여 봉제성 및 촉감 호환성이 우수합니다.'),
(3, 5, 90, 'good', '최적 조합', '동일한 순면 100% 기반으로 수축률 반응, 세탁 온도 및 인디고 염색 특성이 가장 잘 어우러집니다.'),
(3, 6, 62, 'caution', '열처리 주의', '데님(면)과 폴리에스터의 열 반응 차이로 인해 150도 이상의 고온 다림질 시 폴리 손상에 주의해야 합니다.'),
(4, 5, 82, 'good', '우수한 호환', '코튼 폴리 블렌드와 면직물은 면 성분이 공통되므로 수축 거동이 유사하고 봉제 완성도가 높습니다.'),
(4, 6, 88, 'good', '매우 좋은 조합', '혼방 원단 내 폴리에스터 성분과 폴리에스터가 완벽한 건조 및 세탁 호환성을 제공합니다.'),
(5, 6, 55, 'caution', '수축률 차이', '면직물은 세탁 시 3~5% 수축하는 반면 폴리에스터는 1% 미만이므로 접합선 주름(Puckering) 방지 처리가 필요합니다.')
ON CONFLICT (fabric_a_id, fabric_b_id) DO UPDATE SET
  score = EXCLUDED.score,
  level = EXCLUDED.level,
  summary = EXCLUDED.summary,
  detail = EXCLUDED.detail;

-- ------------------------------------------------------------
-- 7. test_guides & action_rules 테스트 가이드 및 규칙 삽입
-- ------------------------------------------------------------
INSERT INTO test_guides (id, name, icon, description, method, unit, input_type, input_label, threshold_good, threshold_caution, sort_order) VALUES
('shrinkage', '수축률 테스트', '📏', '세탁 및 건조 후 각 원단 간 치수 변화율 차이를 측정합니다.', '① 30×30cm 시편 준비 → ② 40℃ 물 45분 세탁 → ③ 자연/저온 건조 → ④ 경사·위사 치수 재측정', '%', 'number', '수축률 차이 (%)', 2.00, 5.00, 1),
('pilling', '필링(보풀) 테스트', '🔍', '마틴데일 마찰 시험기를 이용하여 원단 표면의 보풀 및 마모도를 평가합니다.', '① 시편을 마틴데일 장비에 장착 → ② 2,000회 회전 마찰 → ③ 1~5등급 육안 판정', '등급', 'select', '필링 등급', 4.00, 3.00, 2),
('colorfastness', '염색 및 이염 견뢰도 테스트', '🎨', '세탁 과정에서 백색 첨부포로 염료가 이염되는 정도와 변퇴색을 측정합니다.', '① 시편 + 다섬유 첨부포 봉합 → ② 40℃ 세탁액 45분 세탁 → ③ 오염용 그레이스케일 비교', '등급', 'select', '이염 견뢰도 등급', 4.00, 3.00, 3),
('tensile', '인장/인열강도 테스트', '💪', '접합 봉제 부위의 인장 강도와 원단 파열 저항성을 평가합니다.', '① 폭 5cm 봉제 시편 준비 → ② 인장시험기 장착 (인장속도 100mm/min) → ③ 파단 시 하중(N) 측정', 'N', 'number', '인장강도 (N)', 200.00, 150.00, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  method = EXCLUDED.method,
  unit = EXCLUDED.unit,
  input_type = EXCLUDED.input_type,
  input_label = EXCLUDED.input_label,
  threshold_good = EXCLUDED.threshold_good,
  threshold_caution = EXCLUDED.threshold_caution,
  sort_order = EXCLUDED.sort_order;

INSERT INTO test_input_options (test_id, value, label, sort_order) VALUES
('pilling', '5', '5등급 (보풀 없음, 최우수)', 1),
('pilling', '4', '4등급 (미세한 보풀 발생, 양호)', 2),
('pilling', '3', '3등급 (보통 수준의 보풀, 주의)', 3),
('pilling', '2', '2등급 (심한 보풀 형성, 위험)', 4),
('pilling', '1', '1등급 (극심한 뭉침 및 보풀, 사용불가)', 5),
('colorfastness', '5', '5등급 (변색/이염 없음, 최우수)', 1),
('colorfastness', '4', '4등급 (경미한 이염, 허용 가능)', 2),
('colorfastness', '3', '3등급 (눈에 띄는 이염, 주의 필요)', 3),
('colorfastness', '2', '2등급 (상당한 오염/이염 발생, 위험)', 4),
('colorfastness', '1', '1등급 (극심한 이염/물빠짐, 사용불가)', 5);

INSERT INTO action_rules (test_id, min_value, max_value, select_value, level, icon, title, description) VALUES
('shrinkage', 0.00, 2.00, NULL, 'success', '✅', '수축률 안정적 (정상 생산 가능)', '두 원단의 수축률 차이가 2% 이내로 안정적입니다. 별도의 방축 가공 없이 표준 봉제 공정을 진행할 수 있습니다.'),
('shrinkage', 2.01, 5.00, NULL, 'warning', '⚠️', '패턴 여유분 부여 및 방축 워싱 권장', '수축률 차이가 2~5% 범위입니다. 봉제 전 원단 프리워싱(Pre-washing)을 거치거나 재단 시 3~5%의 패턴 여유분을 반영하세요.'),
('shrinkage', 5.01, 999.00, NULL, 'danger', '🚫', '원단 수축 차이 극심 (조합 위험)', '수축률 차이가 5%를 초과하여 세탁 후 심각한 뒤틀림과 봉제선 퍼커링이 발생합니다. 원단 교체 또는 개별 부위 분리 패턴 설계를 검토하세요.'),
('pilling', NULL, NULL, '5', 'success', '✅', '마찰 내구성 우수', '마찰에 의한 보풀 발생이 없어 활동성 의류 및 외부 마찰 부위에 안심하고 사용할 수 있습니다.'),
('pilling', NULL, NULL, '4', 'success', '✅', '마찰 내구성 양호', '표면 보풀이 경미하여 일상 의류 생산에 적합합니다.'),
('pilling', NULL, NULL, '3', 'warning', '⚠️', '표면 안티필링 가공 권장', '마찰 부위에서 보풀이 발생할 수 있습니다. 효소 감량 또는 실리콘 유연제 안티필링 후가공을 적용하세요.'),
('pilling', NULL, NULL, '2', 'danger', '🚫', '보풀 발생 심각', '잦은 마찰 시 빠르게 보풀이 뭉쳐 품질 저하를 유발합니다. 안감 배치를 고려하거나 마찰이 적은 부위로 배치를 변경하세요.'),
('pilling', NULL, NULL, '1', 'danger', '🚫', '원단 조합 부적합', '심각한 마모 및 보풀로 인해 혼합 사용 시 제품 수명이 극히 짧아집니다.'),
('colorfastness', NULL, NULL, '5', 'success', '✅', '이염 위험 없음', '세탁 및 습윤 조건에서 이염 위험이 전혀 없습니다. 밝은 색상과의 결합도 안전합니다.'),
('colorfastness', NULL, NULL, '4', 'success', '✅', '이염 안전 수준', '일반적인 가정용 세탁 조건에서 안전하게 사용할 수 있습니다.'),
('colorfastness', NULL, NULL, '3', 'warning', '⚠️', '세탁 고착제(Fixer) 처리 및 단독세탁 라벨', '미세 이염이 발생할 수 있으므로 봉제 전 염료 고착제(Cationic Fixer) 후처리를 진행하고 취급표시 라벨에 단독세탁을 명시하세요.'),
('colorfastness', NULL, NULL, '2', 'danger', '🚫', '심각한 이염 발생 (배색 금지)', '밝은 원단과 함께 봉제 시 심각한 오염이 발생합니다. 밝은 원단과의 배색을 피하고 방염포 또는 코팅 처리가 필요합니다.'),
('colorfastness', NULL, NULL, '1', 'danger', '🚫', '염색 불량 (조합 금지)', '물빠짐 및 이염이 매우 심각하므로 해당 배색 조합을 중단하세요.'),
('tensile', 200.00, 99999.00, NULL, 'success', '✅', '봉제 인장강도 충분', '접합부 인장강도가 200N 이상으로 높은 내구성을 보장합니다.'),
('tensile', 150.00, 199.99, NULL, 'warning', '⚠️', '봉제선 보강 스티치 필요', '인장강도가 150~200N 수준입니다. 스트레스가 집중되는 부위에 더블 스티치나 바텍(Bar-tack) 보강 재봉을 적용하세요.'),
('tensile', 0.00, 149.99, NULL, 'danger', '🚫', '봉제선 찢어짐 위험 (보강 필수)', '인장강도가 150N 미만으로 당김 시 봉제선 터짐 위험이 큽니다. 심지(Interlining) 접착 및 고강력 코아사 사용이 필수적입니다.');
