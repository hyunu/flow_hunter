from datetime import date, timedelta

import pandas as pd

from app.engine.backtest import compute_event_backtest
from app.engine.events import DetectedEvent
from app.engine.pipeline import run_pipeline
from tests.helpers import make_ohlcv


def test_forward_returns_match_known_prices() -> None:
    dates = [date(2024, 1, 2) + timedelta(days=i) for i in range(10)]
    closes = [100, 101, 110, 95, 120, 130, 140, 150, 160, 170]
    ohlcv = pd.DataFrame(
        {
            "date": dates,
            "open": closes,
            "high": [price + 2 for price in closes],
            "low": [price - 2 for price in closes],
            "close": closes,
            "volume": [1_000_000] * 10,
            "trading_value": [price * 1_000_000 for price in closes],
        }
    )
    event = DetectedEvent(
        start_date=dates[0],
        end_date=dates[0],
        peak_date=dates[0],
        state="strong_intervention",
        max_score=90.0,
        confidence=80.0,
        features={},
    )
    result = compute_event_backtest(ohlcv, [event])[0]
    assert result.forward_return_1d == round(101 / 100 - 1, 4)
    assert result.forward_return_5d == round(130 / 100 - 1, 4)
    assert result.max_gain == round(172 / 100 - 1, 4)
    assert result.max_drawdown == round(93 / 100 - 1, 4)


def test_event_compression_splits_on_state_change() -> None:
    ohlcv = make_ohlcv(
        n=90,
        spikes={i: 2.6 for i in range(50, 70)},
        returns={65: 0.04, 66: 0.03},
    )
    market = make_ohlcv(n=90, volume=25_000_000)
    result = run_pipeline(ohlcv, market, ohlcv["date"].iloc[20], ohlcv["date"].iloc[-1])
    assert all(event.start_date <= event.end_date for event in result.events)
    states = [event.state for event in result.events]
    assert "normal" not in states
    if len(result.events) >= 2:
        assert result.events[0].end_date < result.events[1].start_date or result.events[0].state != result.events[1].state
