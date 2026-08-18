from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats

from app.core.constants import SCORE_DECIMALS
from app.engine.backtest import HORIZONS
from app.engine.events import DetectedEvent, compress_events
from app.engine.features import compute_features
from app.engine.score import compute_scores
from app.engine.state import assign_states


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BracketStats:
    range_label: str
    count: int
    avg_return_1d: float | None
    avg_return_5d: float | None
    avg_return_10d: float | None
    avg_return_20d: float | None
    avg_return_60d: float | None
    median_return_20d: float | None
    win_rate_20d: float | None


@dataclass(frozen=True)
class ICResult:
    ic_1d: float | None
    ic_5d: float | None
    ic_10d: float | None
    ic_20d: float | None
    ic_60d: float | None
    p_value_20d: float | None


@dataclass(frozen=True)
class SignificanceResult:
    t_stat: float | None
    p_value: float | None
    high_score_count: int
    all_count: int
    high_score_avg_20d: float | None
    all_avg_20d: float | None


@dataclass(frozen=True)
class BootstrapResult:
    mean_20d: float | None
    ci_95_lower: float | None
    ci_95_upper: float | None
    n_resamples: int


@dataclass(frozen=True)
class WalkForwardWindow:
    window_start: str
    window_end: str
    events: int
    avg_return_20d: float | None


@dataclass(frozen=True)
class WalkForwardResult:
    windows: int
    total_events: int
    avg_return_20d: float | None
    win_rate_20d: float | None
    avg_events_per_window: float | None
    details: list[WalkForwardWindow]


@dataclass(frozen=True)
class MonteCarloResult:
    actual_avg_return_20d: float | None
    null_mean: float | None
    null_std: float | None
    p_value: float | None
    n_simulations: int


@dataclass(frozen=True)
class RiskResult:
    sharpe_1d: float | None
    sharpe_20d: float | None
    max_drawdown: float | None
    calmar_ratio: float | None


@dataclass(frozen=True)
class BenchmarkResult:
    benchmark_avg_return_20d: float | None
    strategy_avg_return_20d: float | None
    excess_return_20d: float | None
    information_ratio: float | None


@dataclass(frozen=True)
class EvaluationResult:
    bar_count: int
    brackets: list[BracketStats]
    ic: ICResult
    monotonicity_score: float
    significance: SignificanceResult
    bootstrap: BootstrapResult
    walk_forward: WalkForwardResult
    monte_carlo: MonteCarloResult
    risk: RiskResult
    benchmark: BenchmarkResult


# ---------------------------------------------------------------------------
# Forward returns for every bar
# ---------------------------------------------------------------------------

def _compute_forward_returns(ohlcv: pd.DataFrame) -> pd.DataFrame:
    df = ohlcv.sort_values("date").reset_index(drop=True)
    closes = df["close"].astype(float)
    for h in HORIZONS:
        future = closes.shift(-h)
        df[f"fwd_ret_{h}d"] = ((future / closes) - 1.0).round(SCORE_DECIMALS)
    return df


# ---------------------------------------------------------------------------
# Bracket analysis
# ---------------------------------------------------------------------------

_BRACKET_EDGES = [0, 20, 40, 60, 80, 101]
_BRACKET_LABELS = ["0-20", "20-40", "40-60", "60-80", "80-100"]


def _bracket_analysis(scored: pd.DataFrame) -> list[BracketStats]:
    df = scored.copy()
    df["_bracket"] = pd.cut(
        df["smart_money_score"],
        bins=_BRACKET_EDGES,
        labels=_BRACKET_LABELS,
        right=False,
        include_lowest=True,
    )
    results: list[BracketStats] = []
    for label in _BRACKET_LABELS:
        subset = df[df["_bracket"] == label]
        if subset.empty:
            results.append(
                BracketStats(
                    range_label=label,
                    count=0,
                    avg_return_1d=None,
                    avg_return_5d=None,
                    avg_return_10d=None,
                    avg_return_20d=None,
                    avg_return_60d=None,
                    median_return_20d=None,
                    win_rate_20d=None,
                )
            )
            continue

        def _mean(col: str) -> float | None:
            vals = subset[col].dropna()
            return round(float(vals.mean()), SCORE_DECIMALS) if len(vals) > 0 else None

        ret_20 = subset["fwd_ret_20d"].dropna()
        median_20 = round(float(ret_20.median()), SCORE_DECIMALS) if len(ret_20) > 0 else None
        win_rate = round(float((ret_20 > 0).sum() / len(ret_20)), SCORE_DECIMALS) if len(ret_20) > 0 else None

        results.append(
            BracketStats(
                range_label=label,
                count=len(subset),
                avg_return_1d=_mean("fwd_ret_1d"),
                avg_return_5d=_mean("fwd_ret_5d"),
                avg_return_10d=_mean("fwd_ret_10d"),
                avg_return_20d=_mean("fwd_ret_20d"),
                avg_return_60d=_mean("fwd_ret_60d"),
                median_return_20d=median_20,
                win_rate_20d=win_rate,
            )
        )
    return results


# ---------------------------------------------------------------------------
# Information Coefficient (Spearman rank correlation)
# ---------------------------------------------------------------------------

def _compute_ic(scored: pd.DataFrame) -> ICResult:
    results: dict[str, float | None] = {}
    for h in HORIZONS:
        col = f"fwd_ret_{h}d"
        valid = scored[["smart_money_score", col]].dropna()
        if len(valid) < 10:
            results[f"ic_{h}d"] = None
            continue
        corr, pval = stats.spearmanr(valid["smart_money_score"], valid[col])
        results[f"ic_{h}d"] = round(float(corr), SCORE_DECIMALS)
        if h == 20:
            results["p_value_20d"] = round(float(pval), SCORE_DECIMALS)

    return ICResult(
        ic_1d=results.get("ic_1d"),
        ic_5d=results.get("ic_5d"),
        ic_10d=results.get("ic_10d"),
        ic_20d=results.get("ic_20d"),
        ic_60d=results.get("ic_60d"),
        p_value_20d=results.get("p_value_20d"),
    )


# ---------------------------------------------------------------------------
# Monotonicity test
# ---------------------------------------------------------------------------

def _monotonicity_test(brackets: list[BracketStats]) -> float:
    vals = [b.avg_return_20d for b in brackets if b.avg_return_20d is not None and b.count > 0]
    if len(vals) < 2:
        return 0.0
    increases = sum(1 for i in range(1, len(vals)) if vals[i] >= vals[i - 1])
    return round(increases / (len(vals) - 1), SCORE_DECIMALS)


# ---------------------------------------------------------------------------
# Welch's t-test: high-score vs all bars
# ---------------------------------------------------------------------------

def _significance_test(scored: pd.DataFrame) -> SignificanceResult:
    high = scored[scored["smart_money_score"] >= 60]["fwd_ret_20d"].dropna()
    all_ret = scored["fwd_ret_20d"].dropna()

    if len(high) < 5 or len(all_ret) < 10:
        return SignificanceResult(
            t_stat=None,
            p_value=None,
            high_score_count=len(high),
            all_count=len(all_ret),
            high_score_avg_20d=round(float(high.mean()), SCORE_DECIMALS) if len(high) > 0 else None,
            all_avg_20d=round(float(all_ret.mean()), SCORE_DECIMALS) if len(all_ret) > 0 else None,
        )

    t_stat, p_val = stats.ttest_ind(high, all_ret, equal_var=False)
    return SignificanceResult(
        t_stat=round(float(t_stat), SCORE_DECIMALS),
        p_value=round(float(p_val), SCORE_DECIMALS),
        high_score_count=len(high),
        all_count=len(all_ret),
        high_score_avg_20d=round(float(high.mean()), SCORE_DECIMALS),
        all_avg_20d=round(float(all_ret.mean()), SCORE_DECIMALS),
    )


# ---------------------------------------------------------------------------
# Bootstrap confidence interval
# ---------------------------------------------------------------------------

def _bootstrap_ci(scored: pd.DataFrame, n_resamples: int = 1000, seed: int = 42) -> BootstrapResult:
    vals = scored[scored["smart_money_score"] >= 60]["fwd_ret_20d"].dropna().values
    if len(vals) < 5:
        return BootstrapResult(
            mean_20d=round(float(vals.mean()), SCORE_DECIMALS) if len(vals) > 0 else None,
            ci_95_lower=None,
            ci_95_upper=None,
            n_resamples=n_resamples,
        )

    rng = np.random.RandomState(seed)
    means = np.array([float(rng.choice(vals, size=len(vals), replace=True).mean()) for _ in range(n_resamples)])
    ci_lower = float(np.percentile(means, 2.5))
    ci_upper = float(np.percentile(means, 97.5))

    return BootstrapResult(
        mean_20d=round(float(vals.mean()), SCORE_DECIMALS),
        ci_95_lower=round(ci_lower, SCORE_DECIMALS),
        ci_95_upper=round(ci_upper, SCORE_DECIMALS),
        n_resamples=n_resamples,
    )


# ---------------------------------------------------------------------------
# Walk-Forward analysis
# ---------------------------------------------------------------------------

def _walk_forward(
    ohlcv: pd.DataFrame,
    market: pd.DataFrame | None,
    min_lookback: int = 120,
    step: int = 20,
) -> WalkForwardResult:
    df = ohlcv.sort_values("date").reset_index(drop=True)
    if len(df) < min_lookback:
        return WalkForwardResult(
            windows=0,
            total_events=0,
            avg_return_20d=None,
            win_rate_20d=None,
            avg_events_per_window=None,
            details=[],
        )

    windows: list[WalkForwardWindow] = []
    all_returns: list[float] = []

    for end_idx in range(min_lookback, len(df), step):
        train_end = end_idx
        test_end = min(end_idx + step, len(df))
        if test_end <= train_end:
            continue

        train_slice = ohlcv.iloc[:train_end].copy()
        test_start_date = df.iloc[train_end]["date"]
        test_end_date = df.iloc[min(test_end - 1, len(df) - 1)]["date"]

        try:
            from app.engine.features import compute_features
            features = compute_features(train_slice, market)
            scored = compute_scores(features)
            scored = assign_states(scored)

            test_features = compute_features(ohlcv.iloc[:test_end].copy(), market)
            test_scored = compute_scores(test_features)
            test_scored = assign_states(test_scored)

            events = compress_events(test_scored, start=test_start_date, end=test_end_date)
        except Exception:
            events = []

        event_returns: list[float] = []
        index_map = {row["date"]: i for i, row in df.iterrows()}
        closes = df["close"].astype(float)

        for event in events:
            pos = index_map.get(event.peak_date)
            if pos is None:
                continue
            target = pos + 20
            if target < len(closes):
                ret = float(closes.iloc[target] / closes.iloc[pos] - 1.0)
                event_returns.append(ret)

        avg_ret = round(float(np.mean(event_returns)), SCORE_DECIMALS) if event_returns else None
        win_rate = round(float(sum(1 for r in event_returns if r > 0) / len(event_returns)), SCORE_DECIMALS) if event_returns else None

        windows.append(
            WalkForwardWindow(
                window_start=str(test_start_date),
                window_end=str(test_end_date),
                events=len(events),
                avg_return_20d=avg_ret,
            )
        )
        all_returns.extend(event_returns)

    if not all_returns:
        return WalkForwardResult(
            windows=len(windows),
            total_events=0,
            avg_return_20d=None,
            win_rate_20d=None,
            avg_events_per_window=None,
            details=windows,
        )

    overall_avg = round(float(np.mean(all_returns)), SCORE_DECIMALS)
    overall_win = round(float(sum(1 for r in all_returns if r > 0) / len(all_returns)), SCORE_DECIMALS)
    avg_per_window = round(len(all_returns) / len(windows), SCORE_DECIMALS) if windows else None

    return WalkForwardResult(
        windows=len(windows),
        total_events=len(all_returns),
        avg_return_20d=overall_avg,
        win_rate_20d=overall_win,
        avg_events_per_window=avg_per_window,
        details=windows,
    )


# ---------------------------------------------------------------------------
# Monte Carlo shuffle test
# ---------------------------------------------------------------------------

def _monte_carlo_test(
    scored: pd.DataFrame,
    events: list[DetectedEvent],
    n_simulations: int = 5000,
    seed: int = 42,
) -> MonteCarloResult:
    index_map = {row["date"]: i for i, row in scored.iterrows()}
    closes = scored["close"].astype(float)
    all_dates = list(scored["date"])

    actual_returns: list[float] = []
    for event in events:
        pos = index_map.get(event.peak_date)
        if pos is None:
            continue
        target = pos + 20
        if target < len(closes):
            actual_returns.append(float(closes.iloc[target] / closes.iloc[pos] - 1.0))

    if not actual_returns:
        return MonteCarloResult(
            actual_avg_return_20d=None,
            null_mean=None,
            null_std=None,
            p_value=None,
            n_simulations=n_simulations,
        )

    actual_avg = float(np.mean(actual_returns))
    n_events = len(events)

    rng = random.Random(seed)
    null_means: list[float] = []
    max_date_idx = len(all_dates) - 21

    if max_date_idx <= 0:
        return MonteCarloResult(
            actual_avg_return_20d=round(actual_avg, SCORE_DECIMALS),
            null_mean=None,
            null_std=None,
            p_value=None,
            n_simulations=n_simulations,
        )

    for _ in range(n_simulations):
        random_returns: list[float] = []
        for _ in range(n_events):
            pos = rng.randint(0, max_date_idx)
            target = pos + 20
            random_returns.append(float(closes.iloc[target] / closes.iloc[pos] - 1.0))
        null_means.append(float(np.mean(random_returns)))

    null_mean = float(np.mean(null_means))
    null_std = float(np.std(null_means))
    p_value = float(np.mean([m >= actual_avg for m in null_means]))

    return MonteCarloResult(
        actual_avg_return_20d=round(actual_avg, SCORE_DECIMALS),
        null_mean=round(null_mean, SCORE_DECIMALS),
        null_std=round(null_std, SCORE_DECIMALS),
        p_value=round(p_value, SCORE_DECIMALS),
        n_simulations=n_simulations,
    )


# ---------------------------------------------------------------------------
# Risk metrics
# ---------------------------------------------------------------------------

def _risk_metrics(scored: pd.DataFrame) -> RiskResult:
    daily = scored["fwd_ret_1d"].dropna()
    ret_20 = scored["fwd_ret_20d"].dropna()

    def _sharpe(returns: pd.Series, annualize_factor: float) -> float | None:
        if len(returns) < 10 or returns.std() == 0:
            return None
        return round(float(returns.mean() / returns.std() * math.sqrt(annualize_factor)), SCORE_DECIMALS)

    sharpe_1d = _sharpe(daily, 252)
    sharpe_20d = _sharpe(ret_20, 12.6)

    closes = scored["close"].astype(float)
    cummax = closes.cummax()
    drawdown = ((closes - cummax) / cummax)
    max_dd = round(float(drawdown.min()), SCORE_DECIMALS) if len(drawdown) > 0 else None

    calmar = None
    if max_dd is not None and max_dd < 0 and sharpe_20d is not None:
        annual_return = float(ret_20.mean()) * 12.6 if len(ret_20) > 0 else 0
        calmar = round(annual_return / abs(max_dd), SCORE_DECIMALS)

    return RiskResult(
        sharpe_1d=sharpe_1d,
        sharpe_20d=sharpe_20d,
        max_drawdown=max_dd,
        calmar_ratio=calmar,
    )


# ---------------------------------------------------------------------------
# Benchmark comparison
# ---------------------------------------------------------------------------

def _benchmark_comparison(scored: pd.DataFrame, market: pd.DataFrame | None) -> BenchmarkResult:
    strategy_ret = scored[scored["smart_money_score"] >= 60]["fwd_ret_20d"].dropna()

    if market is None or market.empty:
        return BenchmarkResult(
            benchmark_avg_return_20d=None,
            strategy_avg_return_20d=round(float(strategy_ret.mean()), SCORE_DECIMALS) if len(strategy_ret) > 0 else None,
            excess_return_20d=None,
            information_ratio=None,
        )

    mkt = market.sort_values("date").reset_index(drop=True)
    mkt_closes = mkt["close"].astype(float)
    mkt_ret_20 = ((mkt_closes.shift(-20) / mkt_closes) - 1.0).dropna()

    if len(mkt_ret_20) == 0:
        return BenchmarkResult(
            benchmark_avg_return_20d=None,
            strategy_avg_return_20d=round(float(strategy_ret.mean()), SCORE_DECIMALS) if len(strategy_ret) > 0 else None,
            excess_return_20d=None,
            information_ratio=None,
        )

    bench_avg = round(float(mkt_ret_20.mean()), SCORE_DECIMALS)
    strat_avg = round(float(strategy_ret.mean()), SCORE_DECIMALS) if len(strategy_ret) > 0 else None
    excess = round(strat_avg - bench_avg, SCORE_DECIMALS) if strat_avg is not None else None

    info_ratio = None
    if excess is not None and len(strategy_ret) > 10:
        tracking_error = float(strategy_ret.std())
        if tracking_error > 0:
            info_ratio = round(excess / tracking_error * math.sqrt(12.6), SCORE_DECIMALS)

    return BenchmarkResult(
        benchmark_avg_return_20d=bench_avg,
        strategy_avg_return_20d=strat_avg,
        excess_return_20d=excess,
        information_ratio=info_ratio,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def evaluate(
    ohlcv: pd.DataFrame,
    market: pd.DataFrame | None,
) -> EvaluationResult:
    if ohlcv.empty:
        return EvaluationResult(
            bar_count=0,
            brackets=[],
            ic=ICResult(None, None, None, None, None, None),
            monotonicity_score=0.0,
            significance=SignificanceResult(None, None, 0, 0, None, None),
            bootstrap=BootstrapResult(None, None, None, 0),
            walk_forward=WalkForwardResult(0, 0, None, None, None, []),
            monte_carlo=MonteCarloResult(None, None, None, None, 0),
            risk=RiskResult(None, None, None, None),
            benchmark=BenchmarkResult(None, None, None, None),
        )

    scored = ohlcv.sort_values("date").reset_index(drop=True)
    features = compute_features(scored, market)
    scored = compute_scores(features)
    scored = assign_states(scored)
    scored = _compute_forward_returns(scored)

    events = compress_events(scored)

    brackets = _bracket_analysis(scored)
    ic = _compute_ic(scored)
    monotonicity = _monotonicity_test(brackets)
    significance = _significance_test(scored)
    bootstrap = _bootstrap_ci(scored)
    walk_forward_result = _walk_forward(ohlcv, market)
    mc = _monte_carlo_test(scored, events)
    risk = _risk_metrics(scored)
    benchmark = _benchmark_comparison(scored, market)

    return EvaluationResult(
        bar_count=len(scored),
        brackets=brackets,
        ic=ic,
        monotonicity_score=monotonicity,
        significance=significance,
        bootstrap=bootstrap,
        walk_forward=walk_forward_result,
        monte_carlo=mc,
        risk=risk,
        benchmark=benchmark,
    )
