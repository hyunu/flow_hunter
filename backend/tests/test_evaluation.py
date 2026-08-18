from __future__ import annotations

import pandas as pd

from tests.helpers import make_ohlcv
from app.engine.evaluation import (
    _bracket_analysis,
    _compute_forward_returns,
    _compute_ic,
    _monotonicity_test,
    _significance_test,
    _bootstrap_ci,
    _monte_carlo_test,
    _risk_metrics,
    _benchmark_comparison,
    evaluate,
)
from app.engine.features import compute_features
from app.engine.score import compute_scores
from app.engine.state import assign_states


def _make_data_with_returns(n: int = 200) -> pd.DataFrame:
    returns = {i: 0.002 * (1 if i % 3 != 0 else -0.5) for i in range(n)}
    spikes = {i: 2.0 for i in range(0, n, 10)}
    return make_ohlcv(n=n, returns=returns, spikes=spikes, close_step=10.0)


def _scored(ohlcv: pd.DataFrame) -> pd.DataFrame:
    features = compute_features(ohlcv, None)
    scored = compute_scores(features)
    scored = assign_states(scored)
    return _compute_forward_returns(scored)


def test_forward_returns_computed_for_every_bar() -> None:
    ohlcv = _make_data_with_returns()
    scored = _compute_forward_returns(ohlcv)
    for h in (1, 5, 10, 20, 60):
        col = f"fwd_ret_{h}d"
        assert col in scored.columns


def test_bracket_analysis_returns_five_brackets() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    brackets = _bracket_analysis(scored_df)
    assert len(brackets) == 5
    assert all(b.range_label in ["0-20", "20-40", "40-60", "60-80", "80-100"] for b in brackets)
    assert sum(b.count for b in brackets) == len(ohlcv)


def test_ic_returns_valid_correlation() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    ic = _compute_ic(scored_df)
    assert ic.ic_20d is not None
    assert -1.0 <= ic.ic_20d <= 1.0
    assert ic.p_value_20d is not None


def test_monotonicity_between_zero_and_one() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    brackets = _bracket_analysis(scored_df)
    mono = _monotonicity_test(brackets)
    assert 0.0 <= mono <= 1.0


def test_significance_test_returns_results() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    sig = _significance_test(scored_df)
    assert sig.all_count > 0
    assert sig.high_score_count >= 0


def test_bootstrap_ci_bounds() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    boot = _bootstrap_ci(scored_df, n_resamples=100)
    assert boot.n_resamples == 100
    if boot.ci_95_lower is not None and boot.ci_95_upper is not None:
        assert boot.ci_95_lower <= boot.ci_95_upper


def test_monte_carlo_p_value_between_zero_and_one() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    from app.engine.events import compress_events
    events = compress_events(scored_df)
    mc = _monte_carlo_test(scored_df, events, n_simulations=100)
    assert 0.0 <= mc.p_value <= 1.0
    assert mc.n_simulations == 100


def test_risk_metrics() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    risk = _risk_metrics(scored_df)
    if risk.sharpe_20d is not None:
        assert isinstance(risk.sharpe_20d, float)
    if risk.max_drawdown is not None:
        assert risk.max_drawdown <= 0.0


def test_benchmark_without_market() -> None:
    ohlcv = _make_data_with_returns()
    scored_df = _scored(ohlcv)
    bench = _benchmark_comparison(scored_df, None)
    assert bench.benchmark_avg_return_20d is None
    assert bench.excess_return_20d is None


def test_evaluate_end_to_end() -> None:
    ohlcv = _make_data_with_returns(n=200)
    result = evaluate(ohlcv, market=None)
    assert result.bar_count == 200
    assert len(result.brackets) == 5
    assert result.ic.ic_20d is not None
    assert 0.0 <= result.monotonicity_score <= 1.0
    assert result.significance.all_count > 0
    assert result.bootstrap.n_resamples == 1000
    assert result.risk.max_drawdown is not None
