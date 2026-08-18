"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AnalysisProgress, { type JobStatus, type ProgressJob } from "@/components/AnalysisProgress";
import BacktestCards from "@/components/BacktestCards";
import BarTooltip from "@/components/BarTooltip";
import EvaluationDashboard from "@/components/EvaluationDashboard";
import EventTable from "@/components/EventTable";
import PriceChart from "@/components/PriceChart";
import RegimeStrip from "@/components/RegimeStrip";
import { fetchAnalysis, fetchBacktest, fetchEvents, fetchEvaluation } from "@/lib/api";
import { formatScore } from "@/lib/format";
import { attachMovingAverages } from "@/lib/ma";
import type { AnalysisResponse, BacktestResponse, Bar, EvaluationResponse, EventsResponse, MarketName } from "@/lib/types";

const JOB_META = [
  { key: "analysis", label: "차트 · 점수", hint: "일봉과 Smart Money Score" },
  { key: "events", label: "탐지 이벤트", hint: "활동 구간 마커" },
  { key: "backtest", label: "백테스트", hint: "전방 수익률 요약" },
  { key: "evaluation", label: "통계 평가", hint: "유의성 · Walk-Forward" },
] as const;

type JobKey = (typeof JOB_META)[number]["key"];

const IDLE_JOBS: Record<JobKey, JobStatus> = {
  analysis: "pending",
  events: "pending",
  backtest: "pending",
  evaluation: "pending",
};

function ResultSlot({
  status,
  label,
  nested = false,
  tall = false,
}: {
  status: JobStatus;
  label: string;
  nested?: boolean;
  tall?: boolean;
}) {
  const failed = status === "error";
  return (
    <div className={`result-slot ${nested ? "is-nested" : "card"} ${tall ? "is-tall" : ""} ${failed ? "is-error" : ""}`}>
      {failed ? null : <span className="spin" aria-hidden="true" />}
      <div>
        <strong>{failed ? `${label} 실패` : `${label} 계산 중`}</strong>
        <p className="muted">{failed ? "이 항목만 다시 시도하거나 잠시 후 새로고침하세요." : "차트는 먼저 표시하고, 결과가 나오는 대로 붙입니다."}</p>
      </div>
    </div>
  );
}

function AnalyzeInner() {
  const params = useParams<{ symbol: string }>();
  const search = useSearchParams();
  const symbol = params.symbol;
  const market = (search.get("market") as MarketName) || "KOSPI";
  const start = search.get("start") || "";
  const end = search.get("end") || "";
  const name = search.get("name") || symbol;

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [events, setEvents] = useState<EventsResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [jobs, setJobs] = useState<Record<JobKey, JobStatus>>(IDLE_JOBS);
  const [dockOpen, setDockOpen] = useState(true);
  const [selected, setSelected] = useState<Bar | null>(null);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAnalysis(null);
    setEvents(null);
    setBacktest(null);
    setEvaluation(null);
    setSelected(null);
    setError("");
    setJobs(IDLE_JOBS);
    setDockOpen(true);

    const mark = (key: JobKey, status: JobStatus) => {
      if (!cancelled) setJobs((current) => ({ ...current, [key]: status }));
    };

    const followUp = async <T,>(key: JobKey, run: () => Promise<T>, apply: (body: T) => void) => {
      try {
        const body = await run();
        if (cancelled) return;
        apply(body);
        mark(key, "done");
      } catch {
        mark(key, "error");
      }
    };

    (async () => {
      try {
        const analysisBody = await fetchAnalysis(symbol, market, start, end);
        if (cancelled) return;
        const bars = attachMovingAverages(analysisBody.bars);
        setAnalysis({ ...analysisBody, bars });
        setSelected(bars.at(-1) ?? null);
        mark("analysis", "done");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "분석을 불러오지 못했습니다.");
          mark("analysis", "error");
          mark("events", "error");
          mark("backtest", "error");
          mark("evaluation", "error");
        }
        return;
      }

      await Promise.all([
        followUp("events", () => fetchEvents(symbol, market), setEvents),
        followUp("backtest", () => fetchBacktest(symbol, market), setBacktest),
        followUp("evaluation", () => fetchEvaluation(symbol, market), setEvaluation),
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, market, start, end]);

  const progressJobs: ProgressJob[] = useMemo(
    () => JOB_META.map((item) => ({ ...item, status: jobs[item.key] })),
    [jobs],
  );
  const jobsPending = progressJobs.some((job) => job.status === "pending");
  const showDock = dockOpen && (jobsPending || progressJobs.some((job) => job.status !== "pending"));

  useEffect(() => {
    if (jobsPending) return;
    const failed = progressJobs.some((job) => job.status === "error");
    if (failed) return;
    const timer = window.setTimeout(() => setDockOpen(false), 1200);
    return () => window.clearTimeout(timer);
  }, [jobsPending, progressJobs]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        setFullscreen(false);
        return;
      }
      const fullscreenKey =
        event.code === "KeyF" || event.key.toLowerCase() === "f" || event.key === "ㄹ";
      if (!fullscreenKey) return;
      event.preventDefault();
      if (!analysis) return;
      setFullscreen((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analysis]);

  useEffect(() => {
    if (!fullscreen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const latest = analysis?.latest;

  const chartPanel = (
    <section className={`card chart-stage ${fullscreen ? "is-full" : ""}`}>
      {fullscreen ? (
        <div className="chart-toolbar">
          <div className="chart-title">
            <strong>{name}</strong>
            <span>{symbol}</span>
          </div>
          <BarTooltip bar={selected} overlay />
          <button className="text-btn" type="button" onClick={() => setFullscreen(false)}>
            Esc
          </button>
        </div>
      ) : (
        <div className="panel-title">
          <h2 style={{ margin: 0, fontSize: 18 }}>차트</h2>
          <button className="text-btn" type="button" disabled={!analysis} onClick={() => setFullscreen(true)}>
            전체화면
          </button>
        </div>
      )}
      <div className="chart-canvas">
        {analysis ? (
          <PriceChart
            key={fullscreen ? "full" : "page"}
            bars={analysis.bars}
            events={events?.events ?? []}
            onSelect={setSelected}
          />
        ) : (
          <div className="chart-wrap chart-pending">
            <div className="pending-copy">
              {jobs.analysis === "error" ? (
                error || "차트를 불러오지 못했습니다."
              ) : (
                <>
                  <span className="spin" aria-hidden="true" />
                  차트를 준비하는 중…
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {fullscreen ? null : (
            <div className="chart-hint">
              <BarTooltip bar={selected} />
            </div>
      )}
    </section>
  );

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Flow<span>Hunter</span>
        </Link>
        <div className="tagline">
          {analysis?.algorithm_version ? `algorithm ${analysis.algorithm_version}` : "불러오는 중"} · {market} · 일봉
          <Link className="text-btn" href="/guide">
            설명
          </Link>
        </div>
      </header>

      <div className="panel-title">
        <h1 style={{ margin: 0 }}>
          {name} <span className="muted">{symbol}</span>
        </h1>
        <Link className="ghost" href="/">
          다른 종목
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="metrics">
        <article className="metric">
          <div className="k">Smart Money Score</div>
          <div className="v">{latest ? formatScore(latest.smart_money_score) : <span className="pulse">…</span>}</div>
        </article>
        <article className="metric">
          <div className="k">Confidence</div>
          <div className="v">{latest ? `${formatScore(latest.confidence)}%` : <span className="pulse">…</span>}</div>
        </article>
        <article className="metric">
          <div className="k">현재 상태</div>
          <div className="v" style={{ fontSize: 22 }}>
            {latest?.state_label ?? <span className="pulse">…</span>}
          </div>
        </article>
        <article className="metric">
          <div className="k">이벤트</div>
          <div className="v">
            {events ? events.events.length : <span className="pulse">…</span>}
          </div>
        </article>
      </section>

      {analysis ? <RegimeStrip bars={analysis.bars} /> : <div className="regime-pending" />}

      <div className="stack">
        {fullscreen ? <div className="card chart-placeholder" aria-hidden="true" /> : null}
        {fullscreen
          ? createPortal(chartPanel, document.body)
          : chartPanel}

        {backtest ? (
          <BacktestCards summaries={backtest.summaries} />
        ) : (
          <ResultSlot status={jobs.backtest} label="백테스트" />
        )}

        {evaluation ? (
          <EvaluationDashboard data={evaluation} />
        ) : (
          <ResultSlot status={jobs.evaluation} label="통계 평가" tall />
        )}

        <section className="card">
          <div className="panel-title">
            <h2 style={{ margin: 0, fontSize: 18 }}>탐지 이벤트</h2>
            <span className="muted">피크일 기준 전방 수익률 · 미래 데이터는 Score 계산에 사용하지 않음</span>
          </div>
          {events ? (
            <EventTable events={events.events} />
          ) : (
            <ResultSlot status={jobs.events} label="탐지 이벤트" nested />
          )}
        </section>
      </div>

      <p className="disclaimer">
        {analysis?.trading_value_note} 이 화면의 상태는 실제 세력이나 내부자 거래를 확정하지 않으며, 과거 수익률이
        미래 성과를 보장하지 않습니다.
      </p>

      {showDock ? <AnalysisProgress jobs={progressJobs} onDismiss={() => setDockOpen(false)} /> : null}
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<main className="shell">불러오는 중…</main>}>
      <AnalyzeInner />
    </Suspense>
  );
}
