from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import pandas as pd

from app.core.constants import STATE_NORMAL
from app.engine.features import feature_snapshot


@dataclass(frozen=True)
class DetectedEvent:
    start_date: date
    end_date: date
    peak_date: date
    state: str
    max_score: float
    confidence: float
    features: dict[str, Any]


def _block_event(block: pd.DataFrame) -> DetectedEvent:
    peak_idx = block["smart_money_score"].astype(float).idxmax()
    peak = block.loc[peak_idx]
    return DetectedEvent(
        start_date=block.iloc[0]["date"],
        end_date=block.iloc[-1]["date"],
        peak_date=peak["date"],
        state=str(block.iloc[0]["state"]),
        max_score=float(peak["smart_money_score"]),
        confidence=float(peak["confidence"]),
        features=feature_snapshot(peak),
    )


def compress_events(df: pd.DataFrame, start: date | None = None, end: date | None = None) -> list[DetectedEvent]:
    if df.empty:
        return []

    work = df.sort_values("date").reset_index(drop=True)
    if start is not None:
        work = work[work["date"] >= start]
    if end is not None:
        work = work[work["date"] <= end]
    work = work.reset_index(drop=True)
    if work.empty:
        return []

    events: list[DetectedEvent] = []
    block_start: int | None = None

    def close_block(end_index: int) -> None:
        nonlocal block_start
        if block_start is None:
            return
        events.append(_block_event(work.iloc[block_start:end_index]))
        block_start = None

    for i, row in work.iterrows():
        state = str(row["state"])
        if state == STATE_NORMAL:
            close_block(i)
            continue
        if block_start is None:
            block_start = int(i)
        elif str(work.iloc[int(i) - 1]["state"]) != state:
            close_block(int(i))
            block_start = int(i)
    close_block(len(work))
    return events
