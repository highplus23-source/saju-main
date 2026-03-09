// ========== 사주 전략 가이드 엔진 ==========

// 천간 (天干)
const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const CHEONGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CHEONGAN_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const CHEONGAN_YINYANG = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음'];

// 지지 (地支)
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const JIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const JIJI_ELEMENT = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
const JIJI_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

const ELEMENT_EMOJI = { '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧' };

// 절기 (양력 기준 대략 날짜) — 월 경계
const JEOLGI = [
  { month: 1, day: 6, name: '소한' },
  { month: 2, day: 4, name: '입춘' },
  { month: 3, day: 6, name: '경칩' },
  { month: 4, day: 5, name: '청명' },
  { month: 5, day: 6, name: '입하' },
  { month: 6, day: 6, name: '망종' },
  { month: 7, day: 7, name: '소서' },
  { month: 8, day: 7, name: '입추' },
  { month: 9, day: 8, name: '백로' },
  { month: 10, day: 8, name: '한로' },
  { month: 11, day: 7, name: '입동' },
  { month: 12, day: 7, name: '대설' },
];

// ===== 30분 보정 (KST Offset) =====
// 입력 시간에서 30분을 빼고, 표준 시 경계(자시 23:00~01:00)를 사용
function applyKSTOffset(hour, minute) {
  let totalMin = hour * 60 + minute - 30;
  if (totalMin < 0) totalMin += 1440;
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
}

function getHourJiIdx(hour, minute) {
  // 표준 시 경계 사용 (보정 후 시간 기준)
  const t = hour * 60 + minute;
  if (t >= 1380 || t < 60) return 0;  // 자 23:00~01:00
  if (t < 180) return 1;  // 축 01:00~03:00
  if (t < 300) return 2;  // 인 03:00~05:00
  if (t < 420) return 3;  // 묘 05:00~07:00
  if (t < 540) return 4;  // 진 07:00~09:00
  if (t < 660) return 5;  // 사 09:00~11:00
  if (t < 780) return 6;  // 오 11:00~13:00
  if (t < 900) return 7;  // 미 13:00~15:00
  if (t < 1020) return 8;  // 신 15:00~17:00
  if (t < 1140) return 9;  // 유 17:00~19:00
  if (t < 1260) return 10; // 술 19:00~21:00
  return 11; // 해 21:00~23:00
}

const SIJU_LABELS = [
  '자시(子時) 23:00~01:00', '축시(丑時) 01:00~03:00', '인시(寅時) 03:00~05:00',
  '묘시(卯時) 05:00~07:00', '진시(辰時) 07:00~09:00', '사시(巳時) 09:00~11:00',
  '오시(午時) 11:00~13:00', '미시(未時) 13:00~15:00', '신시(申時) 15:00~17:30',
  '유시(酉時) 17:00~19:00', '술시(戌時) 19:00~21:00', '해시(亥時) 21:00~23:00'
];

// ===== 년주 =====
function getYearPillar(year, month, day) {
  let adj = year;
  if (month < 2 || (month === 2 && day < 4)) adj = year - 1;
  return { gan: (adj - 4) % 10, ji: (adj - 4) % 12 };
}

// ===== 월주 =====
function getSajuMonth(month, day) {
  const monthJiMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
  for (let i = JEOLGI.length - 1; i >= 0; i--) {
    const j = JEOLGI[i];
    if (month > j.month || (month === j.month && day >= j.day))
      return monthJiMap[i];
  }
  return 0; // 소한 전 = 자월
}

function getMonthPillar(yearGan, month, day) {
  const jiIdx = getSajuMonth(month, day);
  const baseGan = ((yearGan % 5) * 2 + 2) % 10;
  const offset = (jiIdx - 2 + 12) % 12;
  return { gan: (baseGan + offset) % 10, ji: jiIdx };
}

// ===== 일주 (JDN 기반 — DST 영향 없음) =====
function getJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function getDayPillar(year, month, day) {
  const jdn = getJDN(year, month, day);
  return {
    gan: (jdn + 9) % 10,
    ji: (jdn + 1) % 12
  };
}

// ===== 시주 =====
function getHourPillar(dayGan, correctedHour, correctedMinute) {
  const jiIdx = getHourJiIdx(correctedHour, correctedMinute);
  const baseGan = (dayGan % 5) * 2;
  const ganIdx = (baseGan + jiIdx) % 10;
  return { gan: ganIdx, ji: jiIdx };
}

// ===== 야자시 판별 (보정 후 시간 기준) =====
// 보정 후 23:00~00:00 사이 = 야자시
function isYajasi(correctedHour, correctedMinute) {
  const t = correctedHour * 60 + correctedMinute;
  return t >= 1380; // 23:00 이후
}

// ===== 메인 사주 산출 =====
function calculateSaju(year, month, day, hour, minute, gender) {
  // 1) 30분 보정 적용
  const corrected = applyKSTOffset(hour, minute);
  const cH = corrected.h, cM = corrected.m;

  const yearP = getYearPillar(year, month, day);
  const monthP = getMonthPillar(yearP.gan, month, day);

  // 2) 일주 결정
  let dayP;
  const yajasi = isYajasi(cH, cM);

  if (yajasi) {
    // 야자시: 일주는 당일(입력일) 유지
    dayP = getDayPillar(year, month, day);
  } else {
    dayP = getDayPillar(year, month, day);
  }

  // 3) 시주 결정
  let hourP;
  if (yajasi) {
    // 야자시: 자시이므로 시주 천간은 '다음날' 일간 기준
    const nextDay = new Date(year, month - 1, day + 1);
    const nextDayP = getDayPillar(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate());
    hourP = getHourPillar(nextDayP.gan, cH, cM);
  } else {
    hourP = getHourPillar(dayP.gan, cH, cM);
  }

  return {
    year: yearP, month: monthP, day: dayP, hour: hourP,
    gender, birthYear: year, birthMonth: month, birthDay: day,
    birthHour: hour, birthMinute: minute,
    correctedHour: cH, correctedMinute: cM, isYajasi: yajasi
  };
}

// ===== 오행 분석 =====
function analyzeElements(saju) {
  const c = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  [saju.year, saju.month, saju.day, saju.hour].forEach(p => {
    c[CHEONGAN_ELEMENT[p.gan]]++;
    c[JIJI_ELEMENT[p.ji]]++;
  });
  return c;
}

// ===== 조사 헬퍼 (이/가) =====
// 한국어 조사: 받침 있으면 '이', 없으면 '가'
function josa이가(word) {
  const code = word.charCodeAt(word.length - 1);
  return (code - 0xAC00) % 28 !== 0 ? '이' : '가';
}

// ===== 십신(十神) — 일간과 다른 천간의 관계를 나타내는 10가지 신살 =====
function getSipsin(dayGanIdx, targetGanIdx) {
  const dayEl = CHEONGAN_ELEMENT[dayGanIdx];
  const tEl = CHEONGAN_ELEMENT[targetGanIdx];
  const same = CHEONGAN_YINYANG[dayGanIdx] === CHEONGAN_YINYANG[targetGanIdx];
  const order = ['목', '화', '토', '금', '수'];
  const diff = ((order.indexOf(tEl) - order.indexOf(dayEl)) + 5) % 5;
  return [
    same ? '비견(比肩, 자기와 같은 기운·동료)' : '겁재(劫財, 경쟁·도전·자존심)',
    same ? '식신(食神, 재능·표현·여유)' : '상관(傷官, 반항·창의·예술)',
    same ? '편재(偏財, 투자·모험·유동자산)' : '정재(正財, 안정적 수입·고정자산)',
    same ? '편관(偏官, 외부 압박·변혁·스트레스)' : '정관(正官, 직장·명예·원칙)',
    same ? '편인(偏印, 비주류 학문·종교·직관)' : '정인(正印, 교육·어머니·문서)'
  ][diff];
}

// ===== 용신 (병약 로직) =====
function findYongsin(saju) {
  const el = analyzeElements(saju);
  const dayEl = CHEONGAN_ELEMENT[saju.day.gan];
  const gen = { '목': '수', '화': '목', '토': '화', '금': '토', '수': '금' };
  const ctrl = { '목': '금', '화': '수', '토': '목', '금': '화', '수': '토' };
  const selfC = el[dayEl];
  const genC = el[gen[dayEl]];
  const strong = (selfC + genC) >= 4;

  // 병(病): 가장 과잉된 오행
  let maxEl = '', maxC = 0;
  for (const [k, v] of Object.entries(el)) {
    if (v > maxC) { maxC = v; maxEl = k; }
  }

  // 약(藥·용신) = 병을 치유할 오행
  let yongsin, desc;
  if (strong) {
    yongsin = ctrl[dayEl];
    desc = `일간(日干, 태어난 날의 천간으로 자신을 나타냄) ${dayEl}${josa이가(dayEl)} 강합니다. 강한 기운을 설기(泄氣, 에너지를 흘려보내 과잉을 해소함)하거나 제어할 ${yongsin}${josa이가(yongsin)} 약(藥·용신, 사주의 불균형을 바로잡는 핵심 오행)입니다.`;
  } else {
    yongsin = gen[dayEl];
    desc = `일간(日干, 태어난 날의 천간으로 자신을 나타냄) ${dayEl}${josa이가(dayEl)} 약합니다. 일간을 생조(生助, 생해주고 도와줌)해줄 ${yongsin}${josa이가(yongsin)} 약(藥·용신, 사주의 불균형을 바로잡는 핵심 오행)입니다.`;
  }

  // 병(病) 진단 — 사주에서 과잉되어 문제를 일으키는 오행
  let byungDesc;
  if (maxEl === dayEl && strong) {
    byungDesc = `병(病, 사주에서 과잉되어 문제를 일으키는 오행): ${maxEl}(${ELEMENT_EMOJI[maxEl]})${josa이가(maxEl)} 과잉되어 자기 중심적 성향이 강해지고, 유연성이 떨어질 수 있습니다.`;
  } else if (maxC >= 3) {
    byungDesc = `병(病, 사주에서 과잉되어 문제를 일으키는 오행): ${maxEl}(${ELEMENT_EMOJI[maxEl]})의 기운이 ${maxC}개로 과다하여 에너지 불균형의 원인이 됩니다.`;
  } else {
    byungDesc = '오행(五行, 목·화·토·금·수의 다섯 가지 기운)이 비교적 균형잡혀 있으나, 미세한 조정이 필요합니다.';
  }

  // 부족한 오행
  let minEl = '', minC = 9;
  for (const [k, v] of Object.entries(el)) {
    if (v < minC) { minC = v; minEl = k; }
  }

  return { yongsin, strong, desc, dayEl, byung: maxEl, byungDesc, burok: minEl, burokCount: minC };
}

// ===== 자연 풍경화 =====
function getNatureLandscape(saju) {
  const dayGan = saju.day.gan;
  const el = analyzeElements(saju);

  const dayNature = {
    0: '울창한 거목(巨木)',
    1: '바람에 흔들리는 꽃과 덩굴',
    2: '하늘 높이 떠오른 태양',
    3: '어둠을 밝히는 촛불',
    4: '우뚝 솟은 큰 산(大山)',
    5: '비옥한 논밭',
    6: '단단하게 벼려진 칼날',
    7: '세공된 보석',
    8: '유유히 흐르는 큰 강',
    9: '안개처럼 내려오는 이슬비'
  };

  // 오행 비중에 따라 배경 묘사
  const bgParts = [];
  if (el['목'] >= 2) bgParts.push('푸른 숲이 주변을 감싸고');
  if (el['화'] >= 2) bgParts.push('붉은 노을이 하늘을 물들이며');
  if (el['토'] >= 2) bgParts.push('넓은 대지가 기반을 받치고');
  if (el['금'] >= 2) bgParts.push('서늘한 가을 바람이 불어오고');
  if (el['수'] >= 2) bgParts.push('깊은 물줄기가 흐르는 가운데');

  if (bgParts.length === 0) bgParts.push('고요한 경치 속에서');

  const bg = bgParts.join(', ');
  const missing = [];
  if (el['목'] === 0) missing.push('나무 한 그루 없는 벌판');
  if (el['화'] === 0) missing.push('빛이 닿지 않는 그늘');
  if (el['토'] === 0) missing.push('발 디딜 곳 없는 허공');
  if (el['금'] === 0) missing.push('날카로움이 빠진 무딘 세계');
  if (el['수'] === 0) missing.push('수원(水源) 없는 메마른 땅');

  const missingText = missing.length > 0
    ? `다만, ${missing.join(', ')}의 아쉬움이 있습니다.`
    : '모든 기운이 고루 갖추어진 조화로운 풍경입니다.';

  return {
    main: dayNature[dayGan],
    background: bg,
    landscape: `${bg} ${dayNature[dayGan]}이(가) 자리하고 있습니다. ${missingText}`,
  };
}

// ===== 일간 성격 =====
function getPersonality(dayGan) {
  return [
    '갑목(甲木) — 큰 나무: 곧은 성격, 리더십, 정의감. 높은 이상을 향해 우직하게 성장하는 타입.',
    '을목(乙木) — 꽃과 덩굴: 유연하고 적응력이 뛰어남. 부드러움 속에 강한 생명력.',
    '병화(丙火) — 태양: 밝고 열정적. 넓은 포용력으로 주변을 환하게 밝히는 카리스마.',
    '정화(丁火) — 촛불: 따뜻하고 은은한 매력. 깊은 사고력과 집중력.',
    '무토(戊土) — 큰 산: 듬직하고 신뢰감 있음. 중심을 잡아주는 포용력.',
    '기토(己土) — 논밭: 부드럽고 수용적. 실용적이고 현실 감각이 뛰어남.',
    '경금(庚金) — 강철: 강인하고 결단력 있음. 의리와 추진력의 소유자.',
    '신금(辛金) — 보석: 섬세하고 예리함. 자존심 강하고 완벽주의적.',
    '임수(壬水) — 큰 바다: 지혜롭고 자유로움. 창의력과 대범함.',
    '계수(癸水) — 이슬비: 총명하고 직관적. 끈기 있게 스며드는 힘.'
  ][dayGan];
}

// ===== 대운 계산 =====
function calculateDaeun(saju) {
  const yy = CHEONGAN_YINYANG[saju.year.gan];
  const isMale = saju.gender === 'male';
  const forward = (yy === '양' && isMale) || (yy === '음' && !isMale);

  const bM = saju.birthMonth, bD = saju.birthDay;
  let startAge;
  if (forward) {
    let nj = null;
    for (const j of JEOLGI) {
      if (j.month > bM || (j.month === bM && j.day > bD)) { nj = j; break; }
    }
    if (!nj) nj = { month: 2, day: 4 };
    const d1 = new Date(2000, bM - 1, bD);
    const d2y = nj.month < bM ? 2001 : 2000;
    const d2 = new Date(d2y, nj.month - 1, nj.day);
    startAge = Math.max(1, Math.round(Math.floor((d2 - d1) / 864e5) / 3));
  } else {
    let pj = null;
    for (let i = JEOLGI.length - 1; i >= 0; i--) {
      const j = JEOLGI[i];
      if (j.month < bM || (j.month === bM && j.day <= bD)) { pj = j; break; }
    }
    if (!pj) pj = { month: 12, day: 7 };
    const d1 = new Date(2000, pj.month - 1, pj.day);
    const d2 = new Date(2000, bM - 1, bD);
    startAge = Math.max(1, Math.round(Math.floor((d2 - d1) / 864e5) / 3));
  }
  if (startAge > 10) startAge = Math.round(startAge / 3);

  const chungPairs = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const yongsin = findYongsin(saju);
  const list = [];
  let cG = saju.month.gan, cJ = saju.month.ji;

  for (let i = 0; i < 9; i++) {
    cG = forward ? (cG + 1) % 10 : (cG - 1 + 10) % 10;
    cJ = forward ? (cJ + 1) % 12 : (cJ - 1 + 12) % 12;
    const age = startAge + i * 10;
    const yr = saju.birthYear + age;
    const dEl = CHEONGAN_ELEMENT[cG];
    const djEl = JIJI_ELEMENT[cJ];

    let luck = 'neutral', desc = '';
    const isChung = chungPairs.some(([a, b]) =>
      (cJ === a && saju.day.ji === b) || (cJ === b && saju.day.ji === a));

    if (dEl === yongsin.yongsin || djEl === yongsin.yongsin) {
      luck = 'good';
      desc = `용신(用神, 사주의 불균형을 바로잡는 핵심 오행: ${yongsin.yongsin})의 기운으로 상승 운기. 적극적 도전이 유리합니다.`;
    } else if (isChung) {
      luck = 'bad';
      desc = '일지(日支, 태어난 날의 지지)와 충(沖, 서로 정반대로 충돌하는 관계) 발생. 큰 변화·이동·전환이 예상됩니다. 리스크 관리에 집중하세요.';
    } else {
      const ctrl2 = { '목': '금', '화': '수', '토': '목', '금': '화', '수': '토' };
      if (dEl === ctrl2[yongsin.dayEl]) {
        luck = 'bad';
        desc = `일간(日干, 태어난 날의 천간으로 자신을 나타냄)을 극(剋, 억제·제압)하는 ${dEl}의 기운. 외부 압박과 스트레스에 대비하세요.`;
      } else {
        desc = '큰 변동 없는 안정기. 실력을 쌓고 기반을 다지기 좋은 시기입니다.';
      }
    }

    list.push({
      gan: cG, ji: cJ, ganText: CHEONGAN[cG], jiText: JIJI[cJ],
      element: dEl, jiElement: djEl,
      age, endAge: age + 9, year: yr, endYear: yr + 9,
      luck, desc,
      sipsin: getSipsin(saju.day.gan, cG),
      isGyouni: i > 0 // 교운기 표시
    });
  }
  return { startAge, forward, list };
}

// ===== 향후 5년 충·형 분석 =====
function analyzeNext5Years(saju, currentYear) {
  const chungPairs = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const hyungSets = [[2, 5, 8], [1, 4, 7, 10], [0, 3]]; // 인사신삼형, 축진미술자형, 자묘형
  const results = [];

  for (let y = currentYear; y <= currentYear + 4; y++) {
    const yp = getYearPillar(y, 6, 15);
    const yearEl = CHEONGAN_ELEMENT[yp.gan];
    const sipsin = getSipsin(saju.day.gan, yp.gan);
    const isChung = chungPairs.some(([a, b]) =>
      (yp.ji === a && saju.day.ji === b) || (yp.ji === b && saju.day.ji === a));
    const isChungYear = chungPairs.some(([a, b]) =>
      (yp.ji === a && saju.year.ji === b) || (yp.ji === b && saju.year.ji === a));

    let hyung = false;
    for (const set of hyungSets) {
      if (set.includes(yp.ji) && set.some(s => s !== yp.ji &&
        [saju.day.ji, saju.year.ji, saju.month.ji, saju.hour.ji].includes(s))) {
        hyung = true; break;
      }
    }

    const yongsin = findYongsin(saju);
    const isYongsinYear = yearEl === yongsin.yongsin || JIJI_ELEMENT[yp.ji] === yongsin.yongsin;

    let level = 'stable', comment = '안정적인 흐름입니다.';
    if (isChung) {
      level = 'critical';
      comment = '일지 충(日支 沖, 태어난 날의 지지와 해당 연도 지지가 정반대로 충돌): 직업, 거주지, 핵심 관계에 큰 변동이 예상됩니다.';
    } else if (isChungYear) {
      level = 'warning';
      comment = '년지 충(年支 沖, 태어난 해의 지지와 해당 연도 지지가 충돌): 외부 환경의 변화, 예상치 못한 이벤트에 대비하세요.';
    } else if (hyung) {
      level = 'warning';
      comment = '형(刑, 지지끼리 서로 갈등·마찰을 일으키는 관계) 발생: 인간관계의 마찰, 법적 분쟁, 건강 이슈에 주의하세요.';
    } else if (isYongsinYear) {
      level = 'opportunity';
      comment = '용신(用神, 사주의 불균형을 바로잡는 핵심 오행)의 해: 운이 상승합니다. 중요한 결정이나 투자에 좋은 시기입니다.';
    }

    results.push({
      year: y, ganText: CHEONGAN[yp.gan], jiText: JIJI[yp.ji],
      animal: JIJI_ANIMAL[yp.ji], element: yearEl,
      sipsin, isChung, isChungYear, hyung, isYongsinYear,
      level, comment
    });
  }
  return results;
}

// ===== 실전 처세술 3대 지침 =====
function getPracticalGuidelines(saju, currentYear) {
  const yongsin = findYongsin(saju);
  const el = analyzeElements(saju);
  const dayEl = yongsin.dayEl;

  // 사업 지침
  const bizMap = {
    '목': '교육, 출판, 건강식품, 패션 분야가 유리합니다. 초기에 뿌리를 내리는 전략이 중요합니다.',
    '화': '마케팅, 엔터테인먼트, IT 분야에서 강점을 발휘합니다. 네트워크를 확장하세요.',
    '토': '부동산, 중개업, 컨설팅이 잘 맞습니다. 신뢰를 쌓는 것이 핵심 전략입니다.',
    '금': '금융, 법률, 제조업 분야에서 역량을 발휘합니다. 효율과 시스템에 집중하세요.',
    '수': '무역, 물류, 콘텐츠 사업이 유리합니다. 유연한 대응과 정보 수집이 무기입니다.'
  };

  // 재물 지침
  const wealthMap = {
    strong: `일간(日干, 태어난 날의 천간으로 자신을 나타냄)이 강하므로 적극적 투자보다 지출을 컨트롤하고, 재성(財星, 사주에서 재물과 이익을 나타내는 십신)을 키우는 방향으로 관리하세요. 부동산보다 현금 유동성을 확보하는 것이 유리합니다.`,
    weak: `일간(日干, 태어난 날의 천간으로 자신을 나타냄)이 약하므로 무리한 투자나 보증은 절대 금물입니다. 안정적 수입원을 확보하고, 용신(用神, 사주를 보완하는 핵심 오행: ${yongsin.yongsin}) 방향의 활동에 집중하세요.`
  };

  // 관계 지침
  const relMap = {
    '목': '솔직함이 장점이지만, 독선적으로 비칠 수 있습니다. 경청하는 연습이 필요합니다.',
    '화': '열정과 친화력이 강점입니다. 다만, 감정 기복을 관리하지 않으면 관계 소모가 심해집니다.',
    '토': '신뢰와 포용의 달인이지만, 우유부단함이 약점입니다. 핵심 인맥을 좁히고 깊게 관리하세요.',
    '금': '냉철한 판단력이 있지만, 차갑게 느껴질 수 있습니다. 감사 표현을 의식적으로 늘리세요.',
    '수': '소통 능력이 뛰어나지만, 깊이 없는 관계가 많아질 수 있습니다. 신뢰할 수 있는 핵심 조력자를 만드세요.'
  };

  return {
    business: { icon: '💼', title: '사업 전략', text: bizMap[yongsin.yongsin] || bizMap[dayEl] },
    wealth: { icon: '💰', title: '재물 관리', text: yongsin.strong ? wealthMap.strong : wealthMap.weak },
    relationship: { icon: '🤝', title: '관계 처세술', text: relMap[dayEl] }
  };
}

// ===== 핵심 병목(Bottleneck) 진단 =====
function diagnoseBottleneck(saju) {
  const yongsin = findYongsin(saju);
  const el = analyzeElements(saju);
  const dayEl = yongsin.dayEl;

  const overloaded = yongsin.byung;
  const lacking = yongsin.burok;

  const bottleneckMap = {
    '목': { over: '지나친 이상·계획에 매몰되어 실행력이 부족합니다.', lack: '성장 동력과 새로운 시작의 에너지가 부족합니다.' },
    '화': { over: '과도한 열정과 조급함이 에너지를 소진시킵니다.', lack: '자기 PR과 열정, 추진력이 부족하여 기회를 놓칩니다.' },
    '토': { over: '지나친 안정 추구가 변화의 타이밍을 놓치게 합니다.', lack: '중심을 잡아줄 기반과 신뢰가 부족합니다.' },
    '금': { over: '과도한 결벽과 엄격함이 유연성을 해칩니다.', lack: '결단력과 실행의 날카로움이 부족합니다.' },
    '수': { over: '생각이 너무 많아 행동이 늦어집니다.', lack: '지혜와 유연한 대응력이 부족하여 경직됩니다.' }
  };

  return {
    overloaded: { element: overloaded, emoji: ELEMENT_EMOJI[overloaded], count: el[overloaded], text: bottleneckMap[overloaded]?.over || '' },
    lacking: { element: lacking, emoji: ELEMENT_EMOJI[lacking], count: el[lacking], text: bottleneckMap[lacking]?.lack || '' },
    solution: `용신(用神, 사주의 불균형을 바로잡는 핵심 오행)인 ${yongsin.yongsin}(${ELEMENT_EMOJI[yongsin.yongsin]})의 기운을 보충하세요. ${getYongsinAction(yongsin.yongsin)}`
  };
}

function getYongsinAction(el) {
  const m = {
    '목': '초록 계열의 환경, 동쪽 방향, 아침 시간대 활동, 나무·식물 가까이 하기가 도움됩니다.',
    '화': '붉은 계열의 포인트, 남쪽 방향, 적극적 사교 활동, 운동으로 체온을 높이세요.',
    '토': '황토색·베이지 계열, 중앙·안정된 환경, 명상·요가 등 중심 잡기 활동이 유효합니다.',
    '금': '흰색·메탈릭 계열, 서쪽 방향, 규칙적 루틴과 시스템 구축에 집중하세요.',
    '수': '검정·남색 계열, 북쪽 방향, 독서·학습·수영 등 물과 관련된 활동이 도움됩니다.'
  };
  return m[el] || '';
}

// ===== 추천 식단 (1주 21끼니, 8종 식단 타입) =====
function getDietPlan(saju, dietType) {
  const yongsin = findYongsin(saju);
  const need = yongsin.yongsin;
  const burok = yongsin.burok;

  const elFoods = {
    '목': ['시금치', '브로콜리', '아보카도', '견과류', '두부', '셀러리', '케일', '청경채', '완두콩', '녹차'],
    '화': ['토마토', '파프리카', '연어', '고구마', '비트', '석류', '퀴노아', '렌틸콩', '강황', '고추'],
    '토': ['현미', '호박', '달걀', '소고기살코기', '콩나물', '감자', '당근', '버섯', '옥수수', '미소된장'],
    '금': ['무', '배', '도라지', '돼지안심', '양배추', '연근', '귀리', '미나리', '은행', '마늘'],
    '수': ['미역', '검은콩', '블루베리', '오징어', '해조류', '흑미', '다시마', '굴', '검은깨', '전복']
  };

  const dietConfigs = {
    lchf: {
      name: '저탄고지', target: '하루 1,200~1,400kcal / 탄수화물 50g 이하 / 지방 60%+',
      b: (p, s, d) => `${p} 오믈렛 + 아보카도 + MCT커피`, l: (p, s, d) => `${s} 곁들인 그릴 ${p} + 올리브오일 샐러드`, n: (p, s, d) => `${p} ${s} 볶음 + 코코넛오일 수프`,
      bt: '저탄고지', lt: '저탄고지', nt: '저탄고지', bk: '350~400', lk: '450~500', nk: '350~400'
    },
    lowgi: {
      name: '저혈당(Low GI)', target: '하루 1,300~1,500kcal / GI 55 이하 식품 위주',
      b: (p, s, d) => `통귀리 포리지 + ${p} + 그릭요거트`, l: (p, s, d) => `잡곡밥 반공기 + ${s} 된장찌개 + ${p} 반찬`, n: (p, s, d) => `${p} ${s} 샐러드 + 렌틸콩 수프`,
      bt: '저혈당', lt: '저혈당', nt: '저혈당', bk: '350~400', lk: '450~500', nk: '350~400'
    },
    highprotein: {
      name: '고단백', target: '하루 1,400~1,600kcal / 단백질 150g+ / 탄수화물 120g 이하',
      b: (p, s, d) => `달걀흰자 3개 + 닭가슴살 100g + ${p} 스무디`, l: (p, s, d) => `${s} 곁들인 스테이크 200g + ${p} 샐러드`, n: (p, s, d) => `${p} 그릴 연어 150g + ${s} 채소볶음`,
      bt: '고단백', lt: '고단백', nt: '고단백', bk: '400~450', lk: '500~550', nk: '400~450'
    },
    mediterranean: {
      name: '지중해식', target: '하루 1,400~1,600kcal / 올리브오일·생선·채소 중심',
      b: (p, s, d) => `통밀빵 + 올리브오일 + ${p} + 페타치즈`, l: (p, s, d) => `${s} 그릴 생선 + ${p} 지중해 샐러드 + 허머스`, n: (p, s, d) => `${p} ${s} 라따뚜이 + 통밀 파스타 소량`,
      bt: '지중해식', lt: '지중해식', nt: '지중해식', bk: '350~400', lk: '500~550', nk: '400~450'
    },
    vegan: {
      name: '비건/바이간', target: '하루 1,200~1,400kcal / 동물성 식품 최소화',
      b: (p, s, d) => `${p} 스무디볼 + 치아시드 + 그래놀라`, l: (p, s, d) => `${s} 두부스테이크 + ${p} 퀴노아 보울`, n: (p, s, d) => `${p} ${s} 채소카레 + 현미밥 반공기`,
      bt: '비건', lt: '비건', nt: '비건', bk: '300~350', lk: '450~500', nk: '350~400'
    },
    intermittent: {
      name: '간헐적단식(16:8)', target: '하루 1,200~1,400kcal / 12~20시 식사 / 공복 16시간',
      b: (p, s, d) => `(공복) 블랙커피 또는 녹차만`, l: (p, s, d) => `${s} ${p} 그릴 단백질 + 잡곡밥 + 채소`, n: (p, s, d) => `${p} ${s} 수프 + 단백질 150g + 견과류`,
      bt: '공복유지', lt: '첫 식사', nt: '마지막 식사', bk: '0', lk: '600~700', nk: '500~600'
    },
    antiinflam: {
      name: '항염증', target: '하루 1,300~1,500kcal / 오메가3·항산화 식품 중심',
      b: (p, s, d) => `${p} 강황라떼 + 호두 + 블루베리 볼`, l: (p, s, d) => `${s} 연어구이 + ${p} 케일샐러드 + 아마씨`, n: (p, s, d) => `${p} ${s} 생강 된장국 + 현미 소량`,
      bt: '항염증', lt: '항염증', nt: '항염증', bk: '300~350', lk: '500~550', nk: '400~450'
    },
    balanced: {
      name: '균형 식단', target: '하루 1,400~1,600kcal / 탄:단:지 = 4:3:3',
      b: (p, s, d) => `${p} 샐러드 + 삶은달걀 + 통밀토스트`, l: (p, s, d) => `${s} ${p} 곁들인 볶음밥 + 국`, n: (p, s, d) => `${p} ${s} 찜 + 잡곡밥 반공기`,
      bt: '균형식', lt: '균형식', nt: '균형식', bk: '400~450', lk: '500~550', nk: '400~450'
    }
  };

  const cfg = dietConfigs[dietType] || dietConfigs.lchf;
  const pf = elFoods[need] || elFoods['목'];
  const sf = elFoods[burok] || pf;
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const plan = [];

  for (let d = 0; d < 7; d++) {
    const p1 = pf[d % pf.length], p2 = pf[(d + 3) % pf.length];
    const s1 = sf[d % sf.length], s2 = sf[(d + 2) % sf.length];
    plan.push({
      day: days[d],
      breakfast: { menu: cfg.b(p1, s1, d), type: cfg.bt, kcal: cfg.bk + 'kcal' },
      lunch: { menu: cfg.l(p2, s2, d), type: cfg.lt, kcal: cfg.lk + 'kcal' },
      dinner: { menu: cfg.n(pf[(d + 5) % pf.length], sf[(d + 4) % sf.length], d), type: cfg.nt, kcal: cfg.nk + 'kcal' }
    });
  }

  const elEmoji = ELEMENT_EMOJI[need] || '🌿';
  const burokEmoji = ELEMENT_EMOJI[burok] || '✨';
  return {
    principle: `[${cfg.name}] 다이어트도 하면서, 사주에서 부족한 ${burok}(${burokEmoji}) 기운까지 보충하는 영리한 식단이에요! 용신 ${need}(${elEmoji}) 식재료를 중심으로 구성했어요.`,
    dailyTarget: `${cfg.target}`,
    tip: `💡 이 식단을 참고해서 나만의 식단을 짜보세요~ 몸도 마음도 가볍게! 🍃`,
    plan
  };
}

// ===== 오늘 일진 분석 =====
function analyzeTodayInteraction(saju) {
  const today = new Date();
  const todayP = getDayPillar(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const todayEl = CHEONGAN_ELEMENT[todayP.gan];
  const userEl = CHEONGAN_ELEMENT[saju.day.gan];

  const gen = { '목':'화', '화':'토', '토':'금', '금':'수', '수':'목' };
  const ctrl = { '목':'토', '화':'금', '토':'수', '금':'목', '수':'화' };
  const bodyMap = { '목':'간·담', '화':'심장·혈액순환', '토':'비장·위장', '금':'폐·대장', '수':'신장·방광' };

  let rel, msg, risk;
  if (todayEl === userEl) {
    rel = 'same'; msg = '오늘은 당신의 체질이 가장 강해지는 날입니다'; risk = null;
  } else if (ctrl[todayEl] === userEl) {
    rel = 'conflict'; msg = `${todayEl}와 ${userEl}는 서로 충돌하는 기운입니다`; risk = bodyMap[userEl];
  } else if (gen[todayEl] === userEl) {
    rel = 'support'; msg = '오늘은 당신의 기운이 충전되는 날입니다'; risk = null;
  } else if (gen[userEl] === todayEl) {
    rel = 'drain'; msg = '오늘은 에너지가 빠져나가기 쉬운 날입니다'; risk = bodyMap[userEl];
  } else {
    rel = 'control'; msg = '오늘은 당신이 주도할 수 있는 날입니다'; risk = null;
  }

  return {
    todayP, todayEl, userEl, rel, msg, risk, bodyMap,
    todayGan: CHEONGAN[todayP.gan], todayGanH: CHEONGAN_HANJA[todayP.gan],
    todayJi: JIJI[todayP.ji],
    dateStr: `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`
  };
}

// ===== 오늘의 추천 음식 =====
function getTodayFoods(userEl) {
  const foods = {
    '목': [
      { emoji:'🥬', name:'시금치', reason:'간 기능 강화' },
      { emoji:'🥦', name:'브로콜리', reason:'해독 작용' },
      { emoji:'🍵', name:'녹차', reason:'항산화 보호' }
    ],
    '화': [
      { emoji:'🍅', name:'토마토', reason:'심장 보호' },
      { emoji:'🫐', name:'블루베리', reason:'항산화' },
      { emoji:'🥬', name:'케일', reason:'혈액 정화' }
    ],
    '토': [
      { emoji:'🎃', name:'호박', reason:'위장 보호' },
      { emoji:'🍠', name:'고구마', reason:'소화 촉진' },
      { emoji:'🌾', name:'현미', reason:'기력 보충' }
    ],
    '금': [
      { emoji:'🍐', name:'배', reason:'폐 보호' },
      { emoji:'🌿', name:'도라지', reason:'호흡기 강화' },
      { emoji:'🥬', name:'양배추', reason:'위 점막 보호' }
    ],
    '수': [
      { emoji:'🫘', name:'검은콩', reason:'신장 보강' },
      { emoji:'🌊', name:'미역', reason:'수분 균형' },
      { emoji:'🫐', name:'블루베리', reason:'부종 완화' }
    ]
  };
  const avoidFoods = {
    '목': '기름진 음식 / 튀김류 / 과도한 육류',
    '화': '찬 음료 / 날 음식 / 아이스크림',
    '토': '밀가루 과다 / 단 음식 / 가공식품',
    '금': '매운 음식 / 탄산음료 / 자극적 음식',
    '수': '짠 음식 / 알코올 / 찬 음식'
  };
  const avoidReasons = {
    '목': '오늘은 간에 부담을 주는 음식을 피하세요',
    '화': '오늘은 차가운 성질이 火기운을 더 억누릅니다',
    '토': '위장에 부담되는 음식은 오늘 특히 주의하세요',
    '금': '폐와 호흡기를 자극하는 음식을 피하세요',
    '수': '오늘은 신장에 부담을 주는 짠 음식을 줄이세요'
  };
  return {
    good: foods[userEl] || foods['목'],
    bad: avoidFoods[userEl] || '',
    badReason: avoidReasons[userEl] || ''
  };
}

// ===== 건강 증상 (약한 오행) =====
function getHealthSymptoms(weakEl) {
  const data = {
    '목': [
      { icon:'😤', title:'잦은 짜증·분노', desc:'간 기능이 약하면 감정 조절이 어려워집니다' },
      { icon:'👁️', title:'눈의 피로·충혈', desc:'간은 눈과 직결됩니다' },
      { icon:'💪', title:'근육 경련·쥐', desc:'간이 약하면 근육 영양 공급이 부족합니다' },
      { icon:'🦴', title:'손발톱 깨짐', desc:'손발톱은 간의 상태를 반영합니다' },
      { icon:'😴', title:'만성 피로', desc:'간 해독 기능 저하로 노폐물이 축적됩니다' }
    ],
    '화': [
      { icon:'💓', title:'가슴 두근거림', desc:'심장 기능이 약해진 신호입니다' },
      { icon:'😰', title:'불안·초조함', desc:'화 기운 부족은 정서 불안정으로 이어집니다' },
      { icon:'🫠', title:'수족냉증', desc:'심장의 혈액순환이 약해진 증상입니다' },
      { icon:'😓', title:'식은땀', desc:'체온 조절이 불안정해집니다' },
      { icon:'🥱', title:'기억력 저하', desc:'심장→뇌 혈액 공급 부족입니다' }
    ],
    '토': [
      { icon:'🤢', title:'소화 불량', desc:'비위 기능이 약해진 직접적 신호입니다' },
      { icon:'😮‍💨', title:'복부 팽만감', desc:'위장 소화력 저하로 가스가 차기 쉽습니다' },
      { icon:'🫧', title:'살이 잘 찌는 체질', desc:'토 기운 부족은 대사 기능 저하를 의미합니다' },
      { icon:'😵‍💫', title:'집중력 저하', desc:'비장이 약하면 사고력이 흐려집니다' },
      { icon:'🤲', title:'입술 건조·갈라짐', desc:'입술은 비위의 상태를 반영합니다' }
    ],
    '금': [
      { icon:'🤧', title:'잦은 감기·비염', desc:'폐 기능 약화로 면역력이 저하됩니다' },
      { icon:'😤', title:'피부 트러블', desc:'폐는 피부와 직결됩니다' },
      { icon:'😮‍💨', title:'호흡 곤란', desc:'폐 기능 약화로 깊은 호흡이 어렵습니다' },
      { icon:'💇', title:'건조한 피부·모발', desc:'수분 조절이 약해진 증상입니다' },
      { icon:'😢', title:'우울감·무기력', desc:'금 기운 부족은 의지력 저하를 가져옵니다' }
    ],
    '수': [
      { icon:'🫧', title:'다리 부종', desc:'신장의 수분 조절 기능이 약해진 신호' },
      { icon:'💧', title:'쉽게 붓는 얼굴', desc:'새벽에 유독 붓는다면 수 기운 부족' },
      { icon:'💆', title:'만성 피로', desc:'신장 기능 약화로 노폐물 배출 저하' },
      { icon:'🦱', title:'탈모·두피 문제', desc:'탈모는 신장 기능과 깊이 연결됩니다' },
      { icon:'🔩', title:'허리 통증', desc:'신장은 허리와 직결됩니다' }
    ]
  };
  return data[weakEl] || data['수'];
}

// ===== 장기 식단 (약한 오행 보충) =====
function getLongTermDiet(weakEl) {
  const data = {
    '목': {
      good: [
        { emoji:'🥬', name:'시금치', reason:'간 기능을 강화하는 대표 식품' },
        { emoji:'🥦', name:'브로콜리', reason:'해독 작용 + 비타민 보충' },
        { emoji:'🥑', name:'아보카도', reason:'좋은 지방으로 간 보호' },
        { emoji:'🥜', name:'견과류', reason:'간 영양 공급 + 항산화' },
        { emoji:'🍵', name:'녹차', reason:'카테킨으로 간 해독 촉진' }
      ],
      bad: [
        { name:'기름진 음식 과다', reason:'간에 직접적 부담' },
        { name:'알코올', reason:'간 해독 기능 저하' },
        { name:'인스턴트 식품', reason:'간에 독소 축적' },
        { name:'과도한 육류', reason:'간 여과 과부하' }
      ]
    },
    '화': {
      good: [
        { emoji:'🍅', name:'토마토', reason:'심장을 보호하는 리코펜 풍부' },
        { emoji:'🫐', name:'블루베리·포도', reason:'심혈관 건강 강화' },
        { emoji:'🐟', name:'연어', reason:'오메가3로 혈관 건강 유지' },
        { emoji:'🌺', name:'석류', reason:'혈액순환 개선 + 항산화' },
        { emoji:'🥬', name:'비트', reason:'혈액 생성 촉진' }
      ],
      bad: [
        { name:'찬 음식·냉수', reason:'심장의 양기 손상' },
        { name:'아이스크림', reason:'혈액순환 저해' },
        { name:'과도한 카페인', reason:'심장 부담 가중' },
        { name:'짠 음식', reason:'혈압 상승 위험' }
      ]
    },
    '토': {
      good: [
        { emoji:'🎃', name:'호박', reason:'위장을 따뜻하게 보호' },
        { emoji:'🍠', name:'고구마', reason:'소화 촉진 + 에너지 보충' },
        { emoji:'🌾', name:'현미', reason:'안정적 에너지 공급' },
        { emoji:'🍄', name:'버섯', reason:'면역력 + 소화 효소 활성화' },
        { emoji:'🫘', name:'대추', reason:'비위 기능 강화 대표 식품' }
      ],
      bad: [
        { name:'밀가루 과다', reason:'위장에 부담' },
        { name:'단 음식 과다', reason:'비장 기능 약화' },
        { name:'찬 음식', reason:'위장의 양기 손상' },
        { name:'가공식품', reason:'소화 기능 저하' }
      ]
    },
    '금': {
      good: [
        { emoji:'🍐', name:'배', reason:'폐를 윤택하게 하는 대표 과일' },
        { emoji:'🌿', name:'도라지', reason:'기관지·호흡기 강화' },
        { emoji:'🥬', name:'양배추', reason:'위·폐 점막 보호' },
        { emoji:'🌱', name:'연근', reason:'폐 기능 개선 + 식이섬유' },
        { emoji:'🧄', name:'마늘', reason:'면역력 강화 + 살균 작용' }
      ],
      bad: [
        { name:'매운 음식 과다', reason:'폐 점막 자극' },
        { name:'탄산음료', reason:'폐 기능 저하' },
        { name:'훈제식품', reason:'호흡기 부담' },
        { name:'과도한 향신료', reason:'폐열 유발' }
      ]
    },
    '수': {
      good: [
        { emoji:'🫘', name:'검은콩', reason:'신장을 보강하는 대표 식품' },
        { emoji:'🌊', name:'미역·다시마', reason:'체내 독소와 수분 균형 조절' },
        { emoji:'🫐', name:'블루베리·포도', reason:'신장 항산화 + 부종 완화' },
        { emoji:'🐟', name:'검은깨', reason:'신장과 모발 영양 공급' },
        { emoji:'🥬', name:'시금치', reason:'혈액 정화 + 신장 부담 완화' }
      ],
      bad: [
        { name:'짠 음식 과다', reason:'신장에 직접 부담' },
        { name:'알코올', reason:'신장 여과 기능 저하' },
        { name:'찬 음식·냉수', reason:'신장의 양기 손상' },
        { name:'고단백 무리한 섭취', reason:'신장 여과 과부하' }
      ]
    }
  };
  return data[weakEl] || data['수'];
}

// ===== 오늘의 운세 (재물운, 건강운, 인간관계운) =====
function getTodayFortune(saju) {
  const today = new Date();
  const todayP = getDayPillar(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const todayEl = CHEONGAN_ELEMENT[todayP.gan];
  const userEl = CHEONGAN_ELEMENT[saju.day.gan];
  const seed = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate() + saju.day.gan*7 + saju.day.ji*3;

  const gen = { '목':'화', '화':'토', '토':'금', '금':'수', '수':'목' };
  const ctrl = { '목':'토', '화':'금', '토':'수', '금':'목', '수':'화' };

  // 재물운
  let wealth = 3;
  if (todayEl === gen[userEl]) wealth = 5;
  else if (gen[todayEl] === userEl) wealth = 4;
  else if (todayEl === userEl) wealth = 3;
  else if (ctrl[todayEl] === userEl) wealth = 2;
  else wealth = 3;
  wealth = Math.max(1, Math.min(5, wealth + ((seed % 3) - 1)));

  const wealthMsgs = {
    5: '오늘은 재물운이 최고입니다! 기회가 보이면 과감하게 잡으세요.',
    4: '재물운이 좋은 편입니다. 소비보다는 투자에 유리한 날이에요.',
    3: '보통의 재물운입니다. 큰 지출은 내일로 미루세요.',
    2: '재물운이 약합니다. 충동구매를 조심하세요.',
    1: '재물운이 낮은 날입니다. 보수적인 재정 관리가 필요해요.'
  };

  // 건강운
  let health = 3;
  if (todayEl === userEl) health = 5;
  else if (gen[todayEl] === userEl) health = 4;
  else if (todayEl === gen[userEl]) health = 3;
  else if (ctrl[todayEl] === userEl) health = 2;
  else health = 3;
  health = Math.max(1, Math.min(5, health + (((seed+13) % 3) - 1)));

  const healthMsgs = {
    5: '컨디션 최상! 운동이나 활동적인 일을 하기에 좋은 날입니다.',
    4: '건강운이 좋습니다. 가벼운 산책이나 스트레칭을 추천해요.',
    3: '무난한 건강 컨디션입니다. 규칙적인 식사를 챙기세요.',
    2: '피로가 쌓이기 쉬운 날입니다. 충분한 수면이 필요해요.',
    1: '건강운이 낮습니다. 무리하지 말고 휴식을 취하세요.'
  };

  // 인간관계운
  let relation = 3;
  if (gen[userEl] === todayEl) relation = 5;
  else if (todayEl === userEl) relation = 4;
  else if (gen[todayEl] === userEl) relation = 3;
  else if (ctrl[todayEl] === userEl) relation = 2;
  else relation = 3;
  relation = Math.max(1, Math.min(5, relation + (((seed+7) % 3) - 1)));

  const relationMsgs = {
    5: '인간관계가 빛나는 날! 모임이나 만남에 적극적으로 나서세요.',
    4: '좋은 인연을 만날 수 있는 날입니다. 연락이 오면 반갑게 응하세요.',
    3: '평온한 관계 흐름입니다. 가까운 사람에게 안부를 전해보세요.',
    2: '오해가 생기기 쉬운 날입니다. 말을 아끼는 것이 좋아요.',
    1: '갈등이 생길 수 있는 날입니다. 감정적 대응을 자제하세요.'
  };

  return {
    wealth: { score: wealth, msg: wealthMsgs[wealth] },
    health: { score: health, msg: healthMsgs[health] },
    relation: { score: relation, msg: relationMsgs[relation] }
  };
}

// ===== 오늘의 대표 식재료 1가지 =====
function getTodayMainIngredient(saju) {
  const today = new Date();
  const userEl = CHEONGAN_ELEMENT[saju.day.gan];
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(),0,0)) / 86400000);

  const ingredients = {
    '목': [
      { name:'시금치', emoji:'🥬', benefit:'간 기능 강화 & 해독', color:'#4CAF7B' },
      { name:'브로콜리', emoji:'🥦', benefit:'항산화 & 비타민C 보충', color:'#4CAF7B' },
      { name:'아보카도', emoji:'🥑', benefit:'좋은 지방으로 간 보호', color:'#4CAF7B' },
      { name:'셀러리', emoji:'🌿', benefit:'혈압 조절 & 디톡스', color:'#4CAF7B' },
      { name:'케일', emoji:'🥬', benefit:'엽록소 풍부 & 해독', color:'#4CAF7B' },
      { name:'녹차', emoji:'🍵', benefit:'카테킨으로 지방 분해', color:'#4CAF7B' },
      { name:'두부', emoji:'🧈', benefit:'식물성 단백질 보충', color:'#4CAF7B' }
    ],
    '화': [
      { name:'토마토', emoji:'🍅', benefit:'심장 보호 리코펜 풍부', color:'#E85A71' },
      { name:'파프리카', emoji:'🫑', benefit:'비타민C & 항산화', color:'#E85A71' },
      { name:'석류', emoji:'🍎', benefit:'혈액순환 개선', color:'#E85A71' },
      { name:'비트', emoji:'🫒', benefit:'혈액 생성 촉진', color:'#E85A71' },
      { name:'고구마', emoji:'🍠', benefit:'베타카로틴 & 에너지', color:'#E85A71' },
      { name:'연어', emoji:'🐟', benefit:'오메가3로 혈관 건강', color:'#E85A71' },
      { name:'강황', emoji:'🌿', benefit:'항염증 & 혈액순환', color:'#E85A71' }
    ],
    '토': [
      { name:'호박', emoji:'🎃', benefit:'위장 보호 & 소화 촉진', color:'#D4A24E' },
      { name:'고구마', emoji:'🍠', benefit:'소화 촉진 & 에너지', color:'#D4A24E' },
      { name:'현미', emoji:'🌾', benefit:'안정적 에너지 공급', color:'#D4A24E' },
      { name:'당근', emoji:'🥕', benefit:'비타민A & 위장 보호', color:'#D4A24E' },
      { name:'버섯', emoji:'🍄', benefit:'면역력 & 소화효소', color:'#D4A24E' },
      { name:'감자', emoji:'🥔', benefit:'포만감 & 칼륨 보충', color:'#D4A24E' },
      { name:'달걀', emoji:'🥚', benefit:'완전 단백질 공급', color:'#D4A24E' }
    ],
    '금': [
      { name:'배', emoji:'🍐', benefit:'폐를 윤택하게 보호', color:'#7B8DA5' },
      { name:'도라지', emoji:'🌿', benefit:'기관지 & 호흡기 강화', color:'#7B8DA5' },
      { name:'양배추', emoji:'🥬', benefit:'위·폐 점막 보호', color:'#7B8DA5' },
      { name:'연근', emoji:'🌱', benefit:'폐 기능 개선', color:'#7B8DA5' },
      { name:'마늘', emoji:'🧄', benefit:'면역력 & 살균 작용', color:'#7B8DA5' },
      { name:'무', emoji:'🥕', benefit:'소화 촉진 & 폐 보호', color:'#7B8DA5' },
      { name:'은행', emoji:'🟡', benefit:'폐 기능 강화', color:'#7B8DA5' }
    ],
    '수': [
      { name:'검은콩', emoji:'🫘', benefit:'신장 보강 대표 식품', color:'#5A85B5' },
      { name:'미역', emoji:'🌊', benefit:'수분 균형 & 독소 배출', color:'#5A85B5' },
      { name:'블루베리', emoji:'🫐', benefit:'항산화 & 부종 완화', color:'#5A85B5' },
      { name:'다시마', emoji:'🌿', benefit:'미네랄 & 요오드 보충', color:'#5A85B5' },
      { name:'검은깨', emoji:'⚫', benefit:'신장·모발 영양 공급', color:'#5A85B5' },
      { name:'흑미', emoji:'🍚', benefit:'항산화 & 신장 보강', color:'#5A85B5' },
      { name:'굴', emoji:'🦪', benefit:'아연 풍부 & 면역력', color:'#5A85B5' }
    ]
  };

  const list = ingredients[userEl] || ingredients['목'];
  const idx = dayOfYear % list.length;
  return list[idx];
}

// ===== 오늘의 대표 식재료 레시피 =====
function getTodayRecipe(ingredientName) {
  const recipes = {
    '시금치': {
      title: '시금치 된장국',
      time: '20분', difficulty: '쉬움', kcal: '85kcal',
      ingredients: ['시금치 100g', '된장 1큰술', '두부 1/4모', '대파 약간', '다시마 육수 2컵'],
      steps: [
        '다시마 육수를 끓인다.',
        '된장을 풀어 넣고 잘 저어준다.',
        '두부를 깍둑썰기로 넣는다.',
        '시금치를 넣고 1~2분만 더 끓인다.',
        '대파를 송송 썰어 올린다.'
      ]
    },
    '브로콜리': {
      title: '브로콜리 달걀 볶음',
      time: '15분', difficulty: '쉬움', kcal: '120kcal',
      ingredients: ['브로콜리 1송이', '달걀 2개', '마늘 2쪽', '올리브오일 1큰술', '소금·후추 약간'],
      steps: [
        '브로콜리를 한 입 크기로 잘라 데친다.',
        '마늘을 편으로 썰어 올리브오일에 볶는다.',
        '브로콜리를 넣고 센 불에 볶는다.',
        '달걀을 풀어 넣고 스크램블한다.',
        '소금과 후추로 간을 맞춘다.'
      ]
    },
    '아보카도': {
      title: '아보카도 샐러드 보울',
      time: '10분', difficulty: '쉬움', kcal: '210kcal',
      ingredients: ['아보카도 1/2개', '방울토마토 5개', '삶은 달걀 1개', '올리브오일·레몬즙 약간'],
      steps: [
        '아보카도를 반으로 갈라 슬라이스한다.',
        '방울토마토를 반으로 자른다.',
        '삶은 달걀을 슬라이스한다.',
        '그릇에 담고 올리브오일·레몬즙을 뿌린다.',
        '소금과 후추로 마무리한다.'
      ]
    },
    '셀러리': {
      title: '셀러리 디톡스 주스',
      time: '5분', difficulty: '쉬움', kcal: '45kcal',
      ingredients: ['셀러리 3줄기', '사과 1/2개', '레몬즙 1큰술', '물 1/2컵'],
      steps: [
        '셀러리를 깨끗이 씻어 적당히 자른다.',
        '사과를 껍질째 자른다.',
        '믹서에 셀러리, 사과, 물을 넣고 갈아준다.',
        '레몬즙을 넣고 한 번 더 섞는다.',
        '체에 걸러 마신다.'
      ]
    },
    '케일': {
      title: '케일 바나나 스무디',
      time: '5분', difficulty: '쉬움', kcal: '130kcal',
      ingredients: ['케일 2장', '바나나 1개', '우유 1컵', '꿀 1작은술'],
      steps: [
        '케일을 깨끗이 씻어 줄기를 제거한다.',
        '바나나를 적당히 자른다.',
        '믹서에 케일, 바나나, 우유를 넣는다.',
        '꿀을 넣고 곱게 갈아준다.',
        '차갑게 해서 마신다.'
      ]
    },
    '녹차': {
      title: '녹차 오트밀',
      time: '10분', difficulty: '쉬움', kcal: '160kcal',
      ingredients: ['오트밀 1/2컵', '녹차 가루 1작은술', '우유 1컵', '꿀 약간', '견과류 약간'],
      steps: [
        '냄비에 우유를 따뜻하게 데운다.',
        '오트밀을 넣고 약불에서 저어준다.',
        '녹차 가루를 넣고 잘 섞는다.',
        '그릇에 담고 견과류를 올린다.',
        '꿀을 뿌려 마무리한다.'
      ]
    },
    '두부': {
      title: '두부 스테이크',
      time: '15분', difficulty: '쉬움', kcal: '150kcal',
      ingredients: ['두부 1/2모', '간장 1큰술', '올리브오일 1큰술', '깨소금·파 약간'],
      steps: [
        '두부를 1.5cm 두께로 슬라이스한다.',
        '키친타월로 수분을 제거한다.',
        '팬에 올리브오일을 두르고 중불에 굽는다.',
        '양면이 노릇하면 간장을 둘러준다.',
        '깨소금과 파를 뿌려 완성한다.'
      ]
    },
    '토마토': {
      title: '토마토 달걀 볶음',
      time: '10분', difficulty: '쉬움', kcal: '130kcal',
      ingredients: ['토마토 2개', '달걀 2개', '대파 약간', '소금·설탕 약간', '식용유 1큰술'],
      steps: [
        '토마토를 깍둑썰기한다.',
        '달걀을 풀어 소금 약간을 넣는다.',
        '팬에 기름을 두르고 달걀을 반숙으로 익힌다.',
        '토마토를 넣고 설탕 약간과 함께 볶는다.',
        '대파를 넣고 마무리한다.'
      ]
    },
    '파프리카': {
      title: '파프리카 치킨 볶음',
      time: '20분', difficulty: '보통', kcal: '180kcal',
      ingredients: ['파프리카 2개', '닭가슴살 100g', '간장 1큰술', '올리브오일 1큰술', '마늘 2쪽'],
      steps: [
        '닭가슴살을 한입 크기로 자른다.',
        '파프리카를 채 썬다.',
        '팬에 올리브오일과 마늘을 볶는다.',
        '닭가슴살을 넣고 익힌다.',
        '파프리카와 간장을 넣고 볶아 마무리한다.'
      ]
    },
    '석류': {
      title: '석류 요거트 볼',
      time: '5분', difficulty: '쉬움', kcal: '140kcal',
      ingredients: ['석류 알맹이 1/2컵', '그릭요거트 1컵', '그래놀라 약간', '꿀 1작은술'],
      steps: [
        '그릇에 그릭요거트를 담는다.',
        '석류 알맹이를 올린다.',
        '그래놀라를 뿌린다.',
        '꿀을 가볍게 뿌린다.',
        '바로 먹는다.'
      ]
    },
    '비트': {
      title: '비트 샐러드',
      time: '15분', difficulty: '쉬움', kcal: '95kcal',
      ingredients: ['비트 1개', '양상추', '페타치즈 약간', '발사믹 드레싱'],
      steps: [
        '비트를 삶아 슬라이스한다.',
        '양상추를 한 입 크기로 뜯는다.',
        '그릇에 양상추와 비트를 담는다.',
        '페타치즈를 부수어 올린다.',
        '발사믹 드레싱을 뿌린다.'
      ]
    },
    '고구마': {
      title: '군고구마 샐러드',
      time: '30분', difficulty: '보통', kcal: '180kcal',
      ingredients: ['고구마 1개', '양상추', '삶은 달걀 1개', '드레싱 약간'],
      steps: [
        '고구마를 깨끗이 씻어 에어프라이어에 굽는다.',
        '구운 고구마를 한 입 크기로 자른다.',
        '양상추를 깔고 고구마를 올린다.',
        '삶은 달걀을 슬라이스하여 올린다.',
        '드레싱을 뿌려 마무리한다.'
      ]
    },
    '연어': {
      title: '연어 포케 보울',
      time: '15분', difficulty: '보통', kcal: '320kcal',
      ingredients: ['연어 회 100g', '밥 1/2공기', '아보카도', '간장·와사비 약간'],
      steps: [
        '밥을 그릇에 담는다.',
        '연어를 먹기 좋게 슬라이스한다.',
        '아보카도를 슬라이스한다.',
        '밥 위에 연어, 아보카도를 올린다.',
        '간장 와사비 소스를 뿌린다.'
      ]
    },
    '강황': {
      title: '강황 라떼 (골든밀크)',
      time: '5분', difficulty: '쉬움', kcal: '90kcal',
      ingredients: ['우유 1컵', '강황 가루 1/2작은술', '꿀 1작은술', '시나몬 약간'],
      steps: [
        '우유를 냄비에 넣고 약불로 데운다.',
        '강황 가루를 넣고 잘 저어준다.',
        '시나몬을 약간 넣는다.',
        '컵에 따르고 꿀을 넣는다.',
        '잘 저어서 따뜻하게 마신다.'
      ]
    },
    '호박': {
      title: '호박죽',
      time: '30분', difficulty: '보통', kcal: '120kcal',
      ingredients: ['단호박 1/4개', '찹쌀가루 2큰술', '소금 약간', '물 2컵'],
      steps: [
        '단호박을 쪄서 껍질을 벗긴다.',
        '호박을 으깨고 물을 넣어 끓인다.',
        '찹쌀가루를 물에 풀어 넣는다.',
        '약불에서 저으며 걸쭉하게 끓인다.',
        '소금으로 간을 맞춘다.'
      ]
    },
    '현미': {
      title: '현미 야채 볶음밥',
      time: '15분', difficulty: '쉬움', kcal: '250kcal',
      ingredients: ['현미밥 1공기', '당근·양파 약간', '달걀 1개', '간장 1큰술'],
      steps: [
        '당근과 양파를 잘게 다진다.',
        '팬에 기름을 두르고 야채를 볶는다.',
        '현미밥을 넣고 함께 볶는다.',
        '달걀을 넣고 스크램블한다.',
        '간장으로 간을 맞추고 마무리한다.'
      ]
    },
    '당근': {
      title: '당근 라페',
      time: '10분', difficulty: '쉬움', kcal: '80kcal',
      ingredients: ['당근 2개', '레몬즙 2큰술', '올리브오일 1큰술', '파슬리 약간'],
      steps: [
        '당근을 채칼로 가늘게 채 썬다.',
        '볼에 담고 레몬즙을 넣는다.',
        '올리브오일을 넣고 버무린다.',
        '소금·후추로 간을 맞춘다.',
        '파슬리를 뿌려 완성한다.'
      ]
    },
    '버섯': {
      title: '버섯 크림 수프',
      time: '20분', difficulty: '보통', kcal: '150kcal',
      ingredients: ['양송이버섯 6개', '양파 1/2개', '우유 1컵', '버터 1큰술'],
      steps: [
        '버섯과 양파를 얇게 슬라이스한다.',
        '버터를 녹이고 양파를 볶는다.',
        '버섯을 넣고 함께 볶는다.',
        '우유를 넣고 끓인 뒤 블렌더로 갈아준다.',
        '소금·후추로 간을 맞춘다.'
      ]
    },
    '감자': {
      title: '감자 수프',
      time: '25분', difficulty: '보통', kcal: '160kcal',
      ingredients: ['감자 2개', '양파 1/2개', '우유 1컵', '버터 약간'],
      steps: [
        '감자와 양파를 깍둑썰기한다.',
        '냄비에 버터를 녹이고 양파를 볶는다.',
        '감자와 물을 넣고 감자가 무를 때까지 끓인다.',
        '우유를 넣고 블렌더로 갈아준다.',
        '소금·후추로 간을 맞춘다.'
      ]
    },
    '달걀': {
      title: '달걀 야채 덮밥',
      time: '10분', difficulty: '쉬움', kcal: '280kcal',
      ingredients: ['달걀 2개', '밥 1공기', '양파·당근 약간', '간장 1큰술'],
      steps: [
        '양파와 당근을 채 썬다.',
        '팬에 기름을 두르고 야채를 볶는다.',
        '물과 간장을 넣고 끓인다.',
        '달걀을 풀어 넣고 반숙으로 익힌다.',
        '밥 위에 올려 완성한다.'
      ]
    },
    '배': {
      title: '배 꿀 찜',
      time: '30분', difficulty: '쉬움', kcal: '100kcal',
      ingredients: ['배 1개', '꿀 2큰술', '대추 2개', '생강 약간'],
      steps: [
        '배 윗부분을 잘라 뚜껑을 만든다.',
        '배 속을 파내고 꿀, 대추, 생강을 넣는다.',
        '뚜껑을 덮고 찜기에 올린다.',
        '중불에서 25~30분 찐다.',
        '따뜻하게 먹는다.'
      ]
    },
    '도라지': {
      title: '도라지 생채',
      time: '15분', difficulty: '쉬움', kcal: '60kcal',
      ingredients: ['도라지 100g', '고추장 1큰술', '참기름·깨소금 약간', '식초 1작은술'],
      steps: [
        '도라지를 가늘게 찢어 소금물에 담근다.',
        '쓴맛이 빠지면 물기를 짠다.',
        '고추장, 식초, 참기름을 넣고 무친다.',
        '깨소금을 뿌린다.',
        '밥과 함께 먹는다.'
      ]
    },
    '양배추': {
      title: '양배추 쌈밥',
      time: '15분', difficulty: '쉬움', kcal: '200kcal',
      ingredients: ['양배추 잎 6장', '밥 1공기', '쌈장', '파프리카 약간'],
      steps: [
        '양배추 잎을 끓는 물에 살짝 데친다.',
        '찬물에 식혀 물기를 제거한다.',
        '양배추 잎에 밥을 올린다.',
        '쌈장과 파프리카를 올린다.',
        '돌돌 말아서 먹는다.'
      ]
    },
    '연근': {
      title: '연근 조림',
      time: '25분', difficulty: '보통', kcal: '130kcal',
      ingredients: ['연근 200g', '간장 2큰술', '물엿 1큰술', '참기름 약간'],
      steps: [
        '연근을 동그랗게 슬라이스한다.',
        '식초물에 담가 아린 맛을 뺀다.',
        '냄비에 간장, 물엿, 물을 넣고 끓인다.',
        '연근을 넣고 약불에서 조린다.',
        '참기름을 넣고 마무리한다.'
      ]
    },
    '마늘': {
      title: '마늘 볶음밥',
      time: '10분', difficulty: '쉬움', kcal: '270kcal',
      ingredients: ['밥 1공기', '마늘 5쪽', '달걀 1개', '버터 1큰술', '간장 약간'],
      steps: [
        '마늘을 편으로 썬다.',
        '팬에 버터를 녹이고 마늘을 볶는다.',
        '밥을 넣고 함께 볶는다.',
        '간장으로 간을 맞춘다.',
        '달걀 프라이를 올려 완성한다.'
      ]
    },
    '무': {
      title: '무 맑은국',
      time: '20분', difficulty: '쉬움', kcal: '35kcal',
      ingredients: ['무 1/4개', '국간장 1큰술', '다시마 육수 3컵', '대파 약간'],
      steps: [
        '무를 나박썰기한다.',
        '다시마 육수에 무를 넣고 끓인다.',
        '무가 투명해지면 국간장으로 간을 맞춘다.',
        '대파를 넣는다.',
        '한소끔 더 끓여 마무리한다.'
      ]
    },
    '은행': {
      title: '은행 볶음',
      time: '10분', difficulty: '쉬움', kcal: '100kcal',
      ingredients: ['은행 30알', '소금 약간', '올리브오일 1큰술'],
      steps: [
        '은행 껍질을 벗긴다.',
        '팬에 올리브오일을 두른다.',
        '약불에서 은행을 천천히 볶는다.',
        '소금을 살짝 뿌린다.',
        '간식으로 먹는다. (하루 10알 이내 권장)'
      ]
    },
    '검은콩': {
      title: '검은콩 밥',
      time: '40분', difficulty: '쉬움', kcal: '300kcal',
      ingredients: ['쌀 1컵', '검은콩 1/4컵', '물 적량'],
      steps: [
        '검은콩을 3시간 이상 불린다.',
        '쌀을 씻어 30분간 불린다.',
        '밥솥에 쌀과 검은콩을 넣는다.',
        '물을 맞추고 밥을 짓는다.',
        '뜸을 들이고 골고루 섞는다.'
      ]
    },
    '미역': {
      title: '미역 오이 냉국',
      time: '15분', difficulty: '쉬움', kcal: '45kcal',
      ingredients: ['건미역 10g', '오이 1/2개', '식초 2큰술', '간장 1큰술', '냉수 2컵'],
      steps: [
        '미역을 물에 불려 적당히 자른다.',
        '오이를 얇게 슬라이스한다.',
        '냉수에 식초, 간장을 넣어 육수를 만든다.',
        '미역과 오이를 넣는다.',
        '차갑게 해서 먹는다.'
      ]
    },
    '블루베리': {
      title: '블루베리 스무디',
      time: '5분', difficulty: '쉬움', kcal: '140kcal',
      ingredients: ['블루베리 1컵', '바나나 1/2개', '우유 1컵', '꿀 약간'],
      steps: [
        '블루베리와 바나나를 믹서에 넣는다.',
        '우유를 붓는다.',
        '꿀을 넣는다.',
        '곱게 갈아준다.',
        '차갑게 해서 마신다.'
      ]
    },
    '다시마': {
      title: '다시마 무침',
      time: '10분', difficulty: '쉬움', kcal: '30kcal',
      ingredients: ['다시마 50g', '참기름 1큰술', '깨소금 약간', '간장 1작은술'],
      steps: [
        '다시마를 물에 불린 뒤 채 썬다.',
        '끓는 물에 살짝 데친다.',
        '찬물에 식힌다.',
        '간장, 참기름, 깨소금으로 무친다.',
        '반찬으로 먹는다.'
      ]
    },
    '검은깨': {
      title: '검은깨 두유',
      time: '10분', difficulty: '쉬움', kcal: '120kcal',
      ingredients: ['검은깨 2큰술', '두유 1컵', '꿀 1작은술'],
      steps: [
        '검은깨를 믹서에 넣는다.',
        '두유를 붓는다.',
        '곱게 갈아준다.',
        '꿀을 넣고 잘 섞는다.',
        '따뜻하게 또는 차갑게 마신다.'
      ]
    },
    '흑미': {
      title: '흑미 밥',
      time: '40분', difficulty: '쉬움', kcal: '310kcal',
      ingredients: ['쌀 1컵', '흑미 1/4컵', '물 적량'],
      steps: [
        '흑미를 3시간 이상 불린다.',
        '쌀을 씻어 30분 불린다.',
        '밥솥에 쌀과 흑미를 넣는다.',
        '물을 맞추고 밥을 짓는다.',
        '뜸을 들이고 골고루 섞는다.'
      ]
    },
    '굴': {
      title: '굴 미역국',
      time: '25분', difficulty: '보통', kcal: '80kcal',
      ingredients: ['굴 100g', '건미역 10g', '국간장 1큰술', '참기름 1큰술'],
      steps: [
        '미역을 물에 불려 적당히 자른다.',
        '냄비에 참기름을 두르고 미역을 볶는다.',
        '물을 넣고 끓인다.',
        '굴을 넣고 2~3분 더 끓인다.',
        '국간장으로 간을 맞춘다.'
      ]
    }
  };
  return recipes[ingredientName] || null;
}

// ===== 오행 점수 변환 =====
function getElementScores(saju) {
  const el = analyzeElements(saju);
  const labels = { '목':'간·담', '화':'심장', '토':'비·위', '금':'폐·장', '수':'신장' };
  const scores = {};
  for (const [k, v] of Object.entries(el)) {
    const score = Math.min(v * 20, 100);
    let status;
    if (v === 0) status = '매우 약함';
    else if (v === 1) status = '약함';
    else if (v === 2) status = '보통';
    else if (v === 3) status = '강함';
    else status = '매우 강함';
    scores[k] = { count: v, score, status, organ: labels[k], isWeak: v <= 1, isStrong: v >= 3 };
  }
  return scores;
}
