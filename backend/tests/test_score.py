import hashlib
import json

from app.core.constants import ALGORITHM_VERSION, SINGLE_FACTOR_SCORE_CAP
from app.engine.pipeline import run_pipeline
from tests.helpers import make_ohlcv


def test_reproducible_scores() -> None:
    ohlcv = make_ohlcv(n=90, spikes={60: 2.4, 61: 2.1})
    market = make_ohlcv(n=90, volume=30_000_000)
    start, end = ohlcv["date"].iloc[25], ohlcv["date"].iloc[-1]
    first = run_pipeline(ohlcv, market, start, end)
    second = run_pipeline(ohlcv.copy(), market.copy(), start, end)
    payload = first.scored[["date", "smart_money_score", "confidence", "state"]].to_dict(orient="records")
    other = second.scored[["date", "smart_money_score", "confidence", "state"]].to_dict(orient="records")
    left = hashlib.sha256(json.dumps(payload, default=str).encode()).hexdigest()
    right = hashlib.sha256(json.dumps(other, default=str).encode()).hexdigest()
    assert left == right
    assert first.algorithm_version == ALGORITHM_VERSION


def test_single_volume_dump_is_capped() -> None:
    ohlcv = make_ohlcv(
        n=80,
        close_step=0.0,
        spikes={70: 2.4},
        returns={70: -0.05},
    )
    ohlcv.loc[70, "low"] = ohlcv.loc[70, "close"] - 5
    ohlcv.loc[70, "high"] = ohlcv.loc[70, "close"] + 80
    ohlcv.loc[70, "trading_value"] = ohlcv.loc[70, "close"] * ohlcv.loc[70, "volume"]
    market = make_ohlcv(n=80, volume=40_000_000, close_step=0.0, spikes={70: 2.4})
    result = run_pipeline(ohlcv, market, ohlcv["date"].iloc[20], ohlcv["date"].iloc[-1])
    spike_row = result.scored[result.scored["date"] == ohlcv.loc[70, "date"]].iloc[0]
    assert spike_row["smart_money_score"] <= SINGLE_FACTOR_SCORE_CAP
