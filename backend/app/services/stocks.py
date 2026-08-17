from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import MARKET_INDEX
from app.data.source import MarketDataSource
from app.models.entities import Stock
from app.services.listings import ensure_listings


def search_stocks(db: Session, source: MarketDataSource, market: str, query: str = "") -> list[Stock]:
    ensure_listings(db, source, market)
    index_symbols = list(MARKET_INDEX.values())
    stmt = select(Stock).where(Stock.market == market, Stock.symbol.not_in(index_symbols))
    if query:
        like = f"%{query.strip()}%"
        stmt = stmt.where((Stock.name.like(like)) | (Stock.symbol.like(like)))
    stmt = stmt.order_by(Stock.name).limit(30)
    return list(db.scalars(stmt).all())


def resolve_stock(db: Session, market: str, symbol: str) -> Stock | None:
    return db.scalar(select(Stock).where(Stock.market == market, Stock.symbol == symbol))
