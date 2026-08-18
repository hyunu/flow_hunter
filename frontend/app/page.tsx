"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyzeStock, searchStocks } from "@/lib/api";
import { defaultRange } from "@/lib/format";
import type { MarketName, Stock } from "@/lib/types";

const DEFAULT_STOCK: Stock = { market: "KOSPI", symbol: "005930", name: "삼성전자" };
const DEFAULT_ETF: Stock = { market: "ETF", symbol: "069500", name: "KODEX 200" };

function matchesQuery(stock: Stock, query: string): boolean {
  const needle = query.trim();
  return stock.name === needle || stock.symbol === needle;
}

export default function HomePage() {
  const router = useRouter();
  const range = useMemo(() => defaultRange(), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const [market, setMarket] = useState<MarketName>("KOSPI");
  const [query, setQuery] = useState(DEFAULT_STOCK.name);
  const [selected, setSelected] = useState<Stock | null>(DEFAULT_STOCK);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      searchStocks(market, query)
        .then((rows) => {
          if (cancelled) return;
          setStocks(rows);
          const exact = rows.find((row) => matchesQuery(row, query));
          if (exact) setSelected(exact);
          else if (rows.length === 1 && query.trim()) setSelected(rows[0]);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [market, query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(stock: Stock) {
    setSelected(stock);
    setQuery(stock.name);
    setOpen(false);
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const stock =
      selected ??
      stocks.find((item) => matchesQuery(item, query)) ??
      (stocks.length === 1 ? stocks[0] : null) ??
      (query.trim() === DEFAULT_STOCK.name || query.trim() === DEFAULT_STOCK.symbol
        ? { ...DEFAULT_STOCK, market }
        : query.trim() === DEFAULT_ETF.name || query.trim() === DEFAULT_ETF.symbol
          ? { ...DEFAULT_ETF, market }
          : null);
    if (!stock) {
      setOpen(true);
      setError("검색 결과에서 종목을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setOpen(false);
    try {
      await analyzeStock({
        market,
        symbol: stock.symbol,
        start,
        end,
      });
      const params = new URLSearchParams({ market, start, end, name: stock.name });
      router.push(`/analyze/${stock.symbol}?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          Flow<span>Hunter</span>
        </div>
        <div className="tagline">
          algorithm v0.1.0 · 일봉 MVP
          <Link className="text-btn" href="/guide">
            설명
          </Link>
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>대규모 자금 활동 가능성을 차트에서 추적합니다.</h1>
          <p>
            특정 주체를 식별하지 않습니다. 거래량, 거래대금, 가격 행동과 시장 맥락을 결합해
            Smart Money Score와 매집·개입·돌파·분산 구간을 추정하고, 이후 실제 수익률로 검증합니다.{" "}
            <Link href="/guide">용어와 보는 법</Link>
          </p>
        </div>
        <form className="card form-grid" onSubmit={onSubmit}>
          <div className="row">
            <label>
              시장
              <select
                value={market}
                onChange={(event) => {
                  const next = event.target.value as MarketName;
                  setMarket(next);
                  if (next === DEFAULT_STOCK.market) {
                    setSelected(DEFAULT_STOCK);
                    setQuery(DEFAULT_STOCK.name);
                  } else if (next === DEFAULT_ETF.market) {
                    setSelected(DEFAULT_ETF);
                    setQuery(DEFAULT_ETF.name);
                  } else {
                    setSelected(null);
                    setQuery("");
                  }
                }}
              >
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
                <option value="ETF">ETF</option>
              </select>
            </label>
            <label>
              주기
              <input value="일봉" readOnly />
            </label>
          </div>
          <label>
            종목
            <div className="combobox" ref={boxRef}>
              <div className="combo-field">
                <input
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery(value);
                    setOpen(true);
                    if (!selected || (value !== selected.name && value !== selected.symbol)) {
                      setSelected(null);
                    }
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder="종목명 또는 코드 검색"
                  autoComplete="off"
                />
                {selected ? <span className="combo-code">{selected.symbol}</span> : null}
              </div>
              {open ? (
                <div className="combo-menu">
                  {searching ? <div className="combo-empty">검색 중…</div> : null}
                  {!searching && stocks.length === 0 ? (
                    <div className="combo-empty">검색 결과가 없습니다.</div>
                  ) : null}
                  {stocks.map((stock) => (
                    <button
                      type="button"
                      key={`${stock.market}-${stock.symbol}`}
                      className={`combo-item ${selected?.symbol === stock.symbol ? "active" : ""}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(stock)}
                    >
                      <span>{stock.name}</span>
                      <span>{stock.symbol}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>
          <div className="row">
            <label>
              시작일
              <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label>
              종료일
              <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "분석 중…" : "분석 실행"}
          </button>
          <p className="disclaimer">
            결과는 대규모 자금 활동 가능성의 추정이며, 실제 세력의 존재나 미래 수익을 보장하지 않습니다.
            거래대금은 close × volume 근사값을 사용합니다.
          </p>
        </form>
      </section>
    </main>
  );
}
