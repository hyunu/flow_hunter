from datetime import date
import re
import time
from io import StringIO

import pandas as pd
import requests

from app.data.errors import DataFetchError
from app.data.source import OHLCV_COLUMNS

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": "https://finance.naver.com/",
}

NAVER_SYMBOL = {
    "KS11": "KOSPI",
    "KQ11": "KOSDAQ",
    "KOSPI": "KOSPI",
    "KOSDAQ": "KOSDAQ",
}

RETRY_STATUSES = {429, 509, 502, 503, 504}


def _to_ohlcv(raw: pd.DataFrame) -> pd.DataFrame:
    if raw is None or raw.empty:
        return pd.DataFrame(columns=OHLCV_COLUMNS)
    columns = {col.lower(): col for col in raw.columns}
    required = ["open", "high", "low", "close", "volume"]
    if any(name not in columns for name in required):
        return pd.DataFrame(columns=OHLCV_COLUMNS)
    out = pd.DataFrame(
        {
            "date": pd.to_datetime(raw.index).date,
            "open": pd.to_numeric(raw[columns["open"]], errors="coerce"),
            "high": pd.to_numeric(raw[columns["high"]], errors="coerce"),
            "low": pd.to_numeric(raw[columns["low"]], errors="coerce"),
            "close": pd.to_numeric(raw[columns["close"]], errors="coerce"),
            "volume": pd.to_numeric(raw[columns["volume"]], errors="coerce"),
        }
    )
    out = out.dropna(subset=["open", "high", "low", "close", "volume"])
    out["trading_value"] = out["close"] * out["volume"]
    out = out.drop_duplicates("date").sort_values("date")
    return out.reset_index(drop=True)


def _parse_naver_chart(text: str) -> pd.DataFrame:
    data_list = re.findall(r'<item data="(.*?)" />', text)
    if not data_list:
        return pd.DataFrame()
    frame = pd.read_csv(StringIO("\n".join(data_list)), delimiter="|", header=None, dtype={0: str})
    frame.columns = ["Date", "Open", "High", "Low", "Close", "Volume"]
    frame["Date"] = pd.to_datetime(frame["Date"], format="%Y%m%d")
    return frame.set_index("Date").sort_index()


def fetch_naver_daily(symbol: str, start: date, end: date) -> pd.DataFrame:
    code = NAVER_SYMBOL.get(symbol, symbol)
    url = (
        "https://fchart.stock.naver.com/sise.nhn"
        f"?timeframe=day&count=6000&requestType=0&symbol={code}"
    )
    last_error = None
    for attempt in range(4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code in RETRY_STATUSES:
                last_error = DataFetchError(
                    "시세 서버가 요청을 잠시 제한했습니다. 몇 초 후 다시 시도하세요."
                )
                time.sleep(1.2 * (attempt + 1))
                continue
            response.raise_for_status()
            raw = _parse_naver_chart(response.text)
            if raw.empty:
                return pd.DataFrame(columns=OHLCV_COLUMNS)
            sliced = raw.loc[pd.to_datetime(start) : pd.to_datetime(end)]
            return _to_ohlcv(sliced)
        except requests.RequestException as exc:
            last_error = DataFetchError("시세 서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.")
            time.sleep(1.0 * (attempt + 1))
            last_error.__cause__ = exc
    if last_error:
        raise last_error
    return pd.DataFrame(columns=OHLCV_COLUMNS)


class FinanceDataReaderSource:
    def list_stocks(self, market: str) -> pd.DataFrame:
        import FinanceDataReader as fdr

        try:
            raw = fdr.StockListing(market)
        except Exception as exc:
            raise DataFetchError("종목 목록을 가져오지 못했습니다. 기본 종목으로 검색하세요.") from exc
        if raw is None or raw.empty:
            return pd.DataFrame(columns=["symbol", "name", "market"])

        code_col = "Code" if "Code" in raw.columns else "Symbol"
        name_col = "Name"
        frame = pd.DataFrame(
            {
                "symbol": raw[code_col].astype(str),
                "name": raw[name_col].astype(str),
                "market": market,
            }
        )
        return frame.drop_duplicates("symbol").reset_index(drop=True)

    def fetch_ohlcv(self, symbol: str, start: date, end: date) -> pd.DataFrame:
        try:
            frame = fetch_naver_daily(symbol, start, end)
            if not frame.empty:
                return frame
        except DataFetchError:
            raise
        except Exception:
            pass

        import FinanceDataReader as fdr

        try:
            raw = fdr.DataReader(symbol, start.isoformat(), end.isoformat())
        except Exception as exc:
            raise DataFetchError("일봉 데이터를 가져오지 못했습니다. 잠시 후 다시 시도하세요.") from exc
        return _to_ohlcv(raw)
