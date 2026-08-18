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

export type BracketStats = {
  range_label: string;
  count: number;
  avg_return_1d: number | null;
  avg_return_5d: number | null;
  avg_return_10d: number | null;
  avg_return_20d: number | null;
  avg_return_60d: number | null;
  median_return_20d: number | null;
  win_rate_20d: number | null;
};

export type ICResult = {
  ic_1d: number | null;
  ic_5d: number | null;
  ic_10d: number | null;
  ic_20d: number | null;
  ic_60d: number | null;
  p_value_20d: number | null;
};

export type SignificanceResult = {
  t_stat: number | null;
  p_value: number | null;
  high_score_count: number;
  all_count: number;
  high_score_avg_20d: number | null;
  all_avg_20d: number | null;
};

export type BootstrapResult = {
  mean_20d: number | null;
  ci_95_lower: number | null;
  ci_95_upper: number | null;
  n_resamples: number;
};

export type WalkForwardWindow = {
  window_start: string;
  window_end: string;
  events: number;
  avg_return_20d: number | null;
};

export type WalkForwardResult = {
  windows: number;
  total_events: number;
  avg_return_20d: number | null;
  win_rate_20d: number | null;
  avg_events_per_window: number | null;
  details: WalkForwardWindow[];
};

export type MonteCarloResult = {
  actual_avg_return_20d: number | null;
  null_mean: number | null;
  null_std: number | null;
  p_value: number | null;
  n_simulations: number;
};

export type RiskResult = {
  sharpe_1d: number | null;
  sharpe_20d: number | null;
  max_drawdown: number | null;
  calmar_ratio: number | null;
};

export type BenchmarkResult = {
  benchmark_avg_return_20d: number | null;
  strategy_avg_return_20d: number | null;
  excess_return_20d: number | null;
  information_ratio: number | null;
};

export type EvaluationResponse = {
  stock: Stock;
  algorithm_version: string;
  bar_count: number;
  brackets: BracketStats[];
  ic: ICResult;
  monotonicity_score: number;
  significance: SignificanceResult;
  bootstrap: BootstrapResult;
  walk_forward: WalkForwardResult;
  monte_carlo: MonteCarloResult;
  risk: RiskResult;
  benchmark: BenchmarkResult;
};
