from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd

from app.core.constants import ALGORITHM_VERSION
from app.engine.backtest import EventBacktest, compute_event_backtest
from app.engine.events import DetectedEvent, compress_events
from app.engine.features import compute_features
from app.engine.score import compute_scores
from app.engine.state import assign_states


@dataclass
class PipelineResult:
    algorithm_version: str
    scored: pd.DataFrame
    events: list[DetectedEvent]
    backtests: list[EventBacktest]


def run_pipeline(
    ohlcv: pd.DataFrame,
    market: pd.DataFrame | None,
    start: date,
    end: date,
) -> PipelineResult:
    features = compute_features(ohlcv, market)
    scored = compute_scores(features)
    scored = assign_states(scored)
    window = scored[(scored["date"] >= start) & (scored["date"] <= end)].copy()
    events = compress_events(scored, start=start, end=end)
    backtests = compute_event_backtest(ohlcv, events)
    return PipelineResult(
        algorithm_version=ALGORITHM_VERSION,
        scored=window.reset_index(drop=True),
        events=events,
        backtests=backtests,
    )
