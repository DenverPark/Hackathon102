# 🧵 원단 조합 테스트 서비스

원단을 선택하고 조합 적합성을 분석한 후, 테스트 가이드와 맞춤 조치를 추천받을 수 있는 웹 서비스입니다.

## 📋 주요 기능

| 단계 | 기능 | 설명 |
|:----:|------|------|
| 1 | **원단 선택** | 보유 원단 중 조합할 원단을 복수 선택 |
| 2 | **선택 조회** | 선택된 원단 확인 및 편집 |
| 3 | **호환성 분석** | 원단 쌍별 호환 점수, 종합 적합도 판정 |
| 4 | **테스트 가이드** | 필요한 물리·화학 테스트 안내 + 결과 입력 |
| 5 | **조치 추천** | 테스트 결과 기반 맞춤 생산 조치 추천 |

## 🚀 시작하기

### 바로 실행 (정적 파일)

별도 설치 없이 `index.html`을 브라우저에서 열면 바로 사용 가능합니다.

```bash
# 방법 1: 파일을 직접 열기
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux

# 방법 2: 로컬 서버로 실행
npx serve .
# 또는
python -m http.server 8000
```

### 개발 서버

```bash
npm install
npm start
```

## 🗂️ 프로젝트 구조

```
fabric-combo-test/
├── index.html          # 메인 HTML (5단계 SPA)
├── style.css           # 스타일시트
├── api.js              # 데이터 액세스 레이어 (DB 연동 대비)
├── app.js              # UI 컨트롤러
├── package.json        # npm 설정
├── .gitignore
├── LICENSE
└── README.md
```

## 🗄️ DB 연동 가이드

`api.js`의 모든 함수는 `Promise`를 반환하여 백엔드 API로 교체가 용이합니다.

### 테이블 설계

```sql
-- 원단 마스터
CREATE TABLE fabrics (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(7),
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 원단 태그
CREATE TABLE fabric_tags (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    fabric_id INT NOT NULL,
    tag       VARCHAR(50) NOT NULL,
    FOREIGN KEY (fabric_id) REFERENCES fabrics(id)
);

-- 원단 쌍별 호환성
CREATE TABLE compatibility (
    fabric_a_id  INT NOT NULL,
    fabric_b_id  INT NOT NULL,
    score        INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    level        ENUM('good', 'caution', 'bad') NOT NULL,
    summary      VARCHAR(200),
    detail       TEXT,
    PRIMARY KEY (fabric_a_id, fabric_b_id),
    FOREIGN KEY (fabric_a_id) REFERENCES fabrics(id),
    FOREIGN KEY (fabric_b_id) REFERENCES fabrics(id)
);

-- 테스트 가이드 마스터
CREATE TABLE test_guides (
    id           VARCHAR(50) PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    icon         VARCHAR(10),
    description  TEXT,
    method       TEXT,
    unit         VARCHAR(20),
    input_type   ENUM('number', 'select') NOT NULL,
    threshold_good    DECIMAL(10,2),
    threshold_caution DECIMAL(10,2)
);

-- 테스트 입력 옵션 (select 타입용)
CREATE TABLE test_input_options (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    test_id   VARCHAR(50) NOT NULL,
    value     VARCHAR(50) NOT NULL,
    label     VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (test_id) REFERENCES test_guides(id)
);

-- 테스트-호환성 조건 매핑
CREATE TABLE test_conditions (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    test_id   VARCHAR(50) NOT NULL,
    keyword   VARCHAR(100),
    level     ENUM('good', 'caution', 'bad'),
    FOREIGN KEY (test_id) REFERENCES test_guides(id)
);

-- 조치 추천 규칙
CREATE TABLE action_rules (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    test_id    VARCHAR(50) NOT NULL,
    min_value  DECIMAL(10,2),
    max_value  DECIMAL(10,2),
    level      ENUM('success', 'warning', 'danger') NOT NULL,
    icon       VARCHAR(10),
    title      VARCHAR(200) NOT NULL,
    description TEXT,
    FOREIGN KEY (test_id) REFERENCES test_guides(id)
);

-- 테스트 결과 기록 (세션별)
CREATE TABLE test_results (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    session_id  VARCHAR(100) NOT NULL,
    test_id     VARCHAR(50) NOT NULL,
    value       DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES test_guides(id)
);

-- 세션 정보 (어떤 원단 조합으로 테스트했는지)
CREATE TABLE test_sessions (
    session_id  VARCHAR(100) PRIMARY KEY,
    fabric_ids  JSON NOT NULL,
    avg_score   INT,
    verdict     ENUM('pass', 'conditional', 'fail'),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API 교체 예시

```js
// 현재 (Mock)
function getFabrics() {
  return Promise.resolve(structuredClone(_fabrics));
}

// 실제 백엔드 연동
function getFabrics() {
  return fetch('/api/fabrics').then(r => r.json());
}
```

### API 엔드포인트 명세

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/fabrics` | 전체 원단 목록 |
| `GET` | `/api/fabrics?ids=1,2,3` | ID로 원단 조회 |
| `GET` | `/api/compatibility?a=1&b=2` | 쌍별 호환성 조회 |
| `POST` | `/api/compatibility/analyze` | 다중 원단 호환성 분석 |
| `POST` | `/api/test-guides` | 필요 테스트 조회 |
| `POST` | `/api/actions/recommend` | 조치 추천 조회 |
| `POST` | `/api/test-results` | 테스트 결과 저장 |

## 🛠️ 기술 스택

- **Frontend**: Vanilla HTML / CSS / JavaScript (프레임워크 없음)
- **아키텍처**: 데이터 레이어 분리 (api.js) — REST API 교체 용이
- **DB 대비**: 모든 데이터 접근 Promise 기반 비동기 처리

## 📦 지원 원단

| 원단 | 분류 | 특성 |
|------|------|------|
| 나일론 | 합성 | 경량, 고강도 |
| 울 | 천연 | 보온, 중량 |
| 데님 | 천연 | 능직, 중량 |
| 코튼 폴리에스터 블렌드 | 혼방 | 실용, 중량 |
| 면직물 | 천연 | 통기성, 중량 |
| 폴리에스터 | 합성 | 경량, 속건 |

## 📄 라이선스

[MIT License](LICENSE)
