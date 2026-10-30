-- ============================================================
-- 🧵 Supabase PostgreSQL 데이터베이스 스키마 (schema.sql)
-- 원단 조합 분석 및 테스트 가이드 관리 시스템
-- ============================================================

-- 1. 기존 테이블 정리 (필요 시)
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS test_sessions CASCADE;
DROP TABLE IF EXISTS action_rules CASCADE;
DROP TABLE IF EXISTS test_conditions CASCADE;
DROP TABLE IF EXISTS test_input_options CASCADE;
DROP TABLE IF EXISTS test_guides CASCADE;
DROP TABLE IF EXISTS compatibility CASCADE;
DROP TABLE IF EXISTS fabric_upcycling CASCADE;
DROP TABLE IF EXISTS fabric_sources CASCADE;
DROP TABLE IF EXISTS fabric_tests CASCADE;
DROP TABLE IF EXISTS fabric_properties CASCADE;
DROP TABLE IF EXISTS fabric_tags CASCADE;
DROP TABLE IF EXISTS fabrics CASCADE;

-- ------------------------------------------------------------
-- 2. fabrics: 원단 기본 마스터 테이블
-- ------------------------------------------------------------
CREATE TABLE fabrics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    aliases VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- '합성', '천연', '혼방'
    color_hex VARCHAR(7) NOT NULL, -- 테마 컬러 코드 (예: #2C2C2E)
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    investigator VARCHAR(100),
    investigation_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. fabric_properties: 원단 상세 물성 정보 (1:1)
-- ------------------------------------------------------------
CREATE TABLE fabric_properties (
    fabric_id INT PRIMARY KEY REFERENCES fabrics(id) ON DELETE CASCADE,
    fiber_composition TEXT NOT NULL,
    weave_type VARCHAR(100),
    structure_detail TEXT,
    thickness_mm NUMERIC(6,3),         -- 측정 두께 (mm, 미측정 시 NULL)
    gsm NUMERIC(6,2),                  -- 평량 (g/m², 미측정 시 NULL)
    gsm_range_text VARCHAR(150),       -- 범위형 GSM 또는 원문 표기
    elasticity VARCHAR(50),            -- 신축성 요약 ('비신축', '고신축', '미세신축' 등)
    elasticity_detail TEXT,            -- 신축성 및 인장회복성 상세
    shrinkage_warp_pct NUMERIC(5,2),   -- 경사(세로) 수축률 (%)
    shrinkage_weft_pct NUMERIC(5,2),   -- 위사(가로) 수축률 (%)
    shrinkage_avg_pct NUMERIC(5,2),    -- 평균 수축률 (%)
    shrinkage_detail TEXT,             -- 수축 및 형태 변화 메커니즘
    color_fastness_detail TEXT,        -- 색상 변화 및 견뢰도 특성
    dye_transfer_detail TEXT,          -- 색 이염 특성
    care_guide TEXT,                   -- 권장 세탁 및 관리 방법
    other_characteristics TEXT         -- 기타 물리화학적 특성
);

-- ------------------------------------------------------------
-- 4. fabric_tests: 공인 시험 및 논문 실험 데이터 (1:N)
-- ------------------------------------------------------------
CREATE TABLE fabric_tests (
    id BIGSERIAL PRIMARY KEY,
    fabric_id INT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL,    -- 'shrinkage', 'thickness', 'colorfastness', 'dye_transfer' 등
    test_name VARCHAR(200) NOT NULL,
    test_purpose TEXT,
    sample_info TEXT,
    standard_code VARCHAR(150),        -- 적용/참고 기준 (ISO, KS K 등)
    test_conditions JSONB DEFAULT '{}',-- 온도, 세제, 시간, 기기 등 조건
    results_summary TEXT,
    result_metrics JSONB DEFAULT '{}', -- 수치화된 측정 결과
    notes TEXT,                        -- 주의사항 및 결과 해석의 한계
    source_url TEXT
);

-- ------------------------------------------------------------
-- 5. fabric_sources: 자료 출처 정보 (1:N)
-- ------------------------------------------------------------
CREATE TABLE fabric_sources (
    id BIGSERIAL PRIMARY KEY,
    fabric_id INT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,  -- 'academic_paper', 'standard', 'official_web', 'diy_case'
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    page_info VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. fabric_upcycling: 업사이클링 활용 사례 (1:N)
-- ------------------------------------------------------------
CREATE TABLE fabric_upcycling (
    id BIGSERIAL PRIMARY KEY,
    fabric_id INT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    case_number INT NOT NULL,          -- 1 or 2
    product_name VARCHAR(200) NOT NULL,
    materials TEXT,
    steps JSONB DEFAULT '[]',          -- 제작 절차 리스트
    precautions TEXT,                  -- 제작 시 주의사항
    source_url TEXT
);

-- ------------------------------------------------------------
-- 7. compatibility: 원단 쌍별 호환성 데이터 (N:M 매핑)
-- ------------------------------------------------------------
CREATE TABLE compatibility (
    fabric_a_id INT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    fabric_b_id INT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    level VARCHAR(20) NOT NULL CHECK (level IN ('good', 'caution', 'bad')),
    summary VARCHAR(200) NOT NULL,
    detail TEXT NOT NULL,
    PRIMARY KEY (fabric_a_id, fabric_b_id),
    CONSTRAINT chk_pair_order CHECK (fabric_a_id < fabric_b_id)
);

-- ------------------------------------------------------------
-- 8. test_guides: 4단계 테스트 가이드 마스터
-- ------------------------------------------------------------
CREATE TABLE test_guides (
    id VARCHAR(50) PRIMARY KEY,        -- 'shrinkage', 'pilling', 'colorfastness', 'tensile'
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    method TEXT NOT NULL,
    unit VARCHAR(20),
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('number', 'select')),
    input_label VARCHAR(100),
    threshold_good NUMERIC(10,2),
    threshold_caution NUMERIC(10,2),
    sort_order INT DEFAULT 0
);

-- ------------------------------------------------------------
-- 9. test_input_options: 셀렉트 박스 입력 옵션 (1:N)
-- ------------------------------------------------------------
CREATE TABLE test_input_options (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(50) NOT NULL REFERENCES test_guides(id) ON DELETE CASCADE,
    value VARCHAR(50) NOT NULL,
    label VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0
);

-- ------------------------------------------------------------
-- 10. action_rules: 5단계 맞춤 조치 추천 규칙 (1:N)
-- ------------------------------------------------------------
CREATE TABLE action_rules (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(50) NOT NULL REFERENCES test_guides(id) ON DELETE CASCADE,
    min_value NUMERIC(10,2),
    max_value NUMERIC(10,2),
    select_value VARCHAR(50),
    level VARCHAR(20) NOT NULL CHECK (level IN ('success', 'warning', 'danger')),
    icon VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 11. test_sessions & test_results: 테스트 결과 기록
-- ------------------------------------------------------------
CREATE TABLE test_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    fabric_ids INT[] NOT NULL,
    avg_score INT,
    verdict VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_results (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES test_sessions(session_id) ON DELETE CASCADE,
    test_id VARCHAR(50) NOT NULL REFERENCES test_guides(id) ON DELETE CASCADE,
    input_value VARCHAR(50) NOT NULL,
    numeric_value NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. Row Level Security (RLS) 정책 설정
-- ============================================================
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_upcycling ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_input_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 익명(anon) 및 인증 사용자(authenticated) 공개 조회(SELECT) 허용 정책
CREATE POLICY "Public Read fabrics" ON fabrics FOR SELECT USING (true);
CREATE POLICY "Public Read fabric_properties" ON fabric_properties FOR SELECT USING (true);
CREATE POLICY "Public Read fabric_tests" ON fabric_tests FOR SELECT USING (true);
CREATE POLICY "Public Read fabric_sources" ON fabric_sources FOR SELECT USING (true);
CREATE POLICY "Public Read fabric_upcycling" ON fabric_upcycling FOR SELECT USING (true);
CREATE POLICY "Public Read compatibility" ON compatibility FOR SELECT USING (true);
CREATE POLICY "Public Read test_guides" ON test_guides FOR SELECT USING (true);
CREATE POLICY "Public Read test_input_options" ON test_input_options FOR SELECT USING (true);
CREATE POLICY "Public Read action_rules" ON action_rules FOR SELECT USING (true);

-- 세션 및 테스트 결과는 익명 사용자도 INSERT 가능
CREATE POLICY "Public Insert test_sessions" ON test_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read test_sessions" ON test_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert test_results" ON test_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read test_results" ON test_results FOR SELECT USING (true);
