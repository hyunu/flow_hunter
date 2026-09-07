import { formatPct } from "@/lib/format";
import type { BacktestSummary } from "@/lib/types";
import Hint from "./Hint";

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
          <Hint>
            Score가 {item.min_score}점 이상인 이벤트만 모아 피크일 이후 20일 평균 수익률과 승률을 보여
            줍니다. 건수가 적으면 평균이 한두 번에 흔들릴 수 있어 참고용으로만 보세요.
          </Hint>
        </article>
      ))}
    </div>
  );
}
