from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_source
from app.core.constants import ALGORITHM_VERSION
from app.data.errors import DataFetchError
from app.data.source import MarketDataSource
from app.db.session import get_db
from app.schemas.dto import (
    AnalysisResponse,
    AnalyzeRequest,
    AnalyzeSummary,
    BacktestResponse,
    EvaluationResponse,
    EventsResponse,
    StockOut,
)
from app.services import analysis as analysis_service
from app.services.stocks import resolve_stock, search_stocks

router = APIRouter()


def _stock_or_404(db: Session, market: str, symbol: str):
    stock = resolve_stock(db, market, symbol)
    if stock is None:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다. 먼저 분석을 실행하세요.")
    return stock


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "algorithm_version": ALGORITHM_VERSION,
        "product": "FlowHunter",
    }


@router.get("/api/stocks", response_model=list[StockOut])
def list_stocks(
    market: str = Query(default="KOSPI"),
    q: str = Query(default=""),
    db: Session = Depends(get_db),
    source: MarketDataSource = Depends(get_source),
) -> list[StockOut]:
    if market not in {"KOSPI", "KOSDAQ"}:
        raise HTTPException(status_code=400, detail="시장은 KOSPI 또는 KOSDAQ만 지원합니다.")
    rows = search_stocks(db, source, market, q.strip())
    return [StockOut(market=row.market, symbol=row.symbol, name=row.name) for row in rows]


@router.post("/api/analyze", response_model=AnalyzeSummary)
def analyze(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    source: MarketDataSource = Depends(get_source),
) -> AnalyzeSummary:
    try:
        stock, cached = analysis_service.analyze_stock(
            db=db,
            source=source,
            market=payload.market,
            symbol=payload.symbol,
            start=payload.start,
            end=payload.end,
            force=payload.force,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DataFetchError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="시세 조회 또는 분석 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.",
        ) from exc

    bars = analysis_service.load_analysis(db, stock, payload.start, payload.end)
    events = analysis_service.load_events(db, stock)
    return AnalyzeSummary(
        stock=StockOut(**analysis_service.stock_payload(stock)),
        algorithm_version=ALGORITHM_VERSION,
        trading_value_note=analysis_service.notes(),
        start=payload.start,
        end=payload.end,
        bar_count=len(bars),
        event_count=len(events),
        latest=analysis_service.latest_from_bars(bars),
        cached=cached,
    )


@router.get("/api/analysis/{symbol}", response_model=AnalysisResponse)
def get_analysis(
    symbol: str,
    market: str = Query(default="KOSPI"),
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> AnalysisResponse:
    stock = _stock_or_404(db, market, symbol)
    bars = analysis_service.load_analysis(db, stock, start, end)
    if not bars:
        raise HTTPException(status_code=404, detail="분석 결과가 없습니다. 먼저 분석을 실행하세요.")
    return AnalysisResponse(
        stock=StockOut(**analysis_service.stock_payload(stock)),
        algorithm_version=ALGORITHM_VERSION,
        trading_value_note=analysis_service.notes(),
        latest=analysis_service.latest_from_bars(bars),
        bars=bars,
    )


@router.get("/api/events/{symbol}", response_model=EventsResponse)
def get_events(
    symbol: str,
    market: str = Query(default="KOSPI"),
    db: Session = Depends(get_db),
) -> EventsResponse:
    stock = _stock_or_404(db, market, symbol)
    return EventsResponse(
        stock=StockOut(**analysis_service.stock_payload(stock)),
        algorithm_version=ALGORITHM_VERSION,
        events=analysis_service.load_events(db, stock),
    )


@router.get("/api/backtest/{symbol}", response_model=BacktestResponse)
def get_backtest(
    symbol: str,
    market: str = Query(default="KOSPI"),
    db: Session = Depends(get_db),
) -> BacktestResponse:
    stock = _stock_or_404(db, market, symbol)
    return BacktestResponse(
        stock=StockOut(**analysis_service.stock_payload(stock)),
        algorithm_version=ALGORITHM_VERSION,
        summaries=analysis_service.load_backtest_summary(db, stock),
    )


@router.get("/api/evaluation/{symbol}", response_model=EvaluationResponse)
def get_evaluation(
    symbol: str,
    market: str = Query(default="KOSPI"),
    db: Session = Depends(get_db),
) -> EvaluationResponse:
    stock = _stock_or_404(db, market, symbol)
    result = analysis_service.run_evaluation(db, stock)
    return EvaluationResponse(
        stock=StockOut(**analysis_service.stock_payload(stock)),
        algorithm_version=ALGORITHM_VERSION,
        **result,
    )
