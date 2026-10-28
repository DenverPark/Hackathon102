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
