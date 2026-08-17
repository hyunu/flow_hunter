from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.constants import (
    COMPONENT_ACTIVE_THRESHOLD,
    SCORE_DECIMALS,
    SINGLE_FACTOR_SCORE_CAP,
    TWO_FACTOR_SCORE_CAP,
    WEIGHTS,
)


def _clip_score(series: pd.Series) -> pd.Series:
    return series.clip(lower=0.0, upper=100.0)


def _ratio_score(ratio: pd.Series, low: float = 1.0, high: float = 3.0) -> pd.Series:
    scaled = (ratio - low) / (high - low) * 100.0
    return _clip_score(scaled.fillna(0.0))


def _volume_anomaly(df: pd.DataFrame) -> pd.Series:
    ratio_part = _ratio_score(df["volume_ratio"])
    z = df["volume_zscore"].fillna(0.0)
    z_part = _clip_score((z - 0.5) / 2.5 * 100.0)
    return 0.7 * ratio_part + 0.3 * z_part


def _value_anomaly(df: pd.DataFrame) -> pd.Series:
    return _ratio_score(df["value_ratio"])


def _pv_behavior(df: pd.DataFrame) -> pd.Series:
    vol = df["volume_ratio"].fillna(1.0)
    ret = df["ret_1d"].fillna(0.0)
    loc = df["close_location"].fillna(0.5)
    score = pd.Series(0.0, index=df.index)

    vol_high = vol >= 1.5
    up = ret > 0.01
    flat = ret.abs() <= 0.01
    down = ret < -0.01

    score = np.where(vol_high & up, np.clip(70.0 + ret * 800.0, 70.0, 100.0), score)
    score = np.where(vol_high & flat, 82.0, score)
    score = np.where(vol_high & down & (loc >= 0.55), 72.0, score)
    score = np.where(vol_high & down & (loc < 0.35), 22.0, score)
    score = np.where((vol < 0.8) & (ret > 0.02), 18.0, score)

    fallback = np.clip(vol / 1.8 * 50.0, 0.0, 50.0)
    unset = pd.Series(score, index=df.index) == 0.0
    score = np.where(unset, fallback, score)
    return pd.Series(score, index=df.index).clip(0.0, 100.0)


def _accumulation_pattern(df: pd.DataFrame) -> pd.Series:
    vol_elevated = df["vol_ratio_ma10"].fillna(1.0) >= 1.15
    price_hold = df["hold_ratio_10"].fillna(1.0) >= 0.92
    in_base = df["pos_60"].fillna(0.5) <= 0.75
    limited_drop = df["ret_1d"].fillna(0.0) > -0.035
    score = (
        vol_elevated.astype(float) * 40.0
        + price_hold.astype(float) * 30.0
        + in_base.astype(float) * 20.0
        + limited_drop.astype(float) * 10.0
    )
    return score.clip(0.0, 100.0)


def _supply_demand(df: pd.DataFrame) -> pd.Series:
    loc = df["close_location"].fillna(0.5) * 50.0
    obv = ((df["obv_trend_num"].fillna(0.0) + 1.0) / 2.0) * 50.0
    return (loc + obv).clip(0.0, 100.0)


def _trend_context(df: pd.DataFrame) -> pd.Series:
    close = df["close"]
    ma20 = df["ma20"]
    ma60 = df["ma60"]
    above_ma20 = (close >= ma20).fillna(False)
    ma20_up = (ma20 >= ma20.shift(5)).fillna(False)
    recovering = (close >= ma60).fillna(False)
    not_extended = df["pos_60"].fillna(0.5) <= 0.9
    score = (
        above_ma20.astype(float) * 30.0
        + ma20_up.astype(float) * 30.0
        + recovering.astype(float) * 20.0
        + not_extended.astype(float) * 20.0
    )
    return score.clip(0.0, 100.0)


def _market_context(df: pd.DataFrame) -> pd.Series:
    rel = df["relative_volume"]
    score = _ratio_score(rel.fillna(1.0), low=0.9, high=2.2)
    score = score.where(df["has_market_data"] > 0, 0.0)
    return score


def _apply_market_discount(volume: pd.Series, value: pd.Series, df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    market_ratio = df["market_volume_ratio"].fillna(1.0)
    stock_ratio = df["volume_ratio"].fillna(1.0)
    uniqueness = (stock_ratio / market_ratio.replace(0, np.nan)).clip(0.0, 2.0) / 2.0
    uniqueness = uniqueness.fillna(1.0)
    spike = market_ratio >= 1.5
    discount = np.where(spike & (df["has_market_data"] > 0), 0.5 + 0.5 * uniqueness, 1.0)
    discount = pd.Series(discount, index=df.index)
    return volume * discount, value * discount


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    volume = _volume_anomaly(out)
    value = _value_anomaly(out)
    volume, value = _apply_market_discount(volume, value, out)

    out["volume_anomaly"] = volume.clip(0.0, 100.0)
    out["value_anomaly"] = value.clip(0.0, 100.0)
    out["pv_behavior"] = _pv_behavior(out)
    out["accumulation_pattern"] = _accumulation_pattern(out)
    out["supply_demand"] = _supply_demand(out)
    out["trend_context"] = _trend_context(out)
    out["market_context"] = _market_context(out)

    components = [
        "volume_anomaly",
        "value_anomaly",
        "pv_behavior",
        "accumulation_pattern",
        "supply_demand",
        "trend_context",
        "market_context",
    ]
    weighted = sum(out[name] * WEIGHTS[name] for name in components)
    volume_family = (
        (out["volume_anomaly"] >= COMPONENT_ACTIVE_THRESHOLD)
        | (out["value_anomaly"] >= COMPONENT_ACTIVE_THRESHOLD)
    ).astype(int)
    other_families = [
        "pv_behavior",
        "accumulation_pattern",
        "supply_demand",
        "trend_context",
        "market_context",
    ]
    active_count = volume_family + sum(
        (out[name] >= COMPONENT_ACTIVE_THRESHOLD).astype(int) for name in other_families
    )
    score = weighted.copy()
    score = np.where(active_count <= 1, np.minimum(score, SINGLE_FACTOR_SCORE_CAP), score)
    score = np.where(active_count == 2, np.minimum(score, TWO_FACTOR_SCORE_CAP), score)
    out["smart_money_score"] = pd.Series(score, index=out.index).clip(0.0, 100.0).round(SCORE_DECIMALS)
    out["active_component_count"] = active_count

    lookback = (out["bar_index"] + 1.0).clip(upper=60.0) / 60.0
    agreement = (active_count / 6.0).clip(0.0, 1.0)
    completeness = out["data_complete"].fillna(0.0)
    market_bonus = out["has_market_data"].fillna(0.0)
    confidence = lookback * 40.0 + agreement * 30.0 + completeness * 20.0 + market_bonus * 10.0
    short_history = out["bar_index"] < 19
    confidence = np.where(short_history, np.minimum(confidence, 45.0), confidence)
    out["confidence"] = pd.Series(confidence, index=out.index).clip(0.0, 100.0).round(SCORE_DECIMALS)
    return out
