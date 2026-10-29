# 원단 선택·조회 / 조합 분석 API 계약 v1.1

Base URL: `https://czxcnvgbrrakyydtdhgh.supabase.co`

모든 요청에 `apikey: <publishable key>`. POST는 `Content-Type: application/json`.
로그인 사용자라면 선택적으로 `Authorization: Bearer <사용자 access token>`.
publishable key를 Bearer 토큰 자리에 넣지 마세요. 모든 API는 읽기/계산이며 데이터 저장을 하지 않습니다.

| 기능 | 메서드·주소 |
|---|---|
| 목록 | GET `/rest/v1/lm_fabrics?select=*&order=name.asc&limit=20&offset=0` |
| 이름 검색 | 위 주소에 `&name=ilike.*면*` (문자열은 URL 인코딩) |
| 분류 필터 | `&category=eq.denim` 또는 `&category=eq.blend` |
| 신축성 필터 | `&stretch=eq.non_stretch` |
| 상세 | GET `/rest/v1/lm_fabrics?select=*&id=eq.denim-cotton100` |
| 원단별 근거 | GET `/rest/v1/lm_evidence?select=*&fabric_id=eq.denim-cotton100&order=id.asc` |
| 출처 | GET `/rest/v1/lm_sources?select=*&order=id.asc` |
| 분석 | POST `/rest/v1/rpc/lm_analyze` |
| 수축률 계산 | POST `/rest/v1/rpc/lm_shrinkage` |

REST 조회 반환은 배열. 상세가 없으면 빈 배열이며 client adapter는 null로 변환합니다.
현재 ID: `denim-cotton100`, `cotton65-poly35`, `nylon100`, `wool100`.

## 분석 요청

```json
{
  "payload": {
    "purpose": "셔츠 제작",
    "items": [
      {"sample_id":"A","fabric_id":"denim-cotton100","color_depth":"dark","prewashed":false},
      {"sample_id":"B","fabric_id":"cotton65-poly35","color_depth":"light","prewashed":null}
    ]
  }
}
```

- `purpose`: 필수1-200자. 현재는 문맥 보존용이며 목적별 다른 점수를 만들지 않음.
- `items`: 필수2-5개.
- `fabric_id`: DB에 존재해야 함.
- `sample_id`: 선택1-100자, 기본값 fabric_id. 시료별 고유해야 하므로 같은 소재2개는 각각 ID 부여.
- `color_depth`: `dark | light | medium | unknown`, 생략시 unknown.
- `prewashed`: boolean 또는 null, 생략시 미확인.
- `measurement`: 선택 객체 또는 null. 신뢰도는 사용자 보고값으로 표시. 연구 수치 자동 사용 없음.

동일 조건의 실측값이 있는 경우 각 item에 다음 measurement를 추가할 수 있습니다.

```json
{
  "shrinkage_pct": 5,
  "staining_grade": 3,
  "wash_temp_c": 30,
  "wash_minutes": 60,
  "cycles": 1,
  "drying": "air",
  "direction": "warp"
}
```

- shrinkage_pct: 숫자 -100~100. 음수는 팽창. 비율0.05가 아니라 백분율5를 전달.
- staining_grade: 숫자1~5. 변퇴색 등급이나 L* 변화율을 넣으면 안 됨. 미확인은 생략.
- 수축값을 보내면 온도0~100도, 시간0.1~1440분, 정수 횟수1~1000, 건조 방식1~100자, 방향 `warp | weft` 필수.
- 경사와 위사를 섞거나 처리 횟수가 다르면 수축률 차이는 null.
- 세제 등 추가 조건 필드를 보내면 그 값도 같아야 비교 가능. 두 시료가 같은 문자열을 사용하도록 프론트 선택지를 통일.

## 분석 반환

객체 형태로 다음 필드를 반환합니다.

| 필드 | 의미 |
|---|---|
| schema_version / rule_version | 계약·규칙 버전 |
| status | insufficient_data / needs_testing / no_rule_triggered |
| purpose | 요청 목적 |
| fabric_snapshots | 시료별 소재·색상·사전세탁 상태·참고출처 |
| warnings | code, message, source_ids; 해당 규칙이면 threshold_pp, difference_pp, rule_status |
| unknown_fields | 미확인 필드와 시료 ID 또는 설명 |
| recommended_tests | test_type, reason, priority |
| shrinkage_difference_pp | 동일 조건의 최대-최소 수축률 차이, 미확인시 null |
| measurement_basis | user_reported_only |
| purpose_usage / disclaimer | 적용 범위·해석 한계 |

추천 test_type은 현재 `shrinkage`, `staining`. 다른 담당자의 가이드와 연결하는 **분류 코드**이며 가이드 ID나 상세 절차가 아닙니다.

warning code: `SHRINKAGE_DATA_INSUFFICIENT`, `SHRINKAGE_GAP`, `STAINING_GRADE_CAUTION`, `COLOR_CONTRAST_CAUTION`, `PREWASH_CHECK`.

결과 저장·결과 기록 ID·가이드 상세·AI 호출은 제공하지 않습니다.

## 수축률 계산

요청 `{"before_length":30,"after_length":28.5}` → 응답 숫자 `5.0000`.
단위는 양쪽 동일하게 사용. 두 길이는 양의 유한수. 계산식 `(전-후)/전*100`, 소수4자리 반올림.

## 오류

입력 검증 실패: HTTP400, PostgreSQL code `22023`, message에 사유.
잘못된 apikey: HTTP401/403. 네트워크/서비스 오류는 별도 처리.
정보 부족은 오류가 아니라 HTTP200 + `status=insufficient_data`.

## 프론트 인수 조건

- 서버 목록을 표시하고 선택값은 ID로 관리.
- 같은 소재 여러 시료는 다른 sample_id로 관리.
- 미확인 숫자를0으로 채우지 않음.
- 분석 버튼 중복 클릭 방지·로딩·통신 오류·정보부족 상태 표시.
- 주의사항 없음 상태를 ‘안전’으로 표시하지 않음.
- 연구 수치에는 시료·조건·적용 한계 표시.
- 결과/가이드 담당자에게 전체 분석 응답과 test_type을 전달.


## 나일론·울 확장 (2026-10-28, schema 1.1 / rule 0.4.0-draft)

기존 입력은 그대로 지원합니다. 새 필드는 미확인일 때 추정하지 않고 생략합니다.

| 입력 필드 | 값 | 적용 대상 |
|---|---|---|
| nylon_type | nylon6 / nylon66 / unknown | 나일론 |
| heat_set | boolean / null | 나일론 열고정 |
| coating | none / pu / acrylic / dwr / multiple / other / unknown | 나일론 코팅·발수 등 가공 |
| construction | woven / knit / unknown | 양모 조직 |
| shrinkproofed | boolean / null | 양모 방축·슈퍼워시 가공 |
| measurement.shrinkage_kind | relaxation / felting / combined / unknown | 수축 종류 |
| measurement.shrinkage_basis | linear | 방향별 길이 수축률만 지원 |

양모 실측 수축률이 있어도 종류가 미확인이면 비교하지 않습니다. 종류·조건이 다르면 차이는 null입니다. 면적수축률(area_shrinkage_pct 또는 shrinkage_basis=area)은 HTTP400으로 거절하며 길이 수축률에 대입하지 않습니다. 연구문서 수치는 어떤 경우에도 자동 입력하지 않습니다.

추가 경고: NYLON_PROCESSING_CHECK, WOOL_FELTING_CHECK. 미확인 필드는 기존 unknown_fields에 sample_id와 함께 추가됩니다. fabric_snapshots는 실제 입력 processing과 참고 profile_details를 구분해 반환합니다. 주의 조건이 없다는 응답은 안전 판정이 아닙니다.

lm_fabrics.profile_details는 조사 프로필이며 실제 시료 메타데이터가 아닙니다. lm_evidence.conditions.verification_status와 applicability를 함께 표시하세요. 출처의 evidence_status는 원문 일부 확인, 링크만 보관, 소재 불일치 등을 구분합니다. 업사이클링 사례는 기존 근거 조회로 제공하는 참고 데이터이며 상세 가이드 API나 제작 지시가 아닙니다.

## 점수 포함 분석 (v0.5.0-draft)

`POST /rest/v1/rpc/lm_analyze_scored`, 본문 `{payload: AnalysisInput}`.
클라이언트는 `api.analyzeScored(payload)`로 호출합니다. 기존 `analyze`/lm_analyze는 호환성을 위해 유지합니다.

기존 분석 응답에 `compatibility`를 추가합니다: score, coverage, min_pair_score, label, dimensions, pairs, not_evaluated, version, disclaimer. 타입은 ScoredAnalysisResponse를 참조하세요. 원단2~5개를 전체 검증한 후 모든 쌍을 분석합니다. 쌍별 점수는 네 축의 산술 평균이고 종합 점수는 모든 쌍의 산술 평균입니다. 반올림은 소수1자리입니다.

- 소재·가공 정보: DB의 조성·조직·근거 연결, 나일론 종류/열고정/코팅 또는 양모 방축 정보의 확인 비율. 양모 조직은 사용자 입력이 확인돼야 점수를 부여합니다.
- 수축: 동일 조건의 실측 수축률 차이를 %포인트로 계산하고 `max(0,100-20*차이)`로 환산합니다. 기존 비교 조건을 충족하지 못하면0점/미확인입니다.
- 이염: 두 시료의 실측 첨부포 오염 등급이 모두 있을 때 `(최저등급-1)*25`. 한 시료라도 없으면0점/미확인입니다.
- 사전 세탁: 완료 시료 비율*100. 관리 라벨이 우선이며 세탁이 모든 소재의 필수 조건이라는 뜻은 아닙니다.
- 네 축 가중치는 각각25%. `coverage`는 별도의 평가정보 확보율이며 성공 확률이나 통계 신뢰구간이 아닙니다.

가중치·환산식은 이번 화면을 위한 검증 전 기획 지수입니다. 검증된 소재 호환성/생산 합격/성공 확률로 표시하지 마세요. 입력 누락은 낮은 점수의 원인이므로 호환 불가와 구분해야 합니다. 내구성·봉제 적합성은 DB에 검증된 평가 기준이 없어 not_evaluated에 포함합니다. 조사문서 수치를 사용자 시료의 측정값으로 대입하지 않습니다.

선택 조회의 접이식 실측 입력은 저장되지 않는 분석 입력입니다. 길이수축률 입력 시 세탁 온도/시간/횟수·건조·방향·수축종류를 함께 입력해야 합니다. 백엔드는 별도로 모든 입력을 검증합니다. 프론트는 서버가 계산한 점수를 표시하며 가중치·난수 점수를 자체 계산하지 않습니다.

## 현재 화면: 원단 프로필 기획용 추정 (v0.6.0)

POST `/rest/v1/rpc/lm_analyze_catalogue`에 `{"fabric_ids":["denim-cotton100","cotton65-poly35"]}`만 전달합니다. 서로 다른 등록 원단 2~6개를 받으며 입력 오류는 22023입니다. 원단 쌍마다 분류 가정에 따른 세탁 반응(40), 두 프로필 모두 비신축일 때 신축 분류(30), 소재별 관리 확인 가정(30)을 합산합니다. 신축 분류가 불확실하면 해당 항목을 보류하고 나머지 비중으로 환산합니다. 이염은 null이며 평가하지 않습니다. 결과는 쌍별 점수 평균입니다. 수치와 가중치는 임의의 기획 가정으로, 실제 시험값이나 검증된 호환성 점수가 아닙니다. 이하 기존 API들은 이전 버전 호환용입니다.

## 시험 근거 API (v0.7.0, 현재 화면에서는 미사용)

POST `/rest/v1/rpc/lm_analyze_evidence`에 `{"fabric_ids":["denim-cotton100","cotton65-poly35"]}`를 전달합니다. 기존 입력 검증을 재사용하며 2~6종의 모든 쌍에 대해 점수와 항목별 점수는 null, status는 not_assessable입니다. dimensions의 source_ids는 `lm_sources`에서 조회합니다. 표준과 논문은 실제 선택 원단의 시험 결과나 공인 종합 점수의 근거가 아닙니다. 이 버전은 시험값 저장 및 자동 점수 산출을 구현하지 않습니다.

## 현재 화면 (v0.7.1)

`lm_analyze_catalogue`의 기획용 추정 점수를 표시합니다. `lm_analyze_evidence` 및 표준 출처는 보존합니다. 임의 가중치는 시험 표준에서 유도되거나 검증된 것이 아닙니다.

## 원단 카탈로그 확장 (v0.8.0)

`cotton100`, `polyester100`은 면직물 및 폴리에스터의 일반 프로필 ID이며 100% 조성을 증명하지 않습니다. 조성·조직·신축은 미확인입니다. 수축 가정 등급은 면 2, 폴리에스터 1이며 기획용 추정치입니다. 이 두 원단이 포함된 쌍의 신축 점수는 보류하고 다른 가중치를 재조정합니다.

## 이염 참고 점수 v0.9.0

`lm_analyze_catalogue`의 staining dimension은 각 쌍에 데님 포함 60, 그 외 70의 임의 가정을 반환하며 weight=0입니다. 종합 점수에 반영하지 않습니다. 이는 조사자료 시험값에 의한 계산, 실제 이염 가능성, 견뢰도 등급이 아닙니다.
