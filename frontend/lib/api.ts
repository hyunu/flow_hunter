import type {
  AnalysisResponse,
  AnalyzeSummary,
  BacktestResponse,
  EventsResponse,
  MarketName,
  Stock,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `요청 실패 (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      if (response.status === 429 || response.status === 509 || response.status === 503) {
        detail = "시세 서버가 잠시 요청을 제한했습니다. 몇 초 후 다시 시도하세요.";
      }
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function searchStocks(market: MarketName, query: string): Promise<Stock[]> {
  const params = new URLSearchParams({ market, q: query });
  return request(`/api/stocks?${params.toString()}`);
}

export function analyzeStock(payload: {
  market: MarketName;
  symbol: string;
  start: string;
  end: string;
  force?: boolean;
}): Promise<AnalyzeSummary> {
  return request("/api/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAnalysis(
  symbol: string,
  market: MarketName,
  start: string,
  end: string,
): Promise<AnalysisResponse> {
  const params = new URLSearchParams({ market, start, end });
  return request(`/api/analysis/${symbol}?${params.toString()}`);
}

export function fetchEvents(symbol: string, market: MarketName): Promise<EventsResponse> {
  return request(`/api/events/${symbol}?market=${market}`);
}

export function fetchBacktest(symbol: string, market: MarketName): Promise<BacktestResponse> {
  return request(`/api/backtest/${symbol}?market=${market}`);
}
