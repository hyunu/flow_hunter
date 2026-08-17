import { STATE_COLORS } from "@/lib/format";
import type { Bar } from "@/lib/types";

export default function RegimeStrip({ bars }: { bars: Bar[] }) {
  if (bars.length === 0) return null;
  const segments: { state: string; length: number }[] = [];
  for (const bar of bars) {
    const last = segments[segments.length - 1];
    if (!last || last.state !== bar.state) segments.push({ state: bar.state, length: 1 });
    else last.length += 1;
  }
  return (
    <div className="regime" title="활동 상태 구간">
      {segments.map((segment, index) => (
        <span
          key={`${segment.state}-${index}`}
          style={{
            width: `${(segment.length / bars.length) * 100}%`,
            background: segment.state === "normal" ? "#1c2736" : STATE_COLORS[segment.state],
          }}
        />
      ))}
    </div>
  );
}
