from fastapi import Depends
from sqlalchemy.orm import Session

from app.data.fdr import FinanceDataReaderSource
from app.data.source import MarketDataSource
from app.db.session import get_db

_source = FinanceDataReaderSource()


def get_source() -> MarketDataSource:
    return _source


def db_session(db: Session = Depends(get_db)) -> Session:
    return db
