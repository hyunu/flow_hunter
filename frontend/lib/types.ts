export type MarketName = "KOSPI" | "KOSDAQ";

export type Stock = {
  market: string;
  symbol: string;
  name: string;
};

export type LatestSnapshot = {
  date: string;
  smart_money_score: number;
  confidence: number;
  state: string;
  state_label: string;
};

export type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trading_value: number;
  smart_money_score: number;
  confidence: number;
  state: string;
  state_label: string;
  features: Record<string, number | string | boolean | null>;
};

export type AnalysisResponse = {
  stock: Stock;
  algorithm_version: string;
  trading_value_note: string;
  latest: LatestSnapshot | null;
  bars: Bar[];
};

export type AnalyzeSummary = {
  stock: Stock;
  algorithm_version: string;
  trading_value_note: string;
  start: string;
  end: string;
  bar_count: number;
  event_count: number;
  latest: LatestSnapshot | null;
  cached: boolean;
};

export type EventItem = {
  event_id: number;
  start_date: string;
  end_date: string;
  peak_date: string;
  state: string;
  state_label: string;
  max_score: number;
  confidence: number;
  features: Record<string, number | string | boolean | null>;
  forward_return_1d: number | null;
  forward_return_5d: number | null;
  forward_return_10d: number | null;
  forward_return_20d: number | null;
  forward_return_60d: number | null;
  max_gain: number | null;
  max_drawdown: number | null;
};

export type EventsResponse = {
  stock: Stock;
  algorithm_version: string;
  events: EventItem[];
};

export type BacktestSummary = {
  min_score: number;
  event_count: number;
  avg_return_1d: number | null;
  avg_return_5d: number | null;
  avg_return_10d: number | null;
  avg_return_20d: number | null;
  avg_return_60d: number | null;
  win_rate_20d: number | null;
  avg_max_gain: number | null;
  avg_max_drawdown: number | null;
};

export type BacktestResponse = {
  stock: Stock;
  algorithm_version: string;
  summaries: BacktestSummary[];
};
