from __future__ import annotations

import json
from datetime import date, timedelta

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import ALGORITHM_VERSION, MARKET_INDEX, STATE_LABELS_KO, TRADING_VALUE_NOTE
from app.data.errors import DataFetchError
from app.data.source import MarketDataSource
from app.engine.backtest import summarize_backtests
from app.engine.features import feature_snapshot
from app.engine.pipeline import run_pipeline
from app.models.entities import AnalysisResult, BacktestResult, MarketData, SmartMoneyEvent, Stock


def get_or_create_stock(db: Session, market: str, symbol: str, name: str | None = None) -> Stock:
    stock = db.scalar(select(Stock).where(Stock.market == market, Stock.symbol == symbol))
    if stock is None:
        stock = Stock(market=market, symbol=symbol, name=name or symbol)
        db.add(stock)
        db.flush()
    elif name and stock.name == stock.symbol:
        stock.name = name
    return stock


def upsert_ohlcv(db: Session, stock: Stock, frame: pd.DataFrame) -> None:
    if frame.empty:
        return
    existing = {
        row.date
        for row in db.scalars(select(MarketData).where(MarketData.stock_id == stock.id)).all()
    }
    for row in frame.itertuples(index=False):
        day = row.date
        if hasattr(day, "date"):
            day = day.date()
        if day in existing:
            continue
        db.add(
            MarketData(
                stock_id=stock.id,
                date=day,
                open=float(row.open),
                high=float(row.high),
                low=float(row.low),
                close=float(row.close),
                volume=float(row.volume),
                trading_value=float(row.trading_value),
                is_adjusted=0,
            )
        )
        existing.add(day)
    db.flush()


def load_ohlcv(db: Session, stock: Stock, start: date | None = None, end: date | None = None) -> pd.DataFrame:
    stmt = select(MarketData).where(MarketData.stock_id == stock.id).order_by(MarketData.date)
    rows = db.scalars(stmt).all()
    records = [
        {
            "date": row.date,
            "open": row.open,
            "high": row.high,
            "low": row.low,
            "close": row.close,
            "volume": row.volume,
            "trading_value": row.trading_value,
        }
        for row in rows
        if (start is None or row.date >= start) and (end is None or row.date <= end)
    ]
    return pd.DataFrame.from_records(records)


def _coverage_complete(db: Session, stock: Stock, start: date, end: date) -> bool:
    rows = db.scalars(
        select(MarketData)
        .where(MarketData.stock_id == stock.id)
        .order_by(MarketData.date)
    ).all()
    in_range = [row for row in rows if start <= row.date <= end]
    if len(in_range) < 20:
        return False
    return in_range[0].date <= start + timedelta(days=14) and in_range[-1].date >= end - timedelta(days=10)


def ensure_ohlcv(
    db: Session,
    source: MarketDataSource,
    stock: Stock,
    start: date,
    end: date,
    force: bool = False,
) -> pd.DataFrame:
    if force or not _coverage_complete(db, stock, start, end):
        fetched = source.fetch_ohlcv(stock.symbol, start, end)
        upsert_ohlcv(db, stock, fetched)
    return load_ohlcv(db, stock, start, end)


def _analysis_complete(db: Session, stock: Stock, start: date, end: date) -> bool:
    bars = db.scalars(
        select(MarketData).where(
            MarketData.stock_id == stock.id,
            MarketData.date >= start,
            MarketData.date <= end,
        )
    ).all()
    if not bars:
        return False
    analyzed = db.scalars(
        select(AnalysisResult).where(
            AnalysisResult.stock_id == stock.id,
            AnalysisResult.algorithm_version == ALGORITHM_VERSION,
            AnalysisResult.date >= start,
            AnalysisResult.date <= end,
        )
    ).all()
    analyzed_dates = {row.date for row in analyzed}
    return all(row.date in analyzed_dates for row in bars)


def _replace_analysis(db: Session, stock: Stock, start: date, end: date) -> None:
    events = db.scalars(
        select(SmartMoneyEvent).where(
            SmartMoneyEvent.stock_id == stock.id,
            SmartMoneyEvent.algorithm_version == ALGORITHM_VERSION,
            SmartMoneyEvent.end_date >= start,
            SmartMoneyEvent.start_date <= end,
        )
    ).all()
    event_ids = [event.id for event in events]
    if event_ids:
        db.execute(delete(BacktestResult).where(BacktestResult.event_id.in_(event_ids)))
        db.execute(delete(SmartMoneyEvent).where(SmartMoneyEvent.id.in_(event_ids)))
    db.execute(
        delete(AnalysisResult).where(
            AnalysisResult.stock_id == stock.id,
            AnalysisResult.algorithm_version == ALGORITHM_VERSION,
            AnalysisResult.date >= start,
            AnalysisResult.date <= end,
        )
    )
    db.flush()


def persist_pipeline(db: Session, stock: Stock, result) -> None:
    for _, row in result.scored.iterrows():
        db.add(
            AnalysisResult(
                stock_id=stock.id,
                date=row["date"],
                smart_money_score=float(row["smart_money_score"]),
                confidence=float(row["confidence"]),
                state=str(row["state"]),
                features=json.dumps(feature_snapshot(row), ensure_ascii=False),
                algorithm_version=ALGORITHM_VERSION,
            )
        )
    for event, backtest in zip(result.events, result.backtests):
        stored = SmartMoneyEvent(
            stock_id=stock.id,
            start_date=event.start_date,
            end_date=event.end_date,
            peak_date=event.peak_date,
            state=event.state,
            max_score=event.max_score,
            confidence=event.confidence,
            features=json.dumps(event.features, ensure_ascii=False),
            algorithm_version=ALGORITHM_VERSION,
        )
        db.add(stored)
        db.flush()
        db.add(
            BacktestResult(
                event_id=stored.id,
                forward_return_1d=backtest.forward_return_1d,
                forward_return_5d=backtest.forward_return_5d,
                forward_return_10d=backtest.forward_return_10d,
                forward_return_20d=backtest.forward_return_20d,
                forward_return_60d=backtest.forward_return_60d,
                max_drawdown=backtest.max_drawdown,
                max_gain=backtest.max_gain,
            )
        )
    db.flush()


def analyze_stock(
    db: Session,
    source: MarketDataSource,
    market: str,
    symbol: str,
    start: date,
    end: date,
    force: bool = False,
    name: str | None = None,
) -> tuple[Stock, bool]:
    if end < start:
        raise ValueError("종료일은 시작일 이후여야 합니다.")

    today = date.today()
    fetch_start = start - timedelta(days=settings.lookback_calendar_days)
    fetch_end = min(today, end + timedelta(days=settings.forward_calendar_days))

    stock = get_or_create_stock(db, market, symbol, name)
    db.commit()
    ensure_ohlcv(db, source, stock, fetch_start, fetch_end, force=force)

    index_symbol = MARKET_INDEX[market]
    index_stock = get_or_create_stock(db, market, index_symbol, name=f"{market} Index")
    db.commit()
    try:
        ensure_ohlcv(db, source, index_stock, fetch_start, fetch_end, force=force)
    except DataFetchError:
        pass

    cached = not force and _analysis_complete(db, stock, start, end)
    if cached:
        db.commit()
        return stock, True

    ohlcv = load_ohlcv(db, stock, fetch_start, fetch_end)
    market_ohlcv = load_ohlcv(db, index_stock, fetch_start, fetch_end)
    if ohlcv.empty:
        raise ValueError("선택한 기간의 일봉 데이터를 찾지 못했습니다.")

    result = run_pipeline(ohlcv, market_ohlcv, start, end)
    _replace_analysis(db, stock, start, end)
    persist_pipeline(db, stock, result)
    db.commit()
    return stock, False


def stock_payload(stock: Stock) -> dict:
    return {"market": stock.market, "symbol": stock.symbol, "name": stock.name}


def load_analysis(db: Session, stock: Stock, start: date | None, end: date | None) -> list[dict]:
    stmt = (
        select(MarketData, AnalysisResult)
        .join(
            AnalysisResult,
            (AnalysisResult.stock_id == MarketData.stock_id) & (AnalysisResult.date == MarketData.date),
        )
        .where(
            MarketData.stock_id == stock.id,
            AnalysisResult.algorithm_version == ALGORITHM_VERSION,
        )
        .order_by(MarketData.date)
    )
    rows = db.execute(stmt).all()
    bars = []
    for market_row, analysis in rows:
        if start and market_row.date < start:
            continue
        if end and market_row.date > end:
            continue
        bars.append(
            {
                "date": market_row.date,
                "open": market_row.open,
                "high": market_row.high,
                "low": market_row.low,
                "close": market_row.close,
                "volume": market_row.volume,
                "trading_value": market_row.trading_value,
                "smart_money_score": analysis.smart_money_score,
                "confidence": analysis.confidence,
                "state": analysis.state,
                "state_label": STATE_LABELS_KO.get(analysis.state, analysis.state),
                "features": json.loads(analysis.features),
            }
        )
    return bars


def load_events(db: Session, stock: Stock) -> list[dict]:
    events = db.scalars(
        select(SmartMoneyEvent)
        .where(
            SmartMoneyEvent.stock_id == stock.id,
            SmartMoneyEvent.algorithm_version == ALGORITHM_VERSION,
        )
        .order_by(SmartMoneyEvent.start_date)
    ).all()
    payload = []
    for event in events:
        backtest = db.scalar(select(BacktestResult).where(BacktestResult.event_id == event.id))
        payload.append(
            {
                "event_id": event.id,
                "start_date": event.start_date,
                "end_date": event.end_date,
                "peak_date": event.peak_date,
                "state": event.state,
                "state_label": STATE_LABELS_KO.get(event.state, event.state),
                "max_score": event.max_score,
                "confidence": event.confidence,
                "features": json.loads(event.features),
                "forward_return_1d": backtest.forward_return_1d if backtest else None,
                "forward_return_5d": backtest.forward_return_5d if backtest else None,
                "forward_return_10d": backtest.forward_return_10d if backtest else None,
                "forward_return_20d": backtest.forward_return_20d if backtest else None,
                "forward_return_60d": backtest.forward_return_60d if backtest else None,
                "max_gain": backtest.max_gain if backtest else None,
                "max_drawdown": backtest.max_drawdown if backtest else None,
            }
        )
    return payload


def load_backtest_summary(db: Session, stock: Stock) -> list[dict]:
    events = db.scalars(
        select(SmartMoneyEvent).where(
            SmartMoneyEvent.stock_id == stock.id,
            SmartMoneyEvent.algorithm_version == ALGORITHM_VERSION,
        )
    ).all()
    from app.engine.events import DetectedEvent
    from app.engine.backtest import EventBacktest

    detected = []
    results = []
    for event in events:
        detected.append(
            DetectedEvent(
                start_date=event.start_date,
                end_date=event.end_date,
                peak_date=event.peak_date,
                state=event.state,
                max_score=event.max_score,
                confidence=event.confidence,
                features=json.loads(event.features),
            )
        )
        backtest = db.scalar(select(BacktestResult).where(BacktestResult.event_id == event.id))
        results.append(
            EventBacktest(
                peak_date=event.peak_date,
                forward_return_1d=backtest.forward_return_1d if backtest else None,
                forward_return_5d=backtest.forward_return_5d if backtest else None,
                forward_return_10d=backtest.forward_return_10d if backtest else None,
                forward_return_20d=backtest.forward_return_20d if backtest else None,
                forward_return_60d=backtest.forward_return_60d if backtest else None,
                max_gain=backtest.max_gain if backtest else None,
                max_drawdown=backtest.max_drawdown if backtest else None,
            )
        )
    return [
        summarize_backtests(detected, results, 0),
        summarize_backtests(detected, results, 60),
        summarize_backtests(detected, results, 80),
    ]


def latest_from_bars(bars: list[dict]) -> dict | None:
    if not bars:
        return None
    last = bars[-1]
    return {
        "date": last["date"],
        "smart_money_score": last["smart_money_score"],
        "confidence": last["confidence"],
        "state": last["state"],
        "state_label": last["state_label"],
    }


def notes() -> str:
    return TRADING_VALUE_NOTE
