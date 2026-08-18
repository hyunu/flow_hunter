from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

MarketName = Literal["KOSPI", "KOSDAQ", "ETF"]


class StockOut(BaseModel):
    market: str
    symbol: str
    name: str


class AnalyzeRequest(BaseModel):
    market: MarketName
    symbol: str = Field(min_length=1, max_length=16)
    start: date
    end: date
    force: bool = False


class FeatureSnapshot(BaseModel):
    volume_ratio: float | None = None
    value_ratio: float | None = None
    volume_zscore: float | None = None
    ret_1d: float | None = None
    close_location: float | None = None
    obv_trend: str | None = None
    obv_slope: float | None = None
    pos_60: float | None = None
    relative_volume: float | None = None
    atr: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    ma120: float | None = None
    is_breakout: bool | None = None
    volume_anomaly: float | None = None
    value_anomaly: float | None = None
    pv_behavior: float | None = None
    accumulation_pattern: float | None = None
    supply_demand: float | None = None
    trend_context: float | None = None
    market_context: float | None = None


class BarOut(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    trading_value: float
    smart_money_score: float
    confidence: float
    state: str
    state_label: str
    features: dict[str, Any]


class LatestSnapshot(BaseModel):
    date: date
    smart_money_score: float
    confidence: float
    state: str
    state_label: str


class AnalyzeSummary(BaseModel):
    stock: StockOut
    algorithm_version: str
    trading_value_note: str
    start: date
    end: date
    bar_count: int
    event_count: int
    latest: LatestSnapshot | None
    cached: bool


class AnalysisResponse(BaseModel):
    stock: StockOut
    algorithm_version: str
    trading_value_note: str
    latest: LatestSnapshot | None
    bars: list[BarOut]


class EventOut(BaseModel):
    event_id: int
    start_date: date
    end_date: date
    peak_date: date
    state: str
    state_label: str
    max_score: float
    confidence: float
    features: dict[str, Any]
    forward_return_1d: float | None = None
    forward_return_5d: float | None = None
    forward_return_10d: float | None = None
    forward_return_20d: float | None = None
    forward_return_60d: float | None = None
    max_gain: float | None = None
    max_drawdown: float | None = None


class EventsResponse(BaseModel):
    stock: StockOut
    algorithm_version: str
    events: list[EventOut]


class BacktestSummary(BaseModel):
    min_score: float
    event_count: int
    avg_return_1d: float | None
    avg_return_5d: float | None
    avg_return_10d: float | None
    avg_return_20d: float | None
    avg_return_60d: float | None
    win_rate_20d: float | None
    avg_max_gain: float | None
    avg_max_drawdown: float | None


class BacktestResponse(BaseModel):
    stock: StockOut
    algorithm_version: str
    summaries: list[BacktestSummary]


class BracketStatsOut(BaseModel):
    range_label: str
    count: int
    avg_return_1d: float | None = None
    avg_return_5d: float | None = None
    avg_return_10d: float | None = None
    avg_return_20d: float | None = None
    avg_return_60d: float | None = None
    median_return_20d: float | None = None
    win_rate_20d: float | None = None


class ICOut(BaseModel):
    ic_1d: float | None = None
    ic_5d: float | None = None
    ic_10d: float | None = None
    ic_20d: float | None = None
    ic_60d: float | None = None
    p_value_20d: float | None = None


class SignificanceOut(BaseModel):
    t_stat: float | None = None
    p_value: float | None = None
    high_score_count: int
    all_count: int
    high_score_avg_20d: float | None = None
    all_avg_20d: float | None = None


class BootstrapOut(BaseModel):
    mean_20d: float | None = None
    ci_95_lower: float | None = None
    ci_95_upper: float | None = None
    n_resamples: int


class WalkForwardWindowOut(BaseModel):
    window_start: str
    window_end: str
    events: int
    avg_return_20d: float | None = None


class WalkForwardOut(BaseModel):
    windows: int
    total_events: int
    avg_return_20d: float | None = None
    win_rate_20d: float | None = None
    avg_events_per_window: float | None = None
    details: list[WalkForwardWindowOut]


class MonteCarloOut(BaseModel):
    actual_avg_return_20d: float | None = None
    null_mean: float | None = None
    null_std: float | None = None
    p_value: float | None = None
    n_simulations: int


class RiskOut(BaseModel):
    sharpe_1d: float | None = None
    sharpe_20d: float | None = None
    max_drawdown: float | None = None
    calmar_ratio: float | None = None


class BenchmarkOut(BaseModel):
    benchmark_avg_return_20d: float | None = None
    strategy_avg_return_20d: float | None = None
    excess_return_20d: float | None = None
    information_ratio: float | None = None


class EvaluationResponse(BaseModel):
    stock: StockOut
    algorithm_version: str
    bar_count: int
    brackets: list[BracketStatsOut]
    ic: ICOut
    monotonicity_score: float
    significance: SignificanceOut
    bootstrap: BootstrapOut
    walk_forward: WalkForwardOut
    monte_carlo: MonteCarloOut
    risk: RiskOut
    benchmark: BenchmarkOut
