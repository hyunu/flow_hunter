"use client";

import Link from "next/link";
import Hint from "@/components/Hint";
import { formatPct, formatScore } from "@/lib/format";
import type { EvaluationResponse } from "@/lib/types";

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="eval-stat">
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
    </div>
  );
}

function BracketBar({ label, count, avg, winRate }: { label: string; count: number; avg: number | null; winRate: number | null }) {
  const pct = avg !== null ? avg * 100 : 0;
  const width = Math.min(Math.abs(pct) * 8, 100);
  const positive = pct >= 0;
  return (
    <div className="eval-bracket">
      <div className="eval-bracket-header">
        <span className="eval-bracket-label">Score {label}</span>
        <span className="eval-bracket-count">{count}bars</span>
      </div>
      <div className="eval-bar-track">
        <div
          className="eval-bar-fill"
          style={{
            width: `${width}%`,
            background: positive ? "var(--good)" : "var(--bad)",
          }}
        />
      </div>
      <div className="eval-bracket-footer">
        <span style={{ color: positive ? "var(--good)" : pct < 0 ? "var(--bad)" : "var(--muted)" }}>
          {formatPct(avg)}
        </span>
        <span>{winRate !== null ? `${(winRate * 100).toFixed(0)}%` : "—"}</span>
      </div>
    </div>
  );
}

function PValueBadge({ pValue }: { pValue: number | null }) {
  if (pValue === null) return <span className="eval-badge eval-badge-neutral">—</span>;
  if (pValue < 0.01) return <span className="eval-badge eval-badge-strong">p &lt; 0.01</span>;
  if (pValue < 0.05) return <span className="eval-badge eval-badge-good">p &lt; 0.05</span>;
  if (pValue < 0.1) return <span className="eval-badge eval-badge-weak">p &lt; 0.10</span>;
  return <span className="eval-badge eval-badge-neutral">p = {pValue.toFixed(3)}</span>;
}

export default function EvaluationDashboard({ data }: { data: EvaluationResponse }) {
  const { brackets, ic, significance, bootstrap, monte_carlo, risk, benchmark } = data;

  return (
    <section className="card eval-section">
      <div className="panel-title">
        <h2 style={{ margin: 0, fontSize: 18 }}>평가 리포트</h2>
        <span className="muted">
          Score가 실제로 수익률을 예측하는지 검증
          {" · "}
          <Link className="text-btn" href="/guide#eval-report">
            해석
          </Link>
        </span>
      </div>

      <div className="eval-grid">
        <div className="eval-card eval-card-span2">
          <h3>Score 구간별 수익률</h3>
          <p className="eval-desc">Score가 높을수록 20일 수익률이 좋아지는가</p>
          <div className="eval-brackets">
            {brackets.map((b) => (
              <BracketBar
                key={b.range_label}
                label={b.range_label}
                count={b.count}
                avg={b.avg_return_20d}
                winRate={b.win_rate_20d}
              />
            ))}
          </div>
          <div className="eval-mono">
            단조성: <strong>{(data.monotonicity_score * 100).toFixed(0)}%</strong>
            {data.monotonicity_score >= 0.8 && <span className="eval-good"> 양호</span>}
          </div>
          <Hint>
            모든 거래일을 점수 20점 단위로 나눠 각 구간의 그다음 20거래일 평균 수익률과 승률을 보여
            줍니다. 막대가 오른쪽으로 갈수록 길고 초록이면 점수가 높을수록 이후 수익이 좋았다는 뜻입니다.
            단조성은 인접 구간 사이 평균이 낮아지지 않은 비율로, 80% 이상이면 “양호”가 붙습니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>Information Coefficient</h3>
          <p className="eval-desc">Score와 전방수익률의 순위상관 (Spearman)</p>
          <div className="eval-ic-grid">
            <Stat label="1일" value={formatScore(ic.ic_1d)} />
            <Stat label="5일" value={formatScore(ic.ic_5d)} />
            <Stat label="10일" value={formatScore(ic.ic_10d)} />
            <Stat
              label="20일"
              value={formatScore(ic.ic_20d)}
              color={ic.ic_20d !== null && ic.ic_20d > 0.1 ? "var(--good)" : undefined}
            />
            <Stat label="60일" value={formatScore(ic.ic_60d)} />
            <div className="eval-stat">
              <span>20일 p값</span>
              <PValueBadge pValue={ic.p_value_20d} />
            </div>
          </div>
          <div className="eval-mono">
            IC &gt; 0.1이면 의미 있는 예측력
          </div>
          <Hint>
            그날의 점수 순위와 이후 1·5·10·20·60일 수익률 순위의 상관(Spearman)입니다. 20일 IC가
            0.1을 넘고 p값이 작으면 점수가 수익 순서를 어느 정도 가렸다고 봅니다. 표본이 10일
            미만이면 계산하지 않습니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>통계적 유의성</h3>
          <p className="eval-desc">Score ≥ 60 바의 수익률이 전체보다 의미 있게 다른가</p>
          <div className="eval-stats-3">
            <Stat
              label="고스코어 20일 평균"
              value={formatPct(significance.high_score_avg_20d)}
              color={significance.high_score_avg_20d !== null && significance.high_score_avg_20d > 0 ? "var(--good)" : undefined}
            />
            <Stat label="전체 20일 평균" value={formatPct(significance.all_avg_20d)} />
            <Stat label="t-stat" value={formatScore(significance.t_stat)} />
          </div>
          <div className="eval-mono">
            <PValueBadge pValue={significance.p_value} />
            <span style={{ marginLeft: 8 }}>
              고스코어 {significance.high_score_count}건 / 전체 {significance.all_count}건
            </span>
          </div>
          <Hint>
            Score가 60 이상인 날만 모은 20일 평균 수익률을 전체 평균과 비교합니다(Welch t검정).
            고스코어 평균이 높고 t-stat이 양수면 고득점 날이 더 좋았다는 뜻입니다. p &lt; 0.05면 우연으로
            보기 어렵고, 고스코어 건수가 적으면 p가 커지기 쉽습니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>Bootstrap 신뢰구간</h3>
          <p className="eval-desc">1000회 리샘플링으로 추정한 20일 수익률의 95% 신뢰구간</p>
          <div className="eval-ci">
            <div className="eval-ci-range">
              <span>{formatPct(bootstrap.ci_95_lower)}</span>
              <div className="eval-ci-bar">
                <div
                  className="eval-ci-point"
                  style={{
                    left: `${bootstrap.ci_95_lower !== null && bootstrap.ci_95_upper !== null
                      ? 50
                      : 50}%`,
                  }}
                />
              </div>
              <span>{formatPct(bootstrap.ci_95_upper)}</span>
            </div>
            <div className="eval-mono">평균: {formatPct(bootstrap.mean_20d)}</div>
          </div>
          <Hint>
            Score ≥ 60인 날의 20일 수익률을 1,000번 다시 뽑아 95% 신뢰구간을 추정합니다. 하한이
            0보다 크면 반복해도 플러스가 많았다는 뜻이고, 구간이 0을 가로지르면 플러스·마이너스
            모두 가능하다는 뜻입니다. 고득점 날이 5일 미만이면 구간을 그리지 않습니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>몬테카를로 검정</h3>
          <p className="eval-desc">무작위 날짜 기반 null 분포와의 비교</p>
          <div className="eval-stats-3">
            <Stat label="실제 평균" value={formatPct(monte_carlo.actual_avg_return_20d)} color="var(--copper)" />
            <Stat label="무작위 평균" value={formatPct(monte_carlo.null_mean)} />
            <Stat label="무작위 표준편차" value={formatPct(monte_carlo.null_std)} />
          </div>
          <div className="eval-mono">
            <PValueBadge pValue={monte_carlo.p_value} />
            <span style={{ marginLeft: 8 }}>{monte_carlo.n_simulations}회 시뮬레이션</span>
          </div>
          <Hint>
            이벤트와 같은 수의 날짜를 무작위로 뽑아 20일 수익률 평균을 여러 번 만든 뒤 실제와
            비교합니다. 실제 평균이 무작위 평균보다 높고 p가 작으면 이벤트 날짜가 우연보다 나았다는
            쪽입니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>리스크 메트릭</h3>
          <p className="eval-desc">Score ≥ 60 구간의 위험 조정 수익률</p>
          <div className="eval-stats-2x2">
            <Stat label="Sharpe (1일)" value={formatScore(risk.sharpe_1d)} />
            <Stat label="Sharpe (20일)" value={formatScore(risk.sharpe_20d)} color={risk.sharpe_20d !== null && risk.sharpe_20d > 1 ? "var(--good)" : undefined} />
            <Stat label="최대낙폭" value={formatPct(risk.max_drawdown)} color={risk.max_drawdown !== null ? "var(--bad)" : undefined} />
            <Stat label="Calmar" value={formatScore(risk.calmar_ratio)} />
          </div>
          <Hint>
            수익만 보지 않고 흔들림과 낙폭을 함께 봅니다. Sharpe는 평균 수익을 변동성으로 나눈 값이라
            20일 값이 1을 넘으면 변동 대비 보상이 괜찮은 편입니다. 최대낙폭은 고점 대비 가장 많이
            빠진 비율입니다. 미래 손실 한도를 뜻하지 않습니다.
          </Hint>
        </div>

        <div className="eval-card">
          <h3>벤치마크 대비</h3>
          <p className="eval-desc">시장 수익률 대비 초과수익</p>
          <div className="eval-stats-2x2">
            <Stat label="시장 20일" value={formatPct(benchmark.benchmark_avg_return_20d)} />
            <Stat label="전략 20일" value={formatPct(benchmark.strategy_avg_return_20d)} color="var(--copper)" />
            <Stat
              label="초과수익"
              value={formatPct(benchmark.excess_return_20d)}
              color={benchmark.excess_return_20d !== null && benchmark.excess_return_20d > 0 ? "var(--good)" : undefined}
            />
            <Stat label="Information Ratio" value={formatScore(benchmark.information_ratio)} />
          </div>
          <Hint>
            Score ≥ 60인 날의 20일 평균 수익률을 시장 지수와 비교합니다. 전략이 플러스여도 시장이 더
            올랐으면 초과수익은 음수입니다. “장 덕분에 오른 것”인지 “이 종목의 고득점 날이 장보다
            나았는지”를 가르는 칸입니다.
          </Hint>
        </div>

        <div className="eval-card eval-card-wide">
          <h3>Walk-Forward 분석</h3>
          <p className="eval-desc">확장 윈도우 Out-of-Sample 백테스트 ({data.walk_forward.windows}개 윈도우)</p>
          {data.walk_forward.details.length > 0 && (
            <div className="eval-wf-chart">
              {data.walk_forward.details.map((w, i) => {
                const val = w.avg_return_20d ?? 0;
                const h = Math.min(Math.abs(val) * 400, 80);
                return (
                  <div key={i} className="eval-wf-bar-col">
                    <div
                      className="eval-wf-bar"
                      style={{
                        height: `${h}px`,
                        background: val >= 0 ? "var(--good)" : "var(--bad)",
                        alignSelf: val >= 0 ? "end" : "start",
                      }}
                    />
                    <span className="eval-wf-label">{w.events}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="eval-stats-2x2" style={{ marginTop: 12 }}>
            <Stat label="총 윈도우" value={`${data.walk_forward.windows}`} />
            <Stat label="총 이벤트" value={`${data.walk_forward.total_events}`} />
            <Stat label="평균 수익률" value={formatPct(data.walk_forward.avg_return_20d)} color={data.walk_forward.avg_return_20d !== null && data.walk_forward.avg_return_20d > 0 ? "var(--good)" : undefined} />
            <Stat label="승률" value={data.walk_forward.win_rate_20d !== null ? `${(data.walk_forward.win_rate_20d * 100).toFixed(0)}%` : "—"} />
          </div>
          <Hint>
            앞 구간만으로 점수를 만든 뒤 바로 다음 20거래일을 검증하는 일을 기간을 밀며 반복합니다.
            막대가 대부분 초록이고 승률이 안정적이면 시기를 나눠도 비슷한 경향이 있었다는 뜻입니다.
            특정 구간만 크게 튀면 그 한 번의 급등에 평균이 끌려간 것입니다.
          </Hint>
        </div>
      </div>
    </section>
  );
}
