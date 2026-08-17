import { formatNumber, formatPct, formatScore } from "@/lib/format";
import type { Bar } from "@/lib/types";

type Props = {
  bar: Bar | null;
  overlay?: boolean;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="hud-stat">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export default function BarTooltip({ bar, overlay = false }: Props) {
  if (!bar) {
    if (overlay) return null;
    return <p className="muted">날짜를 클릭하면 그날의 점수와 근거가 표시됩니다.</p>;
  }
  const features = bar.features;
  const change = typeof features.ret_1d === "number" ? features.ret_1d : null;
  return (
    <div className={`hud ${overlay ? "is-overlay" : ""}`}>
      <div className="hud-stat">
        <span>일자</span>
        <strong>{bar.date}</strong>
      </div>
      <Stat label="Score" value={formatScore(bar.smart_money_score)} />
      <Stat label="Conf" value={`${formatScore(bar.confidence)}%`} />
      <Stat label="상태" value={bar.state_label} />
      <Stat label="Vol" value={features.volume_ratio == null ? "—" : `${features.volume_ratio}x`} />
      <Stat label="Val" value={features.value_ratio == null ? "—" : `${features.value_ratio}x`} />
      <Stat
        label="등락"
        value={formatPct(change)}
        tone={change == null ? undefined : change >= 0 ? "up" : "down"}
      />
      <Stat label="OBV" value={typeof features.obv_trend === "string" ? features.obv_trend : "—"} />
      <Stat label="MA20" value={formatNumber(typeof features.ma20 === "number" ? features.ma20 : null, 0)} />
      <Stat label="MA60" value={formatNumber(typeof features.ma60 === "number" ? features.ma60 : null, 0)} />
      <Stat
        label="MA120"
        value={formatNumber(typeof features.ma120 === "number" ? features.ma120 : null, 0)}
      />
    </div>
  );
}
