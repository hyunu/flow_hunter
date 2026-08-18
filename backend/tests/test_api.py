from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_source
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from tests.helpers import make_ohlcv


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base.metadata.create_all(bind=engine)


class FakeSource:
    def __init__(self) -> None:
        self.listing = make_ohlcv(n=1)
        import pandas as pd

        self.stocks = pd.DataFrame(
            [{"symbol": "005930", "name": "삼성전자", "market": "KOSPI"}]
        )
        self.ohlcv = {
            "005930": make_ohlcv(n=140, spikes={90: 2.8, 91: 3.1, 92: 2.5}),
            "KS11": make_ohlcv(n=140, volume=80_000_000),
        }

    def list_stocks(self, market: str):
        return self.stocks

    def fetch_ohlcv(self, symbol: str, start: date, end: date):
        frame = self.ohlcv[symbol]
        return frame[(frame["date"] >= start) & (frame["date"] <= end)].copy()


fake_source = FakeSource()


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
app.dependency_overrides[get_source] = lambda: fake_source
client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["algorithm_version"] == "0.1.0"


def test_analyze_and_fetch_results() -> None:
    ohlcv = fake_source.ohlcv["005930"]
    start = ohlcv["date"].iloc[30].isoformat()
    end = ohlcv["date"].iloc[-1].isoformat()
    analyzed = client.post(
        "/api/analyze",
        json={"market": "KOSPI", "symbol": "005930", "start": start, "end": end},
    )
    assert analyzed.status_code == 200, analyzed.text
    body = analyzed.json()
    assert body["algorithm_version"] == "0.1.0"
    assert body["bar_count"] > 0
    assert "근사" in body["trading_value_note"]

    analysis = client.get(f"/api/analysis/005930?market=KOSPI&start={start}&end={end}")
    assert analysis.status_code == 200
    bars = analysis.json()["bars"]
    assert "smart_money_score" in bars[0]
    assert "confidence" in bars[0]
    assert "state" in bars[0]

    events = client.get("/api/events/005930?market=KOSPI")
    assert events.status_code == 200
    backtest = client.get("/api/backtest/005930?market=KOSPI")
    assert backtest.status_code == 200
    assert backtest.json()["summaries"]


def test_etf_market_is_searchable() -> None:
    response = client.get("/api/stocks?market=ETF&q=KODEX")
    assert response.status_code == 200
    assert client.get("/api/stocks?market=UNKNOWN").status_code == 400
