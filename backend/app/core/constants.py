ALGORITHM_VERSION = "0.1.0"

FEATURE_DECIMALS = 6
SCORE_DECIMALS = 4

LOOKBACK_BARS = 60
VOLUME_WINDOW = 20
VALUE_WINDOW = 20
ATR_WINDOW = 14
OBV_SLOPE_WINDOW = 5
BREAKOUT_WINDOW = 20
ACCUMULATION_MIN_DAYS = 4

WEIGHTS = {
    "volume_anomaly": 0.20,
    "value_anomaly": 0.20,
    "pv_behavior": 0.20,
    "accumulation_pattern": 0.15,
    "supply_demand": 0.10,
    "trend_context": 0.10,
    "market_context": 0.05,
}

SINGLE_FACTOR_SCORE_CAP = 55.0
TWO_FACTOR_SCORE_CAP = 75.0
COMPONENT_ACTIVE_THRESHOLD = 40.0

STATE_NORMAL = "normal"
STATE_ACCUMULATION_START = "accumulation_start"
STATE_ACCUMULATION = "accumulation"
STATE_STRONG_INTERVENTION = "strong_intervention"
STATE_BREAKOUT = "breakout"
STATE_DISTRIBUTION = "distribution"
STATE_EXIT = "exit"

ACTIVE_STATES = {
    STATE_ACCUMULATION_START,
    STATE_ACCUMULATION,
    STATE_STRONG_INTERVENTION,
    STATE_BREAKOUT,
    STATE_DISTRIBUTION,
}

STATE_LABELS_KO = {
    STATE_NORMAL: "특이 활동 없음",
    STATE_ACCUMULATION_START: "매집 시작",
    STATE_ACCUMULATION: "매집",
    STATE_STRONG_INTERVENTION: "강한 개입",
    STATE_BREAKOUT: "돌파",
    STATE_DISTRIBUTION: "분산",
    STATE_EXIT: "이탈",
}

MARKET_INDEX = {
    "KOSPI": "KS11",
    "KOSDAQ": "KQ11",
}

TRADING_VALUE_NOTE = "거래대금은 close × volume 근사값이며, 실제 체결대금과 다를 수 있습니다."
