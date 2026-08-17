from __future__ import annotations

import math

import pandas as pd

from app.core.constants import (
    ACCUMULATION_MIN_DAYS,
    STATE_ACCUMULATION,
    STATE_ACCUMULATION_START,
    STATE_BREAKOUT,
    STATE_DISTRIBUTION,
    STATE_EXIT,
    STATE_NORMAL,
    STATE_STRONG_INTERVENTION,
)


def _num(value: object, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number) or math.isinf(number):
        return default
    return number


def _transition(
    prev: str,
    score: float,
    vol_ratio: float,
    val_ratio: float,
    ret_1d: float,
    pos_60: float,
    close_location: float,
    is_breakout: bool,
    accum_streak: int,
    low_score_streak: int,
) -> str:
    strong = score >= 70.0 and vol_ratio >= 2.0 and val_ratio >= 2.0
    dist = pos_60 >= 0.82 and vol_ratio >= 1.4 and ret_1d <= 0.005 and score >= 45.0
    accum = score >= 40.0 and vol_ratio >= 1.15 and ret_1d > -0.035 and pos_60 <= 0.75
    in_setup = prev in {
        STATE_ACCUMULATION_START,
        STATE_ACCUMULATION,
        STATE_STRONG_INTERVENTION,
    }

    if strong:
        return STATE_STRONG_INTERVENTION

    if in_setup and is_breakout and ret_1d > 0 and vol_ratio >= 1.3:
        return STATE_BREAKOUT

    if prev == STATE_BREAKOUT and is_breakout and ret_1d >= 0:
        return STATE_BREAKOUT

    if dist and prev in {
        STATE_BREAKOUT,
        STATE_STRONG_INTERVENTION,
        STATE_ACCUMULATION,
        STATE_DISTRIBUTION,
    }:
        return STATE_DISTRIBUTION

    if dist and pos_60 >= 0.9 and score >= 55.0:
        return STATE_DISTRIBUTION

    if prev in {
        STATE_ACCUMULATION_START,
        STATE_ACCUMULATION,
        STATE_STRONG_INTERVENTION,
        STATE_BREAKOUT,
        STATE_DISTRIBUTION,
    }:
        if score < 25.0 or (score < 30.0 and low_score_streak >= 2):
            return STATE_EXIT

    if prev == STATE_EXIT:
        if accum:
            return STATE_ACCUMULATION_START
        if score < 40.0:
            return STATE_NORMAL if low_score_streak >= 3 else STATE_EXIT

    if accum:
        if prev == STATE_ACCUMULATION:
            return STATE_ACCUMULATION
        if prev == STATE_ACCUMULATION_START and accum_streak >= ACCUMULATION_MIN_DAYS:
            return STATE_ACCUMULATION
        if prev == STATE_ACCUMULATION_START:
            return STATE_ACCUMULATION_START
        return STATE_ACCUMULATION_START

    if prev == STATE_ACCUMULATION and score >= 35.0 and ret_1d > -0.04:
        return STATE_ACCUMULATION
    if prev == STATE_ACCUMULATION_START and score >= 35.0:
        return STATE_ACCUMULATION_START
    if prev == STATE_STRONG_INTERVENTION and score >= 55.0:
        return STATE_STRONG_INTERVENTION
    if prev == STATE_DISTRIBUTION and score >= 40.0 and pos_60 >= 0.7:
        return STATE_DISTRIBUTION
    if prev == STATE_BREAKOUT and score >= 45.0:
        return STATE_BREAKOUT

    return STATE_NORMAL


def assign_states(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    states: list[str] = []
    prev = STATE_NORMAL
    accum_streak = 0
    low_score_streak = 0

    for row in out.itertuples(index=False):
        score = _num(getattr(row, "smart_money_score"))
        low_score_streak = low_score_streak + 1 if score < 30.0 else 0
        state = _transition(
            prev=prev,
            score=score,
            vol_ratio=_num(getattr(row, "volume_ratio", 1.0), 1.0),
            val_ratio=_num(getattr(row, "value_ratio", 1.0), 1.0),
            ret_1d=_num(getattr(row, "ret_1d", 0.0)),
            pos_60=_num(getattr(row, "pos_60", 0.5), 0.5),
            close_location=_num(getattr(row, "close_location", 0.5), 0.5),
            is_breakout=bool(getattr(row, "is_breakout", False)),
            accum_streak=accum_streak,
            low_score_streak=low_score_streak,
        )
        if state in {STATE_ACCUMULATION_START, STATE_ACCUMULATION}:
            accum_streak = accum_streak + 1 if prev in {STATE_ACCUMULATION_START, STATE_ACCUMULATION} else 1
        else:
            accum_streak = 0
        states.append(state)
        prev = state

    out["state"] = states
    return out
