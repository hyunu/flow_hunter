from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

MarketName = Literal["KOSPI", "KOSDAQ"]


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
