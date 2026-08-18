"use client";

export type JobStatus = "pending" | "done" | "error";

export type ProgressJob = {
  key: string;
  label: string;
  hint?: string;
  status: JobStatus;
};

type Props = {
  jobs: ProgressJob[];
  onDismiss: () => void;
};

export default function AnalysisProgress({ jobs, onDismiss }: Props) {
  const total = jobs.length;
  const done = jobs.filter((job) => job.status === "done").length;
  const failed = jobs.filter((job) => job.status === "error").length;
  const pending = jobs.filter((job) => job.status === "pending").length;
  const settled = pending === 0;
  const percent = total === 0 ? 0 : Math.round(((done + failed) / total) * 100);

  return (
    <aside className="load-dock" role="status" aria-live="polite">
      <div className="load-dock-head">
        <div>
          <strong>{settled ? (failed ? "일부 실패" : "분석 완료") : "분석 진행"}</strong>
          <span>
            {done}/{total}
            {failed ? ` · 실패 ${failed}` : ""}
          </span>
        </div>
        {settled ? (
          <button className="text-btn" type="button" onClick={onDismiss}>
            닫기
          </button>
        ) : null}
      </div>
      <div className="load-dock-bar" aria-hidden="true">
        <i style={{ width: `${percent}%` }} />
      </div>
      <ul className="load-dock-list">
        {jobs.map((job) => (
          <li key={job.key} className={`is-${job.status}`}>
            <span className="load-dock-mark" aria-hidden="true">
              {job.status === "done" ? "✓" : job.status === "error" ? "!" : ""}
            </span>
            <div>
              <b>{job.label}</b>
              {job.hint ? <small>{job.hint}</small> : null}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
