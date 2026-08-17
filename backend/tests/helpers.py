from __future__ import annotations

from datetime import date, timedelta

import pandas as pd


def make_ohlcv(
    n: int = 120,
    start: date = date(2024, 1, 2),
    close_start: float = 10_000.0,
    close_step: float = 5.0,
    volume: float = 1_000_000.0,
    spikes: dict[int, float] | None = None,
    returns: dict[int, float] | None = None,
) -> pd.DataFrame:
    rows = []
    close = close_start
    current = start
    added = 0
    spike_map = spikes or {}
    return_map = returns or {}
    while added < n:
        if current.weekday() < 5:
            close *= 1.0 + return_map.get(added, 0.0)
            close += close_step
            high = close + 40
            low = close - 40
            vol = volume * spike_map.get(added, 1.0)
            rows.append(
                {
                    "date": current,
                    "open": close - 10,
                    "high": high,
                    "low": low,
                    "close": close,
                    "volume": vol,
                    "trading_value": close * vol,
                }
            )
            added += 1
        current += timedelta(days=1)
    return pd.DataFrame(rows)
