# FlowHunter

특정 종목의 과거 일봉을 분석해 **대규모 자금 활동 가능성이 높은 구간**을 찾고, 매집·개입·돌파·분산으로 어떻게 이어졌는지 차트에서 추적한 뒤 이후 수익률로 검증하는 도구입니다.

이 프로젝트는 실제 세력이나 특정 투자 주체를 식별하지 않습니다. Smart Money Score는 거래량, 거래대금, 가격-거래량 행동, 시장 맥락 등을 결합한 **가능성 점수**입니다.

현재 알고리즘 버전: `0.1.0`

쉬운 설명(중학생도 읽기): [`쉽게_읽는_설명.md`](./쉽게_읽는_설명.md)  
인쇄용 설명서: 앱에서 `/manual` (인쇄 또는 PDF 저장)

## MVP 범위

포함: 국내 종목 선택, 일봉 OHLCV, 거래대금 근사, Score/Confidence, 상태 탐지, 이벤트 시각화, 전방 수익률 백테스트, 알고리즘 버전 기록.

제외: 실시간 체결/호가, 자동주문, 투자자별 실시간 수급, 뉴스 AI, 종목 스크리닝.

## 실행 방법

백엔드와 프론트를 각각 실행합니다.

```bash
# 백엔드
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
# 프론트엔드
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. Next.js는 `/api/*` 요청을 `http://127.0.0.1:8000`으로 전달합니다.

테스트:

```bash
cd backend
source .venv/bin/activate
pytest
```

## 데이터

- 종목 목록과 일봉: [FinanceDataReader](https://github.com/FinanceData/FinanceDataReader)
- 거래대금: FDR에 원천 컬럼이 없어 `close × volume` 근사값을 사용합니다.
- 시장 맥락: KOSPI는 `KS11`, KOSDAQ은 `KQ11` 거래량과 비교합니다.
- 저장소: `backend/data/flowhunter.db` (SQLite). 같은 종목·기간·알고리즘 버전은 재계산하지 않고 재사용합니다.

## 분석 원칙

1. 날짜 `t`의 Score/상태 계산에는 `t` 이전과 당일 데이터만 사용합니다.
2. 이벤트 이후 1/5/10/20/60일 수익률은 평가 전용이며 점수 산정에 넣지 않습니다.
3. 거래량 한 지표만으로 고점수가 나오지 않도록 구성 요소 다양성 캡을 적용합니다.
4. 시장 전체 거래량이 같이 급증하면 개별 종목 거래량 이상 징후의 기여를 낮춥니다.
5. 데이터가 짧거나 시장 지수가 없으면 Score가 아니라 Confidence를 낮춥니다.

## 면책

- 분석 결과는 특정 세력의 존재를 증명하지 않습니다.
- 과거 백테스트 성과가 미래 수익을 보장하지 않습니다.
- 투자 권유가 아닙니다.
