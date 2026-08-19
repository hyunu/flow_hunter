function Chevron({ x, y, color = "#1a8f7c" }: { x: number; y: number; color?: string }) {
  return <polygon points={`${x},${y - 8} ${x},${y + 8} ${x + 16},${y}`} fill={color} />;
}

export function FigFlow() {
  return (
    <svg viewBox="0 0 720 150" role="img" aria-label="분석이 진행되는 순서">
      <rect width="720" height="150" fill="#f7f9fc" />
      {[
        { x: 20, t: "1. 종목 고르기", s: "코스피·코스닥·ETF" },
        { x: 195, t: "2. 차트 먼저", s: "가격·거래량·점수" },
        { x: 370, t: "3. 결과 붙이기", s: "이벤트·백테스트" },
        { x: 545, t: "4. 숙제 검사", s: "평가 리포트" },
      ].map((item, i) => (
        <g key={item.t}>
          <rect x={item.x} y="28" width="155" height="88" rx="10" fill="#fff" stroke="#1a8f7c" strokeWidth="2" />
          <text x={item.x + 78} y="64" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1a2333">
            {item.t}
          </text>
          <text x={item.x + 78} y="90" textAnchor="middle" fontSize="12" fill="#4a5a72">
            {item.s}
          </text>
          {i < 3 ? <Chevron x={item.x + 157} y={72} /> : null}
        </g>
      ))}
    </svg>
  );
}

export function FigChart() {
  return (
    <svg viewBox="0 0 720 280" role="img" aria-label="차트 세 칸의 구조">
      <rect width="720" height="280" fill="#f7f9fc" />
      <text x="20" y="22" fontSize="13" fill="#4a5a72">
        같은 날짜가 위아래로 맞춰져 있습니다
      </text>
      <rect x="20" y="36" width="680" height="118" rx="8" fill="#fff" stroke="#c5cedb" />
      <text x="36" y="58" fontSize="12" fontWeight="700" fill="#1a2333">
        위 · 주가
      </text>
      <polyline
        fill="none"
        stroke="#2a8f6a"
        strokeWidth="2"
        points="50,120 120,110 190,95 280,100 360,78 450,70 540,88 640,60"
      />
      <text x="560" y="56" fontSize="11" fill="#4a5a72">
        노랑 20 · 주황 60 · 파랑 120
      </text>
      <rect x="20" y="162" width="680" height="48" rx="8" fill="#fff" stroke="#c5cedb" />
      <text x="36" y="182" fontSize="12" fontWeight="700" fill="#1a2333">
        가운데 · 거래량
      </text>
      <rect x="80" y="188" width="10" height="14" fill="#7aa0c4" />
      <rect x="120" y="180" width="10" height="22" fill="#7aa0c4" />
      <rect x="160" y="172" width="10" height="30" fill="#1a8f7c" />
      <rect x="200" y="186" width="10" height="16" fill="#7aa0c4" />
      <text x="240" y="196" fontSize="11" fill="#4a5a72">
        막대가 높을수록 그날 거래가 많음
      </text>
      <rect x="20" y="218" width="680" height="48" rx="8" fill="#fff" stroke="#c5cedb" />
      <text x="36" y="238" fontSize="12" fontWeight="700" fill="#1a2333">
        아래 · Score
      </text>
      <rect x="80" y="244" width="10" height="14" fill="#9bb8c4" />
      <rect x="120" y="238" width="10" height="20" fill="#2ab8a4" />
      <rect x="160" y="230" width="10" height="28" fill="#4ee0c6" />
      <text x="240" y="252" fontSize="11" fill="#4a5a72">
        밝은 청록 = 점수가 특히 높은 날
      </text>
    </svg>
  );
}

export function FigScoreRecipe() {
  return (
    <svg viewBox="0 0 720 268" role="img" aria-label="점수를 만드는 순서">
      <rect width="720" height="268" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        점수는 한 방이 아니라, 힌트 7개를 섞어 만듭니다
      </text>
      {[
        { x: 16, t: "1. 일봉만", s: "그날과 그 전" },
        { x: 186, t: "2. 힌트 7개", s: "각자 0~100점" },
        { x: 356, t: "3. 비중 맞춰 섞기", s: "중요한 힌트가 더 큼" },
        { x: 526, t: "4. 천장 씌우기", s: "힌트 적으면 만점 금지" },
      ].map((item, i) => (
        <g key={item.t}>
          <rect x={item.x} y="38" width="154" height="64" rx="10" fill="#fff" stroke="#1a8f7c" strokeWidth="2" />
          <text x={item.x + 77} y="64" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a2333">
            {item.t}
          </text>
          <text x={item.x + 77} y="84" textAnchor="middle" fontSize="12" fill="#4a5a72">
            {item.s}
          </text>
          {i < 3 ? <Chevron x={item.x + 156} y={70} /> : null}
        </g>
      ))}
      <text x="20" y="128" fontSize="12" fill="#4a5a72">
        섞을 때 쓰는 비중. 거래량·대금·가격·거래가 절반 이상입니다.
      </text>
      {[
        { x: 16, t: "거래량 20%" },
        { x: 114, t: "대금 20%" },
        { x: 212, t: "가격·거래 20%" },
        { x: 310, t: "매집 15%" },
        { x: 408, t: "수급 10%" },
        { x: 506, t: "추세 10%" },
        { x: 604, t: "시장 5%" },
      ].map((chip) => (
        <g key={chip.t}>
          <rect x={chip.x} y="140" width="92" height="36" rx="6" fill="#1a8f7c" />
          <text x={chip.x + 46} y="163" textAnchor="middle" fontSize="11" fill="#fff">
            {chip.t}
          </text>
        </g>
      ))}
      <rect x="16" y="194" width="214" height="54" rx="8" fill="#fff" stroke="#c5cedb" />
      <text x="123" y="216" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a2333">
        힌트 1종류만
      </text>
      <text x="123" y="236" textAnchor="middle" fontSize="12" fill="#4a5a72">
        최대 55점
      </text>
      <Chevron x={236} y={221} />
      <rect x="258" y="194" width="214" height="54" rx="8" fill="#fff" stroke="#c5cedb" />
      <text x="365" y="216" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a2333">
        힌트 2종류
      </text>
      <text x="365" y="236" textAnchor="middle" fontSize="12" fill="#4a5a72">
        최대 75점
      </text>
      <Chevron x={478} y={221} />
      <rect x="500" y="194" width="204" height="54" rx="8" fill="#1a8f7c" />
      <text x="602" y="216" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        힌트 3종류 이상
      </text>
      <text x="602" y="236" textAnchor="middle" fontSize="12" fill="#e7f7f3">
        100점까지 가능
      </text>
    </svg>
  );
}

export function FigScore() {
  return (
    <svg viewBox="0 0 720 130" role="img" aria-label="Smart Money Score 구간">
      <rect width="720" height="130" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        Smart Money Score 자 한 줄
      </text>
      <rect x="20" y="44" width="200" height="28" fill="#d5dde8" />
      <rect x="220" y="44" width="250" height="28" fill="#7ec9bb" />
      <rect x="470" y="44" width="230" height="28" fill="#1a8f7c" />
      <text x="120" y="63" textAnchor="middle" fontSize="12" fill="#1a2333">
        0–40 평소
      </text>
      <text x="345" y="63" textAnchor="middle" fontSize="12" fill="#1a2333">
        40–70 눈여겨봄
      </text>
      <text x="585" y="63" textAnchor="middle" fontSize="12" fill="#fff">
        70–100 아주 특이
      </text>
      <text x="20" y="96" fontSize="12" fill="#4a5a72">
        높다고 무조건 「좋다」가 아닙니다. 큰돈이 사는 날일 수도, 파는 날일 수도 있습니다.
      </text>
      <text x="20" y="116" fontSize="12" fill="#4a5a72">
        Confidence가 낮으면, 점수가 높아도 「증거가 약하다」로 읽습니다.
      </text>
    </svg>
  );
}

export function FigStates() {
  return (
    <svg viewBox="0 0 720 168" role="img" aria-label="상태가 이어질 수 있는 이야기">
      <rect width="720" height="168" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        자주 보는 이야기의 순서 (항상 이렇게 가지는 않습니다)
      </text>
      {[
        { x: 16, c: "#4aa3d9", t: "매집 시작" },
        { x: 132, c: "#2b7fbf", t: "매집" },
        { x: 248, c: "#f0c14b", t: "강한 개입" },
        { x: 364, c: "#3dcf9a", t: "돌파" },
        { x: 480, c: "#ff5d73", t: "분산" },
        { x: 596, c: "#6b7c93", t: "이탈" },
      ].map((item, i) => (
        <g key={item.t}>
          <circle cx={item.x + 44} cy="78" r="22" fill={item.c} />
          <text x={item.x + 44} y="122" textAnchor="middle" fontSize="12" fill="#1a2333">
            {item.t}
          </text>
          {i < 5 ? <Chevron x={item.x + 72} y={78} color="#8b9cb3" /> : null}
        </g>
      ))}
      <text x="20" y="150" fontSize="12" fill="#4a5a72">
        가운데를 건너뛰거나, 돌파 없이 끝나기도 합니다. 「세력이 한다」가 아니라 「그런 모양」입니다.
      </text>
    </svg>
  );
}

type Bar = { o: number; h: number; l: number; c: number; v: number };

function priceY(p: number, y: number, h: number, pMin: number, pMax: number) {
  return y + (1 - (p - pMin) / (pMax - pMin)) * h;
}

function CandleStrip({
  x,
  y,
  w,
  h,
  bars,
  volH = 26,
  guides = [],
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  bars: Bar[];
  volH?: number;
  guides?: { p: number; label: string; color?: string }[];
}) {
  const pMin = Math.min(...bars.map((b) => b.l)) - 2;
  const pMax = Math.max(...bars.map((b) => b.h)) + 2;
  const priceH = h - volH - 6;
  const py = (p: number) => priceY(p, y, priceH, pMin, pMax);
  const vMax = Math.max(...bars.map((b) => b.v), 1);
  const slot = w / bars.length;
  return (
    <g>
      {guides.map((g) => (
        <g key={g.label}>
          <line
            x1={x}
            y1={py(g.p)}
            x2={x + w}
            y2={py(g.p)}
            stroke={g.color ?? "#8b9cb3"}
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x={x + 4} y={py(g.p) - 3} fontSize="10" fill={g.color ?? "#8b9cb3"}>
            {g.label}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = x + i * slot + slot / 2;
        const up = b.c >= b.o;
        const color = up ? "#2a8f6a" : "#c45c5c";
        const top = py(Math.max(b.o, b.c));
        const bot = py(Math.min(b.o, b.c));
        const bodyH = Math.max(bot - top, 2);
        const vh = (b.v / vMax) * volH;
        return (
          <g key={i}>
            <line x1={cx} y1={py(b.h)} x2={cx} y2={py(b.l)} stroke={color} strokeWidth="1.4" />
            <rect x={cx - 3.5} y={top} width="7" height={bodyH} fill={color} />
            <rect
              x={cx - 3.5}
              y={y + priceH + 6 + (volH - vh)}
              width="7"
              height={vh}
              fill={b.v >= vMax * 0.75 ? "#1a8f7c" : "#b7c4d4"}
            />
          </g>
        );
      })}
    </g>
  );
}

function StateCard({
  x,
  y,
  title,
  color,
  bars,
  guides,
  why,
}: {
  x: number;
  y: number;
  title: string;
  color: string;
  bars: Bar[];
  guides?: { p: number; label: string; color?: string }[];
  why: [string, string];
}) {
  return (
    <g>
      <rect x={x} y={y} width="228" height="196" rx="10" fill="#fff" stroke={color} strokeWidth="2" />
      <rect x={x} y={y} width="8" height="196" rx="4" fill={color} />
      <text x={x + 18} y={y + 20} fontSize="13" fontWeight="700" fill="#1a2333">
        {title}
      </text>
      <CandleStrip x={x + 14} y={y + 28} w={198} h={112} bars={bars} guides={guides} />
      <text x={x + 14} y={y + 168} fontSize="11" fill="#4a5a72">
        {why[0]}
      </text>
      <text x={x + 14} y={y + 184} fontSize="11" fill="#4a5a72">
        {why[1]}
      </text>
    </g>
  );
}

export function FigStateStory() {
  const xs = [40, 90, 140, 190, 250, 310, 370, 430, 490, 550, 610, 670];
  const ys = [118, 114, 120, 110, 116, 88, 62, 58, 70, 66, 78, 82];
  const line = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox="0 0 720 210" role="img" aria-label="한 종목이 상태를 지나가는 주가 모양">
      <rect width="720" height="210" fill="#f7f9fc" />
      <text x="20" y="22" fontSize="13" fontWeight="700" fill="#1a2333">
        한 줄로 보는 「그럴 법한」 주가 이야기 (교과서 그림이지, 매번 이렇게 가진 않습니다)
      </text>
      {[
        { x: 28, w: 150, c: "#d9eaf6", t: "매집" },
        { x: 178, w: 70, c: "#f8e9b8", t: "개입" },
        { x: 248, w: 150, c: "#d4f3e6", t: "돌파" },
        { x: 398, w: 160, c: "#fde0e4", t: "분산" },
        { x: 558, w: 134, c: "#e4e8ee", t: "이탈" },
      ].map((b) => (
        <g key={b.t}>
          <rect x={b.x} y="36" width={b.w} height="108" fill={b.c} />
          <text x={b.x + b.w / 2} y="54" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a2333">
            {b.t}
          </text>
        </g>
      ))}
      <line x1="36" y1="100" x2="170" y2="100" stroke="#2b7fbf" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="40" y="94" fontSize="10" fill="#2b7fbf">
        박스 천장
      </text>
      <polyline fill="none" stroke="#1a2333" strokeWidth="2.4" points={line} />
      {[8, 10, 14, 32, 16, 22, 28, 24, 34, 30, 12, 8].map((h, i) => (
        <rect
          key={i}
          x={xs[i] - 5}
          y={168 - h}
          width="10"
          height={h}
          fill={h >= 28 ? "#1a8f7c" : "#b7c4d4"}
        />
      ))}
      <text x="20" y="196" fontSize="11" fill="#4a5a72">
        아래 막대는 거래량. 매집 때는 가격이 갇히고, 돌파 때 위로 열리며, 분산 때는 고점에서 거래만 많습니다.
      </text>
    </svg>
  );
}

export function FigStatePhysics() {
  return (
    <svg viewBox="0 0 720 188" role="img" aria-label="매집 돌파 분산이 나오는 힘의 균형">
      <rect width="720" height="188" fill="#f7f9fc" />
      <text x="20" y="22" fontSize="13" fontWeight="700" fill="#1a2333">
        왜 그런 모양이 나오나 — 사려는 힘과 팔려는 힘
      </text>
      <g>
        <rect x="16" y="36" width="224" height="136" rx="10" fill="#fff" stroke="#2b7fbf" strokeWidth="2" />
        <text x="128" y="58" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2b7fbf">
          매집
        </text>
        <text x="128" y="78" textAnchor="middle" fontSize="11" fill="#4a5a72">
          팔려는 물량을 받아 줌
        </text>
        <polygon points="70,118 86,96 54,96" fill="#c45c5c" />
        <text x="70" y="134" textAnchor="middle" fontSize="10" fill="#c45c5c">
          팔자
        </text>
        <polygon points="186,96 202,118 170,118" fill="#2a8f6a" />
        <text x="186" y="136" textAnchor="middle" fontSize="10" fill="#2a8f6a">
          큰 매수
        </text>
        <line x1="36" y1="150" x2="220" y2="150" stroke="#1a2333" strokeWidth="3" />
        <text x="128" y="166" textAnchor="middle" fontSize="11" fill="#1a2333">
          힘 비슷 → 가격은 박스
        </text>
      </g>
      <g>
        <rect x="248" y="36" width="224" height="136" rx="10" fill="#fff" stroke="#3dcf9a" strokeWidth="2" />
        <text x="360" y="58" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a8f7c">
          돌파
        </text>
        <text x="360" y="78" textAnchor="middle" fontSize="11" fill="#4a5a72">
          받아 줄 매물이 줄어듦
        </text>
        <line x1="268" y1="128" x2="420" y2="128" stroke="#8b9cb3" strokeWidth="2" strokeDasharray="5 4" />
        <polygon points="360,86 376,118 344,118" fill="#3dcf9a" />
        <text x="360" y="150" textAnchor="middle" fontSize="11" fill="#1a2333">
          조금만 사도 천장 붕괴
        </text>
        <text x="360" y="166" textAnchor="middle" fontSize="11" fill="#4a5a72">
          주가가 박스를 위로 뚫음
        </text>
      </g>
      <g>
        <rect x="480" y="36" width="224" height="136" rx="10" fill="#fff" stroke="#ff5d73" strokeWidth="2" />
        <text x="592" y="58" textAnchor="middle" fontSize="13" fontWeight="700" fill="#d6455c">
          분산
        </text>
        <text x="592" y="78" textAnchor="middle" fontSize="11" fill="#4a5a72">
          추격 매수에게 넘김
        </text>
        <polygon points="540,100 556,124 524,124" fill="#2a8f6a" />
        <text x="540" y="142" textAnchor="middle" fontSize="10" fill="#2a8f6a">
          사자는 사람
        </text>
        <polygon points="644,124 660,100 628,100" fill="#c45c5c" />
        <text x="644" y="90" textAnchor="middle" fontSize="10" fill="#c45c5c">
          큰 매도
        </text>
        <line x1="500" y1="150" x2="684" y2="150" stroke="#1a2333" strokeWidth="3" />
        <text x="592" y="166" textAnchor="middle" fontSize="11" fill="#1a2333">
          거래는 많은데 가격은 힘없음
        </text>
      </g>
    </svg>
  );
}

const ACCUM_START: Bar[] = [
  { o: 52, h: 54, l: 48, c: 49, v: 8 },
  { o: 49, h: 51, l: 46, c: 47, v: 9 },
  { o: 47, h: 50, l: 45, c: 48, v: 11 },
  { o: 48, h: 51, l: 46, c: 47, v: 14 },
  { o: 47, h: 50, l: 45, c: 49, v: 16 },
  { o: 49, h: 52, l: 47, c: 48, v: 18 },
  { o: 48, h: 51, l: 46, c: 50, v: 17 },
  { o: 50, h: 52, l: 47, c: 49, v: 19 },
];

const ACCUM: Bar[] = [
  { o: 48, h: 52, l: 46, c: 50, v: 16 },
  { o: 50, h: 53, l: 47, c: 49, v: 18 },
  { o: 49, h: 52, l: 46, c: 51, v: 17 },
  { o: 51, h: 53, l: 48, c: 50, v: 19 },
  { o: 50, h: 54, l: 47, c: 49, v: 20 },
  { o: 49, h: 52, l: 46, c: 50, v: 18 },
  { o: 50, h: 53, l: 47, c: 51, v: 21 },
  { o: 51, h: 54, l: 48, c: 50, v: 19 },
  { o: 50, h: 53, l: 47, c: 49, v: 18 },
  { o: 49, h: 52, l: 46, c: 50, v: 20 },
];

const INTERVENE: Bar[] = [
  { o: 48, h: 51, l: 46, c: 49, v: 10 },
  { o: 49, h: 52, l: 47, c: 50, v: 11 },
  { o: 50, h: 52, l: 48, c: 49, v: 9 },
  { o: 49, h: 51, l: 47, c: 48, v: 12 },
  { o: 48, h: 62, l: 47, c: 58, v: 36 },
  { o: 58, h: 61, l: 54, c: 56, v: 22 },
  { o: 56, h: 59, l: 53, c: 55, v: 16 },
];

const BREAKOUT: Bar[] = [
  { o: 48, h: 53, l: 46, c: 50, v: 14 },
  { o: 50, h: 54, l: 47, c: 51, v: 15 },
  { o: 51, h: 54, l: 48, c: 49, v: 13 },
  { o: 49, h: 53, l: 47, c: 52, v: 16 },
  { o: 52, h: 54, l: 49, c: 51, v: 14 },
  { o: 51, h: 64, l: 50, c: 62, v: 32 },
  { o: 62, h: 70, l: 60, c: 68, v: 28 },
  { o: 68, h: 72, l: 64, c: 69, v: 20 },
];

const DISTRIB: Bar[] = [
  { o: 68, h: 74, l: 66, c: 72, v: 18 },
  { o: 72, h: 76, l: 70, c: 71, v: 24 },
  { o: 71, h: 75, l: 68, c: 69, v: 26 },
  { o: 69, h: 73, l: 67, c: 72, v: 22 },
  { o: 72, h: 74, l: 66, c: 67, v: 28 },
  { o: 67, h: 71, l: 64, c: 66, v: 25 },
  { o: 66, h: 70, l: 63, c: 64, v: 20 },
];

const EXIT: Bar[] = [
  { o: 64, h: 68, l: 62, c: 63, v: 18 },
  { o: 63, h: 65, l: 60, c: 61, v: 12 },
  { o: 61, h: 63, l: 58, c: 60, v: 8 },
  { o: 60, h: 62, l: 57, c: 58, v: 7 },
  { o: 58, h: 60, l: 56, c: 57, v: 6 },
  { o: 57, h: 59, l: 55, c: 56, v: 5 },
  { o: 56, h: 58, l: 54, c: 55, v: 5 },
];

export function FigStateGalleryA() {
  return (
    <svg viewBox="0 0 720 212" role="img" aria-label="매집과 개입의 주가 모양">
      <rect width="720" height="212" fill="#f7f9fc" />
      <StateCard
        x={12}
        y={8}
        title="매집 시작"
        color="#4aa3d9"
        bars={ACCUM_START}
        why={["살짝 빠지다 멈추고", "거래만 조금 늘기 시작"]}
      />
      <StateCard
        x={246}
        y={8}
        title="매집"
        color="#2b7fbf"
        bars={ACCUM}
        guides={[{ p: 54, label: "천장", color: "#2b7fbf" }]}
        why={["며칠째 같은 박스", "거래는 평소보다 조금 많음"]}
      />
      <StateCard
        x={480}
        y={8}
        title="강한 개입"
        color="#f0c14b"
        bars={INTERVENE}
        why={["하루에 거래·대금이 확", "가격 출렁임이 커짐"]}
      />
    </svg>
  );
}

export function FigStateGalleryB() {
  return (
    <svg viewBox="0 0 720 212" role="img" aria-label="돌파 분산 이탈의 주가 모양">
      <rect width="720" height="212" fill="#f7f9fc" />
      <StateCard
        x={12}
        y={8}
        title="돌파"
        color="#3dcf9a"
        bars={BREAKOUT}
        guides={[{ p: 54, label: "옛 천장", color: "#3dcf9a" }]}
        why={["박스를 거래와 함께 상향", "그 전 매집·개입이 있었음"]}
      />
      <StateCard
        x={246}
        y={8}
        title="분산"
        color="#ff5d73"
        bars={DISTRIB}
        why={["이미 높은 자리", "거래 많은데 잘 못 오름"]}
      />
      <StateCard
        x={480}
        y={8}
        title="이탈"
        color="#6b7c93"
        bars={EXIT}
        why={["거래가 빠르게 줄어듦", "캔들도 작아짐"]}
      />
    </svg>
  );
}

export function FigQuietVolume() {
  return (
    <svg viewBox="0 0 720 150" role="img" aria-label="가격은 조용한데 거래량만 큰 날">
      <rect width="720" height="150" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        가격은 별로 안 움직이는데 거래만 많은 날
      </text>
      <text x="40" y="52" fontSize="12" fill="#4a5a72">
        주가
      </text>
      <line x1="90" y1="58" x2="340" y2="58" stroke="#2a8f6a" strokeWidth="3" />
      <text x="40" y="100" fontSize="12" fill="#4a5a72">
        거래량
      </text>
      <rect x="90" y="92" width="14" height="16" fill="#b7c4d4" />
      <rect x="120" y="88" width="14" height="20" fill="#b7c4d4" />
      <rect x="150" y="48" width="18" height="60" fill="#1a8f7c" />
      <rect x="186" y="90" width="14" height="18" fill="#b7c4d4" />
      <text x="380" y="70" fontSize="13" fill="#1a2333">
        「누가 몰래 사거나 팔고 있나?」를
      </text>
      <text x="380" y="92" fontSize="13" fill="#1a2333">
        의심하는 힌트입니다. 확정은 아닙니다.
      </text>
      <text x="380" y="118" fontSize="12" fill="#4a5a72">
        이때 Score가 같이 오르면 더 눈여겨봅니다.
      </text>
    </svg>
  );
}

export function FigIC() {
  return (
    <svg viewBox="0 0 720 120" role="img" aria-label="Information Coefficient 눈금">
      <rect width="720" height="120" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        IC (Information Coefficient) −1 ~ +1
      </text>
      <rect x="40" y="48" width="640" height="16" rx="8" fill="#e4eaf1" />
      <rect x="360" y="48" width="192" height="16" rx="8" fill="#7ec9bb" />
      <rect x="360" y="44" width="3" height="24" fill="#1a2333" />
      <text x="40" y="88" fontSize="11" fill="#4a5a72">
        −1 반대
      </text>
      <text x="348" y="88" fontSize="11" fill="#1a2333">
        0 무관
      </text>
      <text x="520" y="88" fontSize="11" fill="#1a8f7c">
        +0.1 눈여겨봄
      </text>
      <text x="620" y="88" fontSize="11" fill="#4a5a72">
        +1 완전 같이
      </text>
      <text x="40" y="108" fontSize="12" fill="#4a5a72">
        보통 20일 IC를 봅니다. 양수이고 p값이 작을수록, 이 종목 과거에서 점수 순서가 수익 순서와 맞았습니다.
      </text>
    </svg>
  );
}

export function FigBootstrap() {
  return (
    <svg viewBox="0 0 720 130" role="img" aria-label="Bootstrap 신뢰구간 읽는 법">
      <rect width="720" height="130" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        Bootstrap 95% 구간 — 「0」이 안에 들어오나?
      </text>
      <text x="40" y="52" fontSize="12" fill="#4a5a72">
        좋은 예: 하한이 0보다 큼
      </text>
      <line x1="120" y1="68" x2="300" y2="68" stroke="#1a8f7c" strokeWidth="6" />
      <circle cx="210" cy="68" r="6" fill="#1a2333" />
      <line x1="90" y1="50" x2="90" y2="86" stroke="#8b9cb3" />
      <text x="82" y="100" fontSize="11" fill="#4a5a72">
        0
      </text>
      <text x="380" y="52" fontSize="12" fill="#4a5a72">
        애매한 예: 0을 가로지름
      </text>
      <line x1="420" y1="68" x2="660" y2="68" stroke="#b86a3a" strokeWidth="6" />
      <circle cx="540" cy="68" r="6" fill="#1a2333" />
      <line x1="540" y1="50" x2="540" y2="86" stroke="#8b9cb3" />
      <text x="532" y="100" fontSize="11" fill="#4a5a72">
        0
      </text>
      <text x="20" y="120" fontSize="12" fill="#4a5a72">
        왼쪽 끝=하한, 오른쪽 끝=상한, 가운데 점=실제 평균. 같은 시험을 1,000번 다시 본 성적의 범위입니다.
      </text>
    </svg>
  );
}

export function FigWalkForward() {
  return (
    <svg viewBox="0 0 720 150" role="img" aria-label="Walk-Forward 시험 방식">
      <rect width="720" height="150" fill="#f7f9fc" />
      <text x="20" y="24" fontSize="13" fontWeight="700" fill="#1a2333">
        Walk-Forward: 앞만 공부하고 바로 다음을 시험
      </text>
      <rect x="40" y="48" width="220" height="28" fill="#cfe8e2" />
      <rect x="276" y="48" width="70" height="28" fill="#1a8f7c" />
      <text x="150" y="67" textAnchor="middle" fontSize="12" fill="#1a2333">
        공부(앞부분)
      </text>
      <text x="311" y="67" textAnchor="middle" fontSize="12" fill="#fff">
        시험
      </text>
      <Chevron x={260} y={62} />
      <rect x="40" y="88" width="300" height="28" fill="#cfe8e2" />
      <rect x="356" y="88" width="70" height="28" fill="#1a8f7c" />
      <text x="190" y="107" textAnchor="middle" fontSize="12" fill="#1a2333">
        공부를 조금 더 늘림
      </text>
      <text x="391" y="107" textAnchor="middle" fontSize="12" fill="#fff">
        시험
      </text>
      <Chevron x={340} y={102} />
      <text x="440" y="78" fontSize="12" fill="#4a5a72">
        전체를 한 번에 보면
      </text>
      <text x="440" y="98" fontSize="12" fill="#4a5a72">
        「답을 본 숙제」가 될 수 있어
      </text>
      <text x="440" y="118" fontSize="12" fill="#4a5a72">
        시기를 나눠 반복합니다.
      </text>
    </svg>
  );
}
