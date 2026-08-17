from datetime import date

from app.engine.pipeline import run_pipeline
from tests.helpers import make_ohlcv


def test_score_ignores_future_prices() -> None:
    ohlcv = make_ohlcv(n=100)
    market = make_ohlcv(n=100, volume=50_000_000)
    start, end = ohlcv["date"].iloc[20], ohlcv["date"].iloc[-1]
    baseline = run_pipeline(ohlcv, market, start, end)

    mutated = ohlcv.copy()
    future_index = 80
    mutated.loc[future_index, "close"] *= 1.8
    mutated.loc[future_index, "high"] *= 1.8
    mutated.loc[future_index, "trading_value"] = (
        mutated.loc[future_index, "close"] * mutated.loc[future_index, "volume"]
    )
    compared = run_pipeline(mutated, market, start, end)

    cutoff = ohlcv["date"].iloc[future_index - 1]
    base_slice = baseline.scored[baseline.scored["date"] <= cutoff]
    other_slice = compared.scored[compared.scored["date"] <= cutoff]
    assert base_slice["smart_money_score"].tolist() == other_slice["smart_money_score"].tolist()
    assert base_slice["state"].tolist() == other_slice["state"].tolist()
    assert base_slice["confidence"].tolist() == other_slice["confidence"].tolist()


def test_features_do_not_use_next_bar_volume() -> None:
    ohlcv = make_ohlcv(n=80)
    market = make_ohlcv(n=80, volume=40_000_000)
    start, end = ohlcv["date"].iloc[20], ohlcv["date"].iloc[60]
    baseline = run_pipeline(ohlcv, market, start, end)

    mutated = ohlcv.copy()
    mutated.loc[70, "volume"] *= 8
    mutated.loc[70, "trading_value"] = mutated.loc[70, "close"] * mutated.loc[70, "volume"]
    compared = run_pipeline(mutated, market, start, end)

    assert baseline.scored["smart_money_score"].tolist() == compared.scored["smart_money_score"].tolist()
