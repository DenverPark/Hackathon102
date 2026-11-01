// ============================================================
//  server.js — 원단 조합 분석 & AI 생산 조치 추천 프록시 서버
//  Node.js 내장 모듈 기반 (외부 패키지 설치 불필요)
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// MIME 타입 매핑
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.cjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ------------------------------------------------------------
// 1. Supabase / Local Action Rules 마스터 데이터
// ------------------------------------------------------------
const ACTION_RULES_MASTER = [
  { test_id: 'shrinkage', min: 0.0, max: 2.0, level: 'success', icon: '✅', title: '수축률 안정적 (정상 생산 가능)', desc: '두 원단의 수축률 차이가 2% 이내로 안정적입니다. 별도의 방축 가공 없이 표준 봉제 공정(10~12 SPI)으로 진행할 수 있습니다.' },
  { test_id: 'shrinkage', min: 2.01, max: 5.0, level: 'warning', icon: '⚠️', title: '패턴 여유분 부여 및 방축 워싱 권장', desc: '수축률 차이가 2~5% 범위입니다. 봉제 전 원단 프리워싱(Pre-washing)을 거치거나 재단 시 3~5%의 패턴 여유분을 반영하세요.' },
  { test_id: 'shrinkage', min: 5.01, max: 999.0, level: 'danger', icon: '🚫', title: '원단 수축 차이 극심 (조합 위험)', desc: '수축률 차이가 5%를 초과하여 세탁 후 심각한 뒤틀림과 봉제선 퍼커링이 발생합니다. 원단 교체 또는 탈착식 패널 분리 설계를 검토하세요.' },
  { test_id: 'pilling', value: '5', level: 'success', icon: '✅', title: '마찰 내구성 최우수', desc: '마찰에 의한 보풀 발생이 없어 외부 마찰 부위에 안심하고 사용할 수 있습니다.' },
  { test_id: 'pilling', value: '4', level: 'success', icon: '✅', title: '마찰 내구성 양호', desc: '표면 보풀이 경미하여 일상 의류 및 생활용품 생산에 적합합니다.' },
  { test_id: 'pilling', value: '3', level: 'warning', icon: '⚠️', title: '표면 안티필링 가공 권장', desc: '마찰 부위에서 보풀이 발생할 수 있습니다. 효소 감량 또는 실리콘 유연제 안티필링 후가공을 적용하세요.' },
  { test_id: 'pilling', value: '2', level: 'danger', icon: '🚫', title: '보풀 발생 심각 (내마모 라이닝 필요)', desc: '잦은 마찰 시 빠르게 보풀이 뭉쳐 품질 저하를 유발합니다. 마찰 방지 라이닝 테이프 부착을 권장합니다.' },
  { test_id: 'pilling', value: '1', level: 'danger', icon: '🚫', title: '원단 조합 부적합', desc: '심각한 마모 및 보풀로 인해 혼합 사용 시 제품 수명이 극히 짧아집니다.' },
  { test_id: 'colorfastness', value: '5', level: 'success', icon: '✅', title: '이염 위험 없음 (최우수)', desc: '세탁 및 습윤 조건에서 이염 위험이 전혀 없습니다. 밝은 색상과의 결합도 안전합니다.' },
  { test_id: 'colorfastness', value: '4', level: 'success', icon: '✅', title: '이염 안전 수준', desc: '일반적인 가정용 세탁 조건에서 안전하게 사용할 수 있습니다.' },
  { test_id: 'colorfastness', value: '3', level: 'warning', icon: '⚠️', title: '염료 고착제(Fixer) 처리 및 단독세탁 라벨', desc: '미세 이염이 발생할 수 있으므로 봉제 전 양이온 염료 고착제(Cationic Fixer) 후처리를 진행하고 취급표시 라벨에 단독세탁을 명시하세요.' },
  { test_id: 'colorfastness', value: '2', level: 'danger', icon: '🚫', title: '심각한 이염 발생 (배색 금지)', desc: '밝은 원단과 함께 봉제 시 심각한 오염이 발생합니다. 밝은 원단과의 배색을 피하고 방염포 또는 코팅 처리가 필요합니다.' },
  { test_id: 'colorfastness', value: '1', level: 'danger', icon: '🚫', title: '염색 불량 (배색 조합 불가)', desc: '물빠짐 및 이염이 매우 심각하므로 해당 배색 조합을 중단하세요.' },
  { test_id: 'tensile', min: 200.0, max: 99999.0, level: 'success', icon: '✅', title: '봉제 인장강도 충분', desc: '접합부 인장강도가 200N 이상으로 높은 내구성을 보장합니다. 일반 60수 2합 코아사로 봉제 가능합니다.' },
  { test_id: 'tensile', min: 150.0, max: 199.99, level: 'warning', icon: '⚠️', title: '봉제선 보강 스티치 필요', desc: '인장강도가 150~200N 수준입니다. 스트레스가 집중되는 부위에 더블 스티치나 바텍(Bar-tack) 보강 재봉을 적용하세요.' },
  { test_id: 'tensile', min: 0.0, max: 149.99, level: 'danger', icon: '🚫', title: '봉제선 터짐 위험 (심지 보강 필수)', desc: '인장강도가 150N 미만으로 당김 시 봉제선 터짐 위험이 큽니다. 심지(Interlining) 접착 및 고강력 코아사 사용이 필수적입니다.' }
];

// ------------------------------------------------------------
// 2. OpenAI 시스템 프롬프트 조립 함수
// ------------------------------------------------------------
function buildSystemPrompt(context) {
  const { selectedFabrics = [], analysisResult = null, testResults = [], matchedRules = [] } = context;

  const fabricsText = selectedFabrics.length > 0
    ? selectedFabrics.map(f => {
        const props = f.properties || {};
        return `- [${f.name}] (${f.category || '기본'}): 조성(${props.fiber_composition || '미확인'}), 직조(${props.weave_type || '미확인'}), 두께(${props.thickness_mm ? props.thickness_mm + 'mm' : '미측정'}), 수축률(세로 ${props.shrinkage_warp_pct || 0}%, 가로 ${props.shrinkage_weft_pct || 0}%)`;
      }).join('\n')
    : '선택된 원단 정보가 전달되지 않았습니다.';

  let compatText = '호환성 분석 정보가 없습니다.';
  if (analysisResult) {
    compatText = `종합 호환 점수: ${analysisResult.overallScore || 0}점 (${analysisResult.verdict || '판정'})\n`;
    if (Array.isArray(analysisResult.pairs)) {
      compatText += analysisResult.pairs.map(p => `  * [${p.nameA} + ${p.nameB}]: ${p.score}점 (${p.level}) - ${p.summary} / ${p.detail}`).join('\n');
    }
  }

  const testsText = testResults.length > 0
    ? testResults.map(t => `- 시험 항목 [${t.property || t.testId || t.name}]: 입력값(${t.value}${t.unit || ''}), 메모/조건(${t.notes || '없음'}), 원단쌍(${Array.isArray(t.pair) ? t.pair.join('+') : t.pair || '공통'})`).join('\n')
    : '입력된 4단계 테스트 결과가 없습니다.';

  const rulesText = matchedRules.length > 0
    ? matchedRules.map(r => `- [${r.level ? r.level.toUpperCase() : 'RULE'}] ${r.title}: ${r.desc || r.description}`).join('\n')
    : '자동 매칭된 추천 규칙이 없습니다.';

  return `당신은 대한민국 섬유공학 및 의류/봉제 제품 생산 현장 20년 경력의 "수석 섬유 기술 컨설턴트 AI"입니다.
사용자가 선택한 원단 조합, 상세 물성, 호환성 분석, 그리고 실제 측정한 4단계 테스트 결과값을 바탕으로 전문적이고 구체적인 생산 공정 조치 방안을 제공해야 합니다.

==============================================================
[1. 선택된 원단 마스터 및 물성 정보]
${fabricsText}

[2. 원단 쌍별 호환성 분석 결과]
${compatText}

[3. 사용자가 입력한 4단계 실제 테스트 측정값]
${testsText}

[4. Supabase action_rules 시스템 추천 조치 규칙]
${rulesText}
==============================================================

[응답 지침 및 원칙]
1. 원단 물성 불일치(수축률 차이, 인디고/산성염료 이염, 인장강도 차이 등)로 인한 결함을 방지할 수 있는 '구체적인 생산 공정 솔루션'을 제시하세요.
   - 바늘 규격: 예) 9~11호(나일론 등 얇은 직물), 14~16호(데님 능직 등), 니트 전용 볼포인트 바늘 등
   - 봉제사: 60수 2합/3합 코아사, 테트론사, 스판덱스 부위 우리스판사 등
   - 봉제 기법: 땀수(SPI 10~14), 더블 스티치, 바텍(Bar-tack), 인터록/오버록, 쌈솔, 통솔 등
   - 보강 및 전처리: 비신축 실크심지/접착심지 부착, 바이어스 테이핑, 원단 선세탁(Pre-washing) 및 방축(Sanforizing), 염료 고착제(Fixer) 침지 등
   - 세탁 및 케어 라벨: 세탁 온도(30℃ 찬물 vs 드라이클리닝), 중성세제 표기, 단독 세탁 경고 등
2. 사용자의 테스트 결과값에서 경고(warning)나 위험(danger)으로 판정된 항목을 최우선적으로 다루세요.
3. 친절하고 신뢰감 있는 전문가 톤으로 한국어로 답변하며, 마크다운(불릿, 굵은 글씨, 번호 매기기 등)을 적극 활용하여 가독성을 높이세요.
4. 만약 사용자가 이전 단계 입력값이나 특정 원단에 대해 질문하면 위의 프로젝트 컨텍스트를 직접 인용하여 정확하게 답변하세요.`;
}

// ------------------------------------------------------------
// 3. 지능형 스마트 폴백 엔진 (OpenAI API 키 부재 또는 오프라인 시)
// ------------------------------------------------------------
function generateSmartFallbackResponse(question, context) {
  const { selectedFabrics = [], analysisResult = null, testResults = [], matchedRules = [] } = context;
  const fabricNames = selectedFabrics.map(f => f.name).join(', ');
  const q = question.toLowerCase();

  let adviceParts = [];

  // 질문 의도 분석
  const isSewing = q.includes('바늘') || q.includes('실') || q.includes('봉제') || q.includes('재봉') || q.includes('스티치');
  const isShrinkage = q.includes('수축') || q.includes('치수') || q.includes('퍼커링') || q.includes('주름');
  const isDye = q.includes('이염') || q.includes('염색') || q.includes('물빠짐') || q.includes('세탁') || q.includes('단독');
  const isPattern = q.includes('패턴') || q.includes('여유') || q.includes('재단') || q.includes('설계');

  adviceParts.push(`안녕하세요! 섬유 기술 수석 컨설턴트입니다. 현재 분석 중인 **[${fabricNames || '선택 원단'}]** 조합과 입력하신 테스트 결과를 종합하여 조치 방안을 안내해 드립니다.\n`);

  // 수축률 관련 조치
  const shrinkTest = testResults.find(t => (t.property === 'shrinkage' || t.testId === 'shrinkage'));
  if (shrinkTest || isShrinkage) {
    const val = shrinkTest ? Number(shrinkTest.value) : 0;
    adviceParts.push(`### 📏 1. 수축률 및 치수 안정화 조치`);
    if (val > 5) {
      adviceParts.push(`- **위험 감지 (수축률 차이 ${val}%):** 두 원단의 수축 거동 차이가 큽니다. 완제품 세탁 시 접합부 뒤틀림이 발생하므로 **반드시 봉제 전 원단 상태에서 40℃ 온수 선세탁(Pre-washing) 및 텀블 건조**를 실시하여 수축을 선반영한 후 재단하세요.`);
      adviceParts.push(`- 탈착식 안감 설계 또는 수축률이 높은 원단 쪽에 5~7%의 추가 패턴 여유분을 부여하세요.`);
    } else if (val > 2) {
      adviceParts.push(`- **주의 (수축률 차이 ${val}%):** 재단 시 경사(세로) 방향으로 **3~4% 패턴 완화분(Ease allowance)**을 주시고, 밑실 장력을 느슨하게 조절(장력 1.2~1.5gf)하여 봉제선 퍼커링을 예방하세요.`);
    } else {
      adviceParts.push(`- 측정된 수축률 차이가 허용 범위(2% 이내)로 양호합니다. 일반 표준 재단 및 봉제 공정을 진행하실 수 있습니다.`);
    }
  }

  // 이염 및 세탁 관련 조치
  const stainTest = testResults.find(t => (t.property === 'staining' || t.testId === 'colorfastness'));
  if (stainTest || isDye) {
    adviceParts.push(`\n### 🎨 2. 염색 견뢰도 및 이염 방지 조치`);
    if (stainTest && (stainTest.value === '관찰됨' || Number(stainTest.value) <= 3)) {
      adviceParts.push(`- **이염 주의 감지:** 세탁 시 상대 원단으로의 염료 오염이 확인되었습니다.`);
      adviceParts.push(`- **후가공 조치:** 봉제 전 **양이온 염료 고착제(Cationic Fixer)** 2~3% o.w.f 용액에 50℃에서 20분간 침지 후 수세·건조하세요.`);
      adviceParts.push(`- **케어 라벨 명시:** *"첫 1~2회 단독 찬물 세탁 권장 / 표백제 사용 금지 / 합성세제 직접 접촉 금지"* 문구를 필수로 표기해야 합니다.`);
    } else {
      adviceParts.push(`- 일반 세탁 조건에서 이염 위험이 안정적입니다. 단, 짙은 색상과 밝은 색상 배색 시 30℃ 이하 미온수 세탁 가이드를 권장합니다.`);
    }
  }

  // 봉제 스펙 가이드 (바늘, 실, 스티치)
  if (isSewing || !isShrinkage && !isDye) {
    adviceParts.push(`\n### 🪡 3. 추천 생산 봉제 사양 (Sewing Specification)`);
    const hasDenim = selectedFabrics.some(f => f.name.includes('데님'));
    const hasNylon = selectedFabrics.some(f => f.name.includes('나일론'));
    const hasWool = selectedFabrics.some(f => f.name.includes('울'));

    if (hasDenim && hasNylon) {
      adviceParts.push(`- **바늘 선택:** 데님(두께 1.04mm)과 나일론(박물) 접합 시 **오르간(Organ) DB×1 #14 (또는 #11/#14 단차 봉제)**를 권장합니다. 나일론 단독 부위는 11호로 땀뜀과 원단 손상을 방지하세요.`);
      adviceParts.push(`- **봉제사:** 윗실/밑실 모두 **40수 2합 또는 60수 3합 코아사(Core-spun yarn)**를 사용하여 높은 인장강도를 유지하세요.`);
      adviceParts.push(`- **땀수:** **10~11 SPI(2.3~2.5mm)**로 설정하여 나일론의 천공 파열(Perforation)을 방지하세요.`);
    } else if (hasWool) {
      adviceParts.push(`- **바늘:** **볼포인트(Ball-point) 11~14호**를 사용하여 울 섬유 조직 파손을 방지하세요.`);
      adviceParts.push(`- **보강:** 늘어남 방지를 위해 어깨선과 암홀선에 **10mm 실크 테이프(Stay tape)**를 필수 접착하세요.`);
    } else {
      adviceParts.push(`- **바늘:** 일반 본봉용 11~14호 유니버설 바늘`);
      adviceParts.push(`- **봉제사:** 60수 2합 테트론 코아사 권장`);
      adviceParts.push(`- **땀수:** 표준 11~12 SPI`);
    }
  }

  adviceParts.push(`\n💡 추가적인 세부 공정이나 시험 항목에 대해 더 궁금한 점이 있으시면 언제든지 말씀해 주세요!`);

  return adviceParts.join('\n');
}

// ------------------------------------------------------------
// 4. OpenAI API 호출 프록시 로직
// ------------------------------------------------------------
function callOpenAiChat(systemPrompt, userQuestion, chatHistory = []) {
  return new Promise((resolve, reject) => {
    if (!OPENAI_API_KEY) {
      return reject(new Error('NO_API_KEY'));
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userQuestion }
    ];

    const postData = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 25000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const reply = parsed.choices?.[0]?.message?.content || '';
            resolve(reply);
          } catch (e) {
            reject(new Error('JSON 파싱 오류: ' + e.message));
          }
        } else {
          reject(new Error(`OpenAI HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('OpenAI API 요청 시간 초과'));
    });

    req.write(postData);
    req.end();
  });
}

// ------------------------------------------------------------
// 5. HTTP 서버 및 라우팅
// ------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 1: action_rules 전체 목록 반환
  if (req.method === 'GET' && pathname === '/api/action-rules') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: true, data: ACTION_RULES_MASTER }));
    return;
  }

  // API 2: AI 챗봇 추천 프록시 엔드포인트
  if (req.method === 'POST' && pathname === '/api/chat/recommend') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const question = (payload.question || '').trim();
        const chatHistory = payload.history || [];

        if (!question) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ success: false, error: '질문(question)을 입력해주세요.' }));
          return;
        }

        // 시스템 프롬프트 조립
        const systemPrompt = buildSystemPrompt(payload);

        let reply = '';
        let source = 'openai';

        if (OPENAI_API_KEY) {
          try {
            reply = await callOpenAiChat(systemPrompt, question, chatHistory);
          } catch (apiErr) {
            console.warn('[Proxy Warning] OpenAI API 호출 실패, 지능형 스마트 엔진으로 전환:', apiErr.message);
            reply = generateSmartFallbackResponse(question, payload);
            source = 'smart-engine-fallback';
          }
        } else {
          // API Key가 없는 경우 지능형 스마트 분석 엔진 작동
          reply = generateSmartFallbackResponse(question, payload);
          source = 'smart-engine';
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({
          success: true,
          reply: reply,
          source: source,
          hasApiKey: Boolean(OPENAI_API_KEY)
        }));
      } catch (err) {
        console.error('[Server Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 정적 파일 서빙
  if (req.method === 'GET') {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(path.join(__dirname, filePath));

    // 경로 탈출 방지
    if (!safePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(safePath).pipe(res);
    });
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`======================================================`);
    console.log(`🧵 원단 조합 테스트 & AI 컨설턴트 백엔드 프록시 서버 시작`);
    console.log(`🌐 포트: http://localhost:${PORT}`);
    console.log(`🔑 OpenAI API 키 상태: ${OPENAI_API_KEY ? '설정됨 (Active)' : '미설정 (지능형 스마트 엔진 활성)'}`);
    console.log(`======================================================`);
  });
}

module.exports = {
  server,
  buildSystemPrompt,
  generateSmartFallbackResponse,
  ACTION_RULES_MASTER,
};
