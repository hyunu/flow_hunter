from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd

from app.core.constants import SCORE_DECIMALS
from app.engine.events import DetectedEvent

HORIZONS = (1, 5, 10, 20, 60)


@dataclass(frozen=True)
class EventBacktest:
    peak_date: date
    forward_return_1d: float | None
    forward_return_5d: float | None
    forward_return_10d: float | None
    forward_return_20d: float | None
    forward_return_60d: float | None
    max_gain: float | None
    max_drawdown: float | None


def _pct(base: float, future: float | None) -> float | None:
    if future is None or base == 0:
        return None
    return round((future / base) - 1.0, SCORE_DECIMALS)


def compute_event_backtest(ohlcv: pd.DataFrame, events: list[DetectedEvent]) -> list[EventBacktest]:
    if ohlcv.empty:
        return []

    ordered = ohlcv.sort_values("date").reset_index(drop=True)
    dates = list(ordered["date"])
    closes = ordered["close"].astype(float)
    highs = ordered["high"].astype(float)
    lows = ordered["low"].astype(float)
    index = {day: i for i, day in enumerate(dates)}
    results: list[EventBacktest] = []

    for event in events:
        pos = index.get(event.peak_date)
        if pos is None:
            results.append(
                EventBacktest(
                    peak_date=event.peak_date,
                    forward_return_1d=None,
                    forward_return_5d=None,
                    forward_return_10d=None,
                    forward_return_20d=None,
                    forward_return_60d=None,
                    max_gain=None,
                    max_drawdown=None,
                )
            )
            continue

        base = float(closes.iloc[pos])
        forward: dict[int, float | None] = {}
        for horizon in HORIZONS:
            target = pos + horizon
            if target < len(closes):
                forward[horizon] = _pct(base, float(closes.iloc[target]))
            else:
                forward[horizon] = None

        window_end = min(pos + 60, len(closes) - 1)
        max_gain = None
        max_drawdown = None
        if window_end > pos:
            future_highs = highs.iloc[pos + 1 : window_end + 1]
            future_lows = lows.iloc[pos + 1 : window_end + 1]
            if not future_highs.empty:
                max_gain = _pct(base, float(future_highs.max()))
                max_drawdown = _pct(base, float(future_lows.min()))

        results.append(
            EventBacktest(
                peak_date=event.peak_date,
                forward_return_1d=forward[1],
                forward_return_5d=forward[5],
                forward_return_10d=forward[10],
                forward_return_20d=forward[20],
                forward_return_60d=forward[60],
                max_gain=max_gain,
                max_drawdown=max_drawdown,
            )
        )
    return results


def summarize_backtests(
    events: list[DetectedEvent],
    results: list[EventBacktest],
    min_score: float,
) -> dict[str, float | int | None]:
    paired = [
        (event, result)
        for event, result in zip(events, results)
        if event.max_score >= min_score
    ]
    if not paired:
        return {
            "min_score": min_score,
            "event_count": 0,
            "avg_return_1d": None,
            "avg_return_5d": None,
            "avg_return_10d": None,
            "avg_return_20d": None,
            "avg_return_60d": None,
            "win_rate_20d": None,
            "avg_max_gain": None,
            "avg_max_drawdown": None,
        }

    def average(values: list[float | None]) -> float | None:
        present = [value for value in values if value is not None]
        if not present:
            return None
        return round(sum(present) / len(present), SCORE_DECIMALS)

    returns_20 = [result.forward_return_20d for _, result in paired]
    wins = [value for value in returns_20 if value is not None]
    win_rate = round(sum(1 for value in wins if value > 0) / len(wins), SCORE_DECIMALS) if wins else None

    return {
        "min_score": min_score,
        "event_count": len(paired),
        "avg_return_1d": average([result.forward_return_1d for _, result in paired]),
        "avg_return_5d": average([result.forward_return_5d for _, result in paired]),
        "avg_return_10d": average([result.forward_return_10d for _, result in paired]),
        "avg_return_20d": average([result.forward_return_20d for _, result in paired]),
        "avg_return_60d": average([result.forward_return_60d for _, result in paired]),
        "win_rate_20d": win_rate,
        "avg_max_gain": average([result.max_gain for _, result in paired]),
        "avg_max_drawdown": average([result.max_drawdown for _, result in paired]),
    }
