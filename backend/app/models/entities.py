from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Stock(Base):
    __tablename__ = "stocks"
    __table_args__ = (UniqueConstraint("market", "symbol", name="uq_stock_market_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    market: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    market_data: Mapped[list["MarketData"]] = relationship(back_populates="stock")
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(back_populates="stock")
    events: Mapped[list["SmartMoneyEvent"]] = relationship(back_populates="stock")


class MarketData(Base):
    __tablename__ = "market_data"
    __table_args__ = (UniqueConstraint("stock_id", "date", name="uq_market_data_stock_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float] = mapped_column(Float, nullable=False)
    trading_value: Mapped[float] = mapped_column(Float, nullable=False)
    is_adjusted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    stock: Mapped[Stock] = relationship(back_populates="market_data")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    __table_args__ = (
        UniqueConstraint("stock_id", "date", "algorithm_version", name="uq_analysis_stock_date_ver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    smart_money_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    features: Mapped[str] = mapped_column(Text, nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    stock: Mapped[Stock] = relationship(back_populates="analysis_results")


class SmartMoneyEvent(Base):
    __tablename__ = "smart_money_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    peak_date: Mapped[date] = mapped_column(Date, nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    features: Mapped[str] = mapped_column(Text, nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    stock: Mapped[Stock] = relationship(back_populates="events")
    backtest: Mapped[Optional["BacktestResult"]] = relationship(back_populates="event")


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("smart_money_events.id"), nullable=False, unique=True)
    forward_return_1d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    forward_return_5d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    forward_return_10d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    forward_return_20d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    forward_return_60d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_gain: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    event: Mapped[SmartMoneyEvent] = relationship(back_populates="backtest")
