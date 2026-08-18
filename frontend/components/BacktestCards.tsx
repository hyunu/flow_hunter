import { formatPct } from "@/lib/format";
import type { BacktestSummary } from "@/lib/types";

export default function BacktestCards({ summaries }: { summaries: BacktestSummary[] }) {
  return (
    <div className="backtest-metrics">
      {summaries.map((item) => (
        <article className="metric" key={item.min_score}>
          <div className="k">Score ≥ {item.min_score} · {item.event_count}건</div>
          <div className="v">{formatPct(item.avg_return_20d)}</div>
          <div className="muted">
            20일 평균 · 승률 {formatPct(item.win_rate_20d, 1)} · 5일 {formatPct(item.avg_return_5d)}
          </div>
        </article>
      ))}
    </div>
  );
}
