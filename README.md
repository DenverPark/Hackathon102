# 원단 조합 테스트 — Supabase 연동

작업 브랜치: `feature/supabase-integration` (2026-10-28 사용자 지침). 이후 제작·수정도 이 브랜치에서 진행하며 main 반영은 별도 요청 후 진행합니다.

## 실행

```sh
python -m http.server 8102 --bind 127.0.0.1
```

브라우저에서 http://127.0.0.1:8102/ 를 엽니다. ES module을 사용하므로 index.html을 파일로 직접 열지 마세요. 별도 패키지 설치는 필요 없습니다.

## 실제 연결

- 프로젝트: `czxcnvgbrrakyydtdhgh`
- 목록/상세: `lm_fabrics`, 원단 연구 근거: `lm_evidence`, 출처: `lm_sources`
- 분석: `lm_analyze` RPC, 길이 계산 클라이언트: `lm_shrinkage` RPC
- 브라우저용 공개 설정: `config.js`. publishable 키는 공개 사용 가능한 키이며 secret/service_role 키는 절대 넣지 않습니다.
- 기존 DB는 변경하지 않았습니다. `backend/supabase/`는 이미 적용한 SQL의 인계용 사본입니다. 기존 프로젝트에 초기화 SQL을 재실행하지 마세요.

현재 DB 프로필 2개를 표시합니다. 실제 시료의 측정 데이터가 없으므로 연구 값을 자동 입력하거나 임의 점수를 생성하지 않습니다. 색상 농도·사전세탁 미확인을 null/unknown으로 전달하며, 서버의 정보 부족·주의사항·권장 테스트·규칙 버전·연구 적용 한계를 그대로 표시합니다.

## 팀 연결 계약

담당 범위는 원단 선택·조회·조합 분석입니다. 상세 테스트 가이드, 결과 저장, 조치 추천, AI 챗봇은 해당 담당자의 API를 연결해야 합니다. 이전 임시 가이드·가짜 저장 성공 및 생산 가능 판정은 실제 API 연결로 오인되지 않도록 연결 대기 화면으로 바꿨습니다.

- `window.LayerMatch.getAnalysis()`는 전체 분석 응답의 복사본 또는 null을 반환합니다.
- 분석 완료 시 `window`에 `layermatch:analysis` CustomEvent가 발생하며 `event.detail`에 전체 응답이 담깁니다.
- `recommended_tests[].test_type`: `shrinkage`, `staining`. 가이드 상세 ID가 아닌 분류 코드입니다.
- 원단·목적·시료 정보 수정 시 이전 분석 응답을 무효화합니다.
- API 계약: `backend/API.md`, 연구 검토: `backend/SOURCE_REVIEW.md`.

## 검증

```sh
npm test
npm run test:live
```

단위 테스트 12개, 실제 Supabase HTTP 읽기·계산 검증 9개 통과. live 테스트는 조회와 계산만 수행합니다. 결과 파일은 gitignore 대상입니다.
