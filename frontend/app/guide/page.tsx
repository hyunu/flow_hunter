import Link from "next/link";
import { STATE_COLORS } from "@/lib/format";

const STATES = [
  {
    key: "normal",
    label: "특이 활동 없음",
    meaning: "거래량·대금·가격 움직임이 평소와 크게 다르지 않습니다. 대부분의 날이 여기입니다.",
    read: "특별한 신호로 보지 마세요.",
  },
  {
    key: "accumulation_start",
    label: "매집 시작",
    meaning: "거래량이 조금 늘었는데 주가는 크게 빠지지 않는 날이 이어지기 시작했습니다.",
    read: "누군가 사기 시작했을 가능성의 초입입니다. 아직 약한 추정입니다.",
  },
  {
    key: "accumulation",
    label: "매집",
    meaning: "위 패턴이 며칠 이상 이어진 구간입니다. 가격이 박스권에서 버티며 거래가 받쳐 주는 모습입니다.",
    read: "고점이 아니라, 비교적 낮은 위치에서 물량을 모았을 가능성으로 읽습니다.",
  },
  {
    key: "strong_intervention",
    label: "강한 개입",
    meaning: "점수가 높고 거래량·거래대금이 평균의 약 2배 이상으로 같이 뛰었습니다.",
    read: "당일 수급이 유난히 강했다는 뜻입니다. 방향(매수/매도)을 확정하지는 않습니다.",
  },
  {
    key: "breakout",
    label: "돌파",
    meaning: "매집·개입이 있던 뒤, 최근 고점을 거래와 함께 위로 넘어간 날입니다.",
    read: "쌓아 둔 힘이 가격으로 나타났을 가능성입니다. 돌파 실패도 흔합니다.",
  },
  {
    key: "distribution",
    label: "분산",
    meaning: "이미 많이 오른 위치에서 거래가 늘었는데 주가는 잘 안 오르거나 약합니다.",
    read: "팔면서 물량을 넘겼을 가능성입니다. 고점 근처에서 특히 주의해서 봅니다.",
  },
  {
    key: "exit",
    label: "이탈",
    meaning: "직전까지 있던 활동 구간의 점수가 빠르게 사그라든 상태입니다.",
    read: "그 흐름이 끝났거나 쉬어 가는 구간으로 봅니다. 다음 매집과 이어질 수도 있습니다.",
  },
];

export default function GuidePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Flow<span>Hunter</span>
        </Link>
        <Link className="text-btn" href="/">
          종목 분석
        </Link>
      </header>

      <h1 className="guide-title">이 화면, 이렇게 보면 됩니다</h1>
      <p className="lede">
        FlowHunter는 누가 샀는지 찾아내지 않습니다. 거래량, 거래대금, 가격이 움직이는 모양을 보고
        <strong> 큰돈이 들어왔거나 빠져나갔을 가능성</strong>을 점수로 보여 줍니다. 아래는 화면에 나오는
        말과 숫자를 일상 언어로 풀어 둔 설명입니다.
      </p>

      <div className="guide">
        <section className="card">
          <h2>한 줄로</h2>
          <ol className="howto">
            <li>종목을 고르면 최근 수년 일봉을 분석합니다.</li>
            <li>날마다 0~100점의 Smart Money Score와 상태를 붙입니다.</li>
            <li>비슷한 상태가 이어진 구간을 “탐지 이벤트”로 묶습니다.</li>
            <li>그 구간 이후 주가가 실제로 어떻게 됐는지만 따로 집계합니다. 이 수익률은 점수 계산에 쓰지 않습니다.</li>
          </ol>
        </section>

        <section className="card">
          <h2>결과를 이렇게 읽으세요</h2>
          <div className="split">
            <article>
              <h3>봐도 되는 것</h3>
              <ul>
                <li>거래가 평소와 얼마나 달랐는지</li>
                <li>그 이상 징후가 며칠 이어졌는지</li>
                <li>비슷한 패턴 뒤에 과거 주가가 어떻게 움직였는지</li>
              </ul>
            </article>
            <article>
              <h3>보면 안 되는 것</h3>
              <ul>
                <li>“세력이 들어왔다”는 확정</li>
                <li>지금 사거나 팔라는 신호</li>
                <li>앞으로의 수익 보장</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="card">
          <h2>맨 위 숫자</h2>
          <dl className="glossary">
            <div>
              <dt>Smart Money Score</dt>
              <dd>
                그날 대규모 자금 활동처럼 보이는 정도가 얼마나 강한지입니다. 0에 가까우면 평소와 같고,
                높을수록 거래량·대금·가격 행동이 여러 개 겹칩니다. 거래량만 튀면 점수가 너무 높아지지 않게
                막아 두었습니다.
                <p className="hint">
                  대략 40 미만은 약한 편, 40~70은 눈여겨볼 구간, 70 이상은 거래량과 대금이 함께 크게 뛴
                  날로 읽으면 됩니다. 절대 기준은 아닙니다.
                </p>
              </dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>
                점수를 얼마나 믿어도 되는지에 가깝습니다. 데이터가 짧거나, 지표가 한두 개만 맞거나, 시장
                전체 거래량과 비교할 지수가 없으면 낮아집니다. 점수는 높은데 Confidence가 낮으면 단정하지
                마세요.
              </dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>
                그날 점수와 최근 흐름을 보고 붙인 이름입니다. 아래 상태 설명을 기준으로 읽습니다.
              </dd>
            </div>
            <div>
              <dt>이벤트</dt>
              <dd>
                “특이 활동 없음”이 아닌 날이 같은 이름으로 이어진 덩어리의 개수입니다. 하루짜리면 1건,
                매집이 2주 이어져도 1건입니다.
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>상태 이름</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            차트 위 색 띠와 마커, 표의 배지가 같은 뜻을 씁니다. “세력이 한다”가 아니라 “그런 모양으로
            보인다”입니다.
          </p>
          <ul className="state-list">
            {STATES.map((item) => (
              <li key={item.key}>
                <span
                  className="swatch"
                  style={{ background: item.key === "normal" ? "#1c2736" : STATE_COLORS[item.key] }}
                />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.meaning}</p>
                  <p className="hint">{item.read}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>차트 3개</h2>
          <p>
            분석 화면의 차트는 같은 날짜를 세로로 맞춰 둔 칸이 세 개입니다. 위아래를 같이 보면 “가격이
            움직일 때 거래와 점수가 어땠는지”를 한눈에 볼 수 있습니다.
          </p>
          <dl className="glossary">
            <div>
              <dt>위 — 주가 (캔들)</dt>
              <dd>
                하루의 시가·고가·저가·종가입니다. 초록은 종가가 시가보다 오른 날, 빨강은 내린 날입니다.
                화살표·점은 탐지된 상태(매집, 돌파, 분산 등)가 있던 날입니다. 가격이 어디로 갔는지를 보는
                칸입니다.
              </dd>
            </div>
            <div>
              <dt>가운데 — 거래량</dt>
              <dd>
                그날 몇 주가 거래됐는지입니다. 막대가 높을수록 거래가 많았습니다. 막대 색은 그날의 상태와
                같습니다. 가격은 조용한데 거래량만 커지면 수급이 들어왔을 가능성을 의심하는 힌트입니다.
              </dd>
            </div>
            <div>
              <dt>아래 — Score</dt>
              <dd>
                그날의 Smart Money Score(0~100)입니다. 막대가 높을수록 대규모 자금 활동처럼 보이는 징후가
                겹친 날입니다. 밝은 청록은 점수가 특히 높은 날입니다. 위 두 칸의 가격·거래를 점수로 요약한
                칸으로 보면 됩니다.
              </dd>
            </div>
          </dl>
          <h3>주가 칸의 20 · 60 · 120선</h3>
          <p>
            종가의 이동평균입니다. 최근 그 일수만큼의 평균 가격이라, 단기·중기·장기 흐름을 겹쳐 보는 기본
            지표입니다.
          </p>
          <dl className="glossary">
            <div>
              <dt>20 (노랑)</dt>
              <dd>
                대략 한 달. 단기 추세입니다. 주가가 이 선 위에 있으면 단기적으로 매수 쪽이 우세한 편으로
                봅니다.
              </dd>
            </div>
            <div>
              <dt>60 (주황)</dt>
              <dd>
                대략 분기. 중기 추세입니다. Score의 추세 판단에도 이 선을 참고합니다.
              </dd>
            </div>
            <div>
              <dt>매물대 (가격대별 거래량)</dt>
              <dd>
                왼쪽에서 가로로 뻗은 막대입니다. 그 가격대에서 얼마나 많이 거래됐는지를 보여 줍니다. 막대가
                길수록 그 가격에 산 사람과 판 사람이 많았던 자리입니다. 밝은 청록 막대는 거래가 가장 몰린
                가격(POC)입니다. 주가가 두꺼운 매물대에 오면 지지·저항이 될 가능성이 큽니다. 보이는 구간에
                맞춰 다시 계산됩니다.
              </dd>
            </div>
          </dl>
          <p className="muted">
            차트 왼쪽 위 이름(20, 60, 120, 매물대, 거래량, Score, 이벤트)을 누르면 켜고 끌 수 있습니다.
            차트 위쪽 얇은 색 띠는 날짜를 따라 상태가 어떻게 바뀌었는지만 보여 줍니다. 휠은 가로로
            확대·축소, 더블클릭은 전체 기간으로 돌아갑니다.
          </p>
        </section>

        <section className="card">
          <h2>차트를 클릭하면 나오는 값</h2>
          <dl className="glossary">
            <div>
              <dt>Vol (거래량 배수)</dt>
              <dd>
                그날 거래량이 최근 20일 평균의 몇 배인지입니다. 1.0x면 평소와 같고, 2.0x면 대략 두 배입니다.
              </dd>
            </div>
            <div>
              <dt>Val (거래대금 배수)</dt>
              <dd>
                거래대금도 같은 방식으로 본 값입니다. 원자료에 대금이 없어 <em>종가 × 거래량</em>으로
                근사합니다. 실제 체결대금과 다를 수 있습니다.
              </dd>
            </div>
            <div>
              <dt>등락</dt>
              <dd>전일 종가 대비 그날 종가 등락률입니다.</dd>
            </div>
            <div>
              <dt>OBV</dt>
              <dd>
                주가가 오른 날의 거래량은 더하고, 내린 날의 거래량은 빼서 쌓은 선의 최근 방향입니다. 상승이면
                매수 쪽이 거래에서 우세했을 가능성, 하락이면 그 반대에 가깝습니다. 단독으로 쓰지 마세요.
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>탐지 이벤트 표</h2>
          <p>
            같은 상태가 이어진 구간을 한 줄로 압축한 목록입니다. 피크일은 그 구간에서 점수가 가장 높았던
            날입니다.
          </p>
          <dl className="glossary">
            <div>
              <dt>이후 5일 / 20일 / 60일</dt>
              <dd>
                피크일 종가 대비, 그로부터 5·20·60 거래일 뒤 종가의 수익률입니다. “그때 샀으면”이 아니라
                “그 패턴 뒤에 가격이 어떻게 됐는지”를 보는 검증용입니다. 점수 계산에는 미래 가격을 넣지
                않습니다.
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>Score ≥ 숫자 카드</h2>
          <p>
            점수가 그 값 이상인 이벤트만 모아, 피크일 이후 20일 평균 수익률과 승률을 보여 줍니다. 건수가
            적으면 평균이 한두 번에 흔들립니다. 과거 이 종목에서 비슷한 점수 구간 뒤에 어떤 경향이 있었는지
            참고용입니다.
          </p>
        </section>

        <section className="card">
          <h2>알아 둘 한계</h2>
          <ul>
            <li>일봉만 사용합니다. 장중 호가·실시간 수급은 없습니다.</li>
            <li>투자자별(외국인·기관) 매매는 넣지 않습니다.</li>
            <li>시장 전체가 같이 거래가 늘면, 그 종목만의 이상 징후 점수는 낮춥니다.</li>
            <li>분석일 당일까지의 데이터만 그날 점수에 씁니다. 다음날 정보는 보지 않습니다.</li>
          </ul>
          <p className="disclaimer" style={{ marginTop: 16 }}>
            결과는 대규모 자금 활동 가능성의 추정이며, 특정 세력의 존재나 미래 수익을 증명·보장하지 않습니다.
            투자 권유가 아닙니다.
          </p>
        </section>
      </div>
    </main>
  );
}
