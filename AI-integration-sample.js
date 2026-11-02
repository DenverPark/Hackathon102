async function askAiConsultant(payload) {
try {
const res = await fetch('/api/chat/recommend', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
if (!res.ok) {
const errData = await res.json().catch(() => ({}));
throw new Error(errData.error || 서버 오류 (${res.status}));
}
return await res.json();
} catch (e) {
console.warn('[API.askAiConsultant] 백엔드 미연결로 인해 테스트용 응답을 반환합니다.', e);
 // 백엔드 서버가 없을 때 작동할 목업(Mock) 응답 생성 예시
 const userQuery = payload.message || '입력된 질문';
  return {
    reply: `선택하신 원단 조합 기반 분석 결과입니다.\n\n질문하신 "${userQuery}"에 대해 안내드립니다:\n- 세탁 시 수축률 차이로 인한 퍼커링을 방지하기 위해 봉제선에 약 3~5%의 패턴 여유분을 반영하세요.\n- 저온 세탁 및 자연 건조를 권장하며, 마찰이 심한 부위는 안티필링 가공 처리를 검토하시기 바랍니다.`
  };
}