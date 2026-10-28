# Supabase 배포 기록

## 2026-10-28 — 나일론·울 추가, v0.4.0

- GitHub 작업 브랜치: feature/supabase-integration.
- 대상 Supabase 프로젝트: czxcnvgbrrakyydtdhgh.
- Supabase 플러그인은 해당 프로젝트의 SQL·advisors 접근을 거절했습니다. 로그인된 Dashboard SQL Editor로 기존 스키마를 먼저 조회한 뒤 배포했습니다. 플러그인 권한이 해결됐다고 간주하지 않습니다.
- CLI를 설치하거나 CLI migration history를 생성하지 않았습니다. updates/의 SQL은 Dashboard 적용본이며 migration으로 적용했다고 표시하지 않습니다.
- 적용 순서: updates/nylon-wool-data.sql → updates/nylon-wool-analysis.sql.
- 데이터 SQL: 기존 테이블에 profile_details JSONB 열 추가, 신규 프로필2개·출처8개·근거13개 upsert. 기존 데님·면폴리 행을 덮어쓰지 않습니다. 전체 원단4개·출처15개·근거23개.
- 분석 SQL: lm_analyze 교체, 기존 호출 계약의 필수 필드 유지. schema_version1.1, rule_version0.4.0-draft. 소재 가공 입력 검증·미확인·주의사항과 수축 종류 분리 추가.
- Dashboard 성공 결과: nylon_wool_data_applied / nylon_wool_analysis_applied.

## 검증

- 클라이언트 단위 테스트12개.
- 실제 HTTP 테스트17개: 기존 회귀9개, 추가 원단·출처·근거 조회, 검토 JSON과 저장 데이터 전체 항목 대조, 미확인 메타데이터·경고, 입력값 보존, 수축 종류 미입력/불일치 처리, 잘못된 필드·면적수축률 거절.
- backend/supabase/verify.sql: 카탈로그 수·연구값 격리·3%포인트 경계·입력 검증·동일 소재의 별도 시료·익명 조회/분석·쓰기 차단 검증. 쓰기 시도는 권한 거절을 확인하며 전체 트랜잭션은 롤백.
- Dashboard의 실제 테이블 권한 조회: lm_fabrics, lm_sources, lm_evidence 모두 RLS=true, anon SELECT=true, anon INSERT=false, authenticated UPDATE=false.
- lm_analyze와 lm_shrinkage 모두 SECURITY INVOKER(prosecdef=false), 고정 빈 search_path 확인.
- 브라우저에서 나일론·울 선택 → 종류/코팅/열고정·조직/방축 입력 → 분석 응답과 출처·주의사항 표시까지 확인했습니다. 입력한 가공 항목이 미확인 목록에서 제외되고 rule_version0.4.0-draft가 표시됐습니다.
- 자동 advisors 전체 결과는 접근 제한으로 조회하지 못했습니다. 수동 SQL 확인을 전체 보안 감사 통과로 표현하지 않습니다.

원본 문서와 별도 관리 키·DB 비밀번호·로컬 내부 경로는 저장소에 올리지 않습니다. 프론트에는 기존 공개 publishable 키만 사용합니다.

## 2026-10-29 — 호환성 결과 점수·화면 v0.5.0

- 적용본: updates/compatibility-scoring.sql (원본 supabase/scoring.sql).
- 기존 분석 RPC를 유지하고 lm_analyze_scored를 추가했습니다. 기존 입력 검증·RLS 권한으로 조회·계산만 수행합니다. 테이블 데이터·연구 수치를 변경하지 않았습니다.
- Dashboard SQL Editor 결과: compatibility_scoring_applied. Supabase 플러그인의 대상 프로젝트 권한 제한은 그대로이며 Dashboard로 배포했습니다.
- 점수는 소재 정보 확인·수축 차이·첨부포 오염 등급·사전 세탁을 동일 비중으로 계산하는 기획 초안입니다. 물리적 호환성의 검증된 점수라고 간주하지 않습니다. API.md에 환산식과 미확인 처리 기준을 공개했습니다.
- 단위 테스트14개, 실제 점수 API 검증10개 통과: 미실측 처리, 완전한 입력,3%포인트 경계, 하한, 조건 불일치, 재현성/순서, 다중 쌍 평균, 동일 소재의 별도 시료, 잘못된 입력 거절, 연구 수치 격리.

- 함수 속성 실제 조회: lm_analyze_scored의 SECURITY INVOKER(prosecdef=false), STABLE, 고정 빈 search_path, anon EXECUTE=true 확인.
- 화면 확인: 미입력25점/확인도25%, 검증용 수축5%·2%/오염3·4등급/사전세탁 완료에서72.5점/확인도100%. 입력은 시험용이며 DB에 저장하지 않았습니다. 시험 조건 누락 차단 및 모바일 가로 넘침 없음 확인. 검증 후 입력을 초기화했습니다.
- 브라우저의 이전 연결 모듈 캐시로 새 메서드를 찾지 못한 문제는 버전이 붙은 정적 자산 URL로 수정했습니다. 숫자 입력은 input/change 이벤트에서 상태를 갱신하도록 보완했습니다.

## 2026-10-29 — 원단만 선택하는 기획용 추정 v0.6.0

- Dashboard SQL Editor에서 updates/catalogue-scoring.sql 적용, catalogue_scoring_applied 확인. 기존 RPC와 데이터는 유지.
- 사용자 입력 없이 카탈로그 분류만 사용하며 점수와 가중치는 검증되지 않은 기획 가정. 이염은 평가 보류.
- 실제 Supabase에서 등록된 네 원단의 여섯 조합, 순서 변경, 다중 쌍 평균과 잘못된 입력 검증 확인. npm test 15개 통과.
