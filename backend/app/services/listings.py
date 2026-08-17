from __future__ import annotations

import json
import threading
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import DATA_DIR
from app.core.constants import MARKET_INDEX
from app.data.source import MarketDataSource
from app.db.session import SessionLocal
from app.models.entities import Stock

SEED_STOCKS = [
    ("KOSPI", "005930", "삼성전자"),
    ("KOSPI", "000660", "SK하이닉스"),
    ("KOSPI", "373220", "LG에너지솔루션"),
    ("KOSPI", "207940", "삼성바이오로직스"),
    ("KOSPI", "005380", "현대차"),
    ("KOSPI", "000270", "기아"),
    ("KOSPI", "068270", "셀트리온"),
    ("KOSPI", "035420", "NAVER"),
    ("KOSPI", "035720", "카카오"),
    ("KOSPI", "105560", "KB금융"),
    ("KOSDAQ", "247540", "에코프로비엠"),
    ("KOSDAQ", "086520", "에코프로"),
    ("KOSDAQ", "028300", "에이치엘비"),
]

_refresh_lock = threading.Lock()
_refreshing: set[str] = set()


def _index_symbols() -> list[str]:
    return list(MARKET_INDEX.values())


def _cache_path(market: str) -> Path:
    return DATA_DIR / f"listing_{market}.json"


def seed_stocks(db: Session, market: str) -> None:
    known = {
        row.symbol
        for row in db.scalars(select(Stock).where(Stock.market == market)).all()
    }
    changed = False
    for item_market, symbol, name in SEED_STOCKS:
        if item_market != market or symbol in known:
            continue
        db.add(Stock(market=market, symbol=symbol, name=name))
        known.add(symbol)
        changed = True
    if changed:
        db.commit()


def _upsert_rows(db: Session, market: str, rows: list[dict[str, str]]) -> None:
    known = {
        row.symbol
        for row in db.scalars(select(Stock).where(Stock.market == market)).all()
    }
    for row in rows:
        symbol = str(row["symbol"])
        name = str(row["name"])
        if symbol in known:
            continue
        db.add(Stock(market=market, symbol=symbol, name=name))
        known.add(symbol)
    db.commit()


def load_cached_listing(db: Session, market: str) -> bool:
    path = _cache_path(market)
    if not path.exists():
        return False
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    if not isinstance(rows, list) or not rows:
        return False
    _upsert_rows(db, market, rows)
    return True


def _save_cache(market: str, rows: list[dict[str, str]]) -> None:
    _cache_path(market).write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")


def _listed_count(db: Session, market: str) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(Stock)
            .where(Stock.market == market, Stock.symbol.not_in(_index_symbols()))
        )
        or 0
    )


def _refresh_listing(market: str, source: MarketDataSource) -> None:
    try:
        listing = source.list_stocks(market)
        rows = [
            {"symbol": str(row.symbol), "name": str(row.name)}
            for row in listing.itertuples(index=False)
        ]
        db = SessionLocal()
        try:
            _upsert_rows(db, market, rows)
            _save_cache(market, rows)
        finally:
            db.close()
    except Exception:
        pass
    finally:
        with _refresh_lock:
            _refreshing.discard(market)


def ensure_listings(db: Session, source: MarketDataSource, market: str) -> None:
    seed_stocks(db, market)
    if _listed_count(db, market) < 50:
        load_cached_listing(db, market)
    if _listed_count(db, market) >= 50:
        return
    with _refresh_lock:
        if market in _refreshing:
            return
        _refreshing.add(market)
    thread = threading.Thread(target=_refresh_listing, args=(market, source), daemon=True)
    thread.start()
