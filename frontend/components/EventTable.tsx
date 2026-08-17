import { formatPct, formatScore, STATE_COLORS } from "@/lib/format";
import type { EventItem } from "@/lib/types";

export default function EventTable({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return <p className="muted">탐지된 활동 구간이 없습니다.</p>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>상태</th>
            <th className="num">Score</th>
            <th className="num">Confidence</th>
            <th className="num">이후 5일</th>
            <th className="num">이후 20일</th>
            <th className="num">이후 60일</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.event_id}>
              <td>
                {event.start_date}
                {event.start_date !== event.end_date ? ` ~ ${event.end_date}` : ""}
              </td>
              <td>
                <span className="badge" style={{ borderColor: STATE_COLORS[event.state] }}>
                  {event.state_label}
                </span>
              </td>
              <td className="num">{formatScore(event.max_score)}</td>
              <td className="num">{formatScore(event.confidence)}</td>
              <ReturnCell value={event.forward_return_5d} />
              <ReturnCell value={event.forward_return_20d} />
              <ReturnCell value={event.forward_return_60d} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReturnCell({ value }: { value: number | null }) {
  const cls = value === null ? "num" : value >= 0 ? "num up" : "num down";
  return <td className={cls}>{formatPct(value)}</td>;
}
