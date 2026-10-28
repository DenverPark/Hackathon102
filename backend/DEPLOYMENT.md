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
