from datetime import date
from typing import Protocol

import pandas as pd


OHLCV_COLUMNS = ["date", "open", "high", "low", "close", "volume", "trading_value"]


class MarketDataSource(Protocol):
    def list_stocks(self, market: str) -> pd.DataFrame:
        """Return columns: symbol, name, market."""

    def fetch_ohlcv(self, symbol: str, start: date, end: date) -> pd.DataFrame:
        """Return OHLCV_COLUMNS with date as datetime.date."""
