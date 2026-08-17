"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BacktestCards from "@/components/BacktestCards";
import BarTooltip from "@/components/BarTooltip";
import EventTable from "@/components/EventTable";
import PriceChart from "@/components/PriceChart";
import RegimeStrip from "@/components/RegimeStrip";
import { fetchAnalysis, fetchBacktest, fetchEvents } from "@/lib/api";
import { formatScore } from "@/lib/format";
import { attachMovingAverages } from "@/lib/ma";
import type { AnalysisResponse, BacktestResponse, Bar, EventsResponse, MarketName } from "@/lib/types";

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
  const [selected, setSelected] = useState<Bar | null>(null);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAnalysis(symbol, market, start, end),
      fetchEvents(symbol, market),
      fetchBacktest(symbol, market),
    ])
      .then(([analysisBody, eventsBody, backtestBody]) => {
        if (cancelled) return;
        const bars = attachMovingAverages(analysisBody.bars);
        setAnalysis({ ...analysisBody, bars });
        setEvents(eventsBody);
        setBacktest(backtestBody);
        setSelected(bars.at(-1) ?? null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, market, start, end]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
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
          <button className="text-btn" type="button" onClick={() => setFullscreen(true)}>
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
          <div className="chart-wrap" />
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
          <div className="v">{formatScore(latest?.smart_money_score)}</div>
        </article>
        <article className="metric">
          <div className="k">Confidence</div>
          <div className="v">{latest ? `${formatScore(latest.confidence)}%` : "—"}</div>
        </article>
        <article className="metric">
          <div className="k">현재 상태</div>
          <div className="v" style={{ fontSize: 22 }}>
            {latest?.state_label ?? "—"}
          </div>
        </article>
        <article className="metric">
          <div className="k">이벤트</div>
          <div className="v">{events?.events.length ?? "—"}</div>
        </article>
      </section>

      {analysis ? <RegimeStrip bars={analysis.bars} /> : null}

      <div className="stack">
        {fullscreen ? <div className="card chart-placeholder" aria-hidden="true" /> : null}
        {fullscreen
          ? createPortal(chartPanel, document.body)
          : chartPanel}

        {backtest ? <BacktestCards summaries={backtest.summaries} /> : null}

        <section className="card">
          <div className="panel-title">
            <h2 style={{ margin: 0, fontSize: 18 }}>탐지 이벤트</h2>
            <span className="muted">피크일 기준 전방 수익률 · 미래 데이터는 Score 계산에 사용하지 않음</span>
          </div>
          <EventTable events={events?.events ?? []} />
        </section>
      </div>

      <p className="disclaimer">
        {analysis?.trading_value_note} 이 화면의 상태는 실제 세력이나 내부자 거래를 확정하지 않으며, 과거 수익률이
        미래 성과를 보장하지 않습니다.
      </p>
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
