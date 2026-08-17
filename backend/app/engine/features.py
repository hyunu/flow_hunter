from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from app.core.constants import (
    ATR_WINDOW,
    BREAKOUT_WINDOW,
    FEATURE_DECIMALS,
    LOOKBACK_BARS,
    OBV_SLOPE_WINDOW,
    VALUE_WINDOW,
    VOLUME_WINDOW,
)


def _round(value: Any, digits: int = FEATURE_DECIMALS) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return round(number, digits)


def _true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    )
    return ranges.max(axis=1)


def compute_features(ohlcv: pd.DataFrame, market: pd.DataFrame | None = None) -> pd.DataFrame:
    """Causal rolling features. Each row t uses only data at or before t."""
    if ohlcv.empty:
        return ohlcv.copy()

    df = ohlcv.copy().sort_values("date").reset_index(drop=True)
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]
    value = df["trading_value"]

    vol_ma = volume.rolling(VOLUME_WINDOW, min_periods=10).mean()
    vol_std = volume.rolling(VOLUME_WINDOW, min_periods=10).std()
    df["volume_ratio"] = volume / vol_ma.replace(0, np.nan)
    df["volume_zscore"] = (volume - vol_ma) / vol_std.replace(0, np.nan)

    val_ma = value.rolling(VALUE_WINDOW, min_periods=10).mean()
    df["value_ratio"] = value / val_ma.replace(0, np.nan)

    df["ret_1d"] = close.pct_change()
    price_range = (high - low).replace(0, np.nan)
    df["close_location"] = (close - low) / price_range

    direction = np.sign(close.diff().fillna(0.0))
    df["obv"] = (direction * volume).cumsum()
    obv_ma = df["obv"].rolling(VOLUME_WINDOW, min_periods=5).mean()
    df["obv_slope"] = df["obv"].diff(OBV_SLOPE_WINDOW)
    df["obv_trend_num"] = np.where(df["obv"] > obv_ma, 1.0, np.where(df["obv"] < obv_ma, -1.0, 0.0))

    df["ma20"] = close.rolling(20, min_periods=10).mean()
    df["ma60"] = close.rolling(LOOKBACK_BARS, min_periods=20).mean()
    df["ma120"] = close.rolling(120, min_periods=60).mean()
    df["atr"] = _true_range(df).rolling(ATR_WINDOW, min_periods=7).mean()

    high_60 = high.rolling(LOOKBACK_BARS, min_periods=20).max()
    low_60 = low.rolling(LOOKBACK_BARS, min_periods=20).min()
    df["pos_60"] = (close - low_60) / (high_60 - low_60).replace(0, np.nan)

    prev_high = high.shift(1).rolling(BREAKOUT_WINDOW, min_periods=10).max()
    df["is_breakout"] = close > prev_high

    roll_high_10 = close.rolling(10, min_periods=5).max()
    df["hold_ratio_10"] = close / roll_high_10.replace(0, np.nan)
    df["vol_ratio_ma10"] = df["volume_ratio"].rolling(10, min_periods=5).mean()

    df["market_volume_ratio"] = np.nan
    df["relative_volume"] = np.nan
    df["has_market_data"] = 0.0

    if market is not None and not market.empty:
        mkt = market.copy().sort_values("date")
        mkt_vol = mkt.set_index(pd.to_datetime(mkt["date"]))["volume"]
        mkt_ratio = mkt_vol / mkt_vol.rolling(VOLUME_WINDOW, min_periods=10).mean()
        aligned = mkt_ratio.reindex(pd.to_datetime(df["date"]))
        df["market_volume_ratio"] = aligned.to_numpy()
        df["relative_volume"] = df["volume_ratio"] / df["market_volume_ratio"].replace(0, np.nan)
        df["has_market_data"] = (~pd.isna(df["market_volume_ratio"])).astype(float)

    df["data_complete"] = (
        df[["open", "high", "low", "close", "volume"]].notna().all(axis=1).astype(float)
    )
    df["bar_index"] = np.arange(len(df), dtype=float)
    return df


def feature_snapshot(row: pd.Series) -> dict[str, Any]:
    trend = row.get("obv_trend_num")
    if trend is None or (isinstance(trend, float) and math.isnan(trend)):
        obv_trend = None
    elif trend > 0:
        obv_trend = "상승"
    elif trend < 0:
        obv_trend = "하락"
    else:
        obv_trend = "보합"

    is_breakout = row.get("is_breakout")
    if isinstance(is_breakout, (bool, np.bool_)):
        breakout_flag = bool(is_breakout)
    else:
        breakout_flag = None

    return {
        "volume_ratio": _round(row.get("volume_ratio")),
        "value_ratio": _round(row.get("value_ratio")),
        "volume_zscore": _round(row.get("volume_zscore")),
        "ret_1d": _round(row.get("ret_1d"), 6),
        "close_location": _round(row.get("close_location")),
        "obv_trend": obv_trend,
        "obv_slope": _round(row.get("obv_slope"), 2),
        "pos_60": _round(row.get("pos_60")),
        "relative_volume": _round(row.get("relative_volume")),
        "atr": _round(row.get("atr"), 4),
        "ma20": _round(row.get("ma20"), 4),
        "ma60": _round(row.get("ma60"), 4),
        "ma120": _round(row.get("ma120"), 4),
        "is_breakout": breakout_flag,
        "volume_anomaly": _round(row.get("volume_anomaly"), 4),
        "value_anomaly": _round(row.get("value_anomaly"), 4),
        "pv_behavior": _round(row.get("pv_behavior"), 4),
        "accumulation_pattern": _round(row.get("accumulation_pattern"), 4),
        "supply_demand": _round(row.get("supply_demand"), 4),
        "trend_context": _round(row.get("trend_context"), 4),
        "market_context": _round(row.get("market_context"), 4),
    }
