"use client";

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
        <span className="muted">Score가 실제로 수익률을 예측하는지 검증</span>
      </div>

      <div className="eval-grid">
        <div className="eval-card">
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
        </div>

        <div className="eval-card">
          <h3>Information Coefficient</h3>
          <p className="eval-desc">Score와 전방수익률의 순위상관 (Spearman)</p>
          <div className="eval-stats-row">
            <Stat label="1일" value={formatScore(ic.ic_1d)} />
            <Stat label="5일" value={formatScore(ic.ic_5d)} />
            <Stat label="10일" value={formatScore(ic.ic_10d)} />
            <Stat label="20일" value={formatScore(ic.ic_20d)} color={ic.ic_20d !== null && ic.ic_20d > 0.1 ? "var(--good)" : undefined} />
            <Stat label="60일" value={formatScore(ic.ic_60d)} />
          </div>
          <div className="eval-mono">
            IC &gt; 0.1이면 의미 있는 예측력
          </div>
        </div>

        <div className="eval-card">
          <h3>통계적 유의성</h3>
          <p className="eval-desc">Score ≥ 60 바의 수익률이 전체보다 의미 있게 다른가</p>
          <div className="eval-stats-row">
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
        </div>

        <div className="eval-card">
          <h3>몬테카를로 검정</h3>
          <p className="eval-desc">무작위 날짜 기반 null 분포와의 비교</p>
          <div className="eval-stats-row">
            <Stat label="실제 평균" value={formatPct(monte_carlo.actual_avg_return_20d)} color="var(--copper)" />
            <Stat label="무작위 평균" value={formatPct(monte_carlo.null_mean)} />
            <Stat label="무작위 표준편차" value={formatPct(monte_carlo.null_std)} />
          </div>
          <div className="eval-mono">
            <PValueBadge pValue={monte_carlo.p_value} />
            <span style={{ marginLeft: 8 }}>{monte_carlo.n_simulations}회 시뮬레이션</span>
          </div>
        </div>

        <div className="eval-card">
          <h3>리스크 메트릭</h3>
          <p className="eval-desc">Score ≥ 60 구간의 위험 조정 수익률</p>
          <div className="eval-stats-row">
            <Stat label="Sharpe (1일)" value={formatScore(risk.sharpe_1d)} />
            <Stat label="Sharpe (20일)" value={formatScore(risk.sharpe_20d)} color={risk.sharpe_20d !== null && risk.sharpe_20d > 1 ? "var(--good)" : undefined} />
            <Stat label="최대낙폭" value={formatPct(risk.max_drawdown)} color={risk.max_drawdown !== null ? "var(--bad)" : undefined} />
            <Stat label="Calmar" value={formatScore(risk.calmar_ratio)} />
          </div>
        </div>

        <div className="eval-card">
          <h3>벤치마크 대비</h3>
          <p className="eval-desc">시장 수익률 대비 초과수익</p>
          <div className="eval-stats-row">
            <Stat label="시장 20일" value={formatPct(benchmark.benchmark_avg_return_20d)} />
            <Stat label="전략 20일" value={formatPct(benchmark.strategy_avg_return_20d)} color="var(--copper)" />
            <Stat
              label="초과수익"
              value={formatPct(benchmark.excess_return_20d)}
              color={benchmark.excess_return_20d !== null && benchmark.excess_return_20d > 0 ? "var(--good)" : undefined}
            />
            <Stat label="Information Ratio" value={formatScore(benchmark.information_ratio)} />
          </div>
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
          <div className="eval-stats-row" style={{ marginTop: 12 }}>
            <Stat label="총 윈도우" value={`${data.walk_forward.windows}`} />
            <Stat label="총 이벤트" value={`${data.walk_forward.total_events}`} />
            <Stat label="평균 수익률" value={formatPct(data.walk_forward.avg_return_20d)} color={data.walk_forward.avg_return_20d !== null && data.walk_forward.avg_return_20d > 0 ? "var(--good)" : undefined} />
            <Stat label="승률" value={data.walk_forward.win_rate_20d !== null ? `${(data.walk_forward.win_rate_20d * 100).toFixed(0)}%` : "—"} />
          </div>
        </div>
      </div>
    </section>
  );
}
