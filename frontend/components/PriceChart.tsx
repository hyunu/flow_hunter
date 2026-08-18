"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { ibmPlexMono } from "@/app/fonts";
import { VolumeProfilePrimitive } from "@/components/VolumeProfilePrimitive";
import { STATE_COLORS } from "@/lib/format";
import type { Bar, EventItem } from "@/lib/types";

type Props = {
  bars: Bar[];
  events: EventItem[];
  onSelect: (bar: Bar | null) => void;
};

function toTime(date: string): Time {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function timeToDate(time: Time): string {
  if (typeof time === "string") return time;
  if (typeof time === "object") {
    return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
  }
  return "";
}

function smaLine(bars: Bar[], window: number) {
  const line: { time: Time; value?: number }[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i += 1) {
    sum += bars[i].close;
    if (i >= window) sum -= bars[i - window].close;
    if (i >= window - 1) {
      line.push({ time: toTime(bars[i].date), value: sum / window });
    } else {
      line.push({ time: toTime(bars[i].date) });
    }
  }
  return line;
}

const MA_STYLES = {
  ma20: { color: "#e8d56a", label: "20" },
  ma60: { color: "#ff8b6a", label: "60" },
  ma120: { color: "#7eb6ff", label: "120" },
} as const;

type ChartLayers = {
  ma20: boolean;
  ma60: boolean;
  ma120: boolean;
  profile: boolean;
  volume: boolean;
  score: boolean;
  events: boolean;
};

const LAYER_KEY = "flowhunter-chart-layers";
const DEFAULT_LAYERS: ChartLayers = {
  ma20: true,
  ma60: true,
  ma120: true,
  profile: true,
  volume: true,
  score: true,
  events: true,
};

function loadLayers(): ChartLayers {
  if (typeof window === "undefined") return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(LAYER_KEY);
    if (!raw) return DEFAULT_LAYERS;
    return { ...DEFAULT_LAYERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LAYERS;
  }
}

function eventMarkers(events: EventItem[]): SeriesMarker<Time>[] {
  return events.map((event) => ({
    time: toTime(event.peak_date),
    position: event.state === "distribution" || event.state === "exit" ? "aboveBar" : "belowBar",
    color: STATE_COLORS[event.state] ?? "#4ee0c6",
    shape: event.state === "breakout" ? "arrowUp" : event.state === "distribution" ? "arrowDown" : "circle",
    text: event.state_label,
  }));
}

export default function PriceChart({ bars, events, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma120Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const scoreRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const volumeProfileRef = useRef<VolumeProfilePrimitive | null>(null);
  const barsRef = useRef(bars);
  const eventsRef = useRef(events);
  const onSelectRef = useRef(onSelect);
  const fitAllRef = useRef<() => void>(() => {});
  const [layers, setLayers] = useState<ChartLayers>(loadLayers);
  barsRef.current = bars;
  eventsRef.current = events;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!hostRef.current) return;
    const chart = createChart(hostRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0a101c" },
        textColor: "#8b9cb3",
        fontFamily: ibmPlexMono.style.fontFamily,
      },
      grid: {
        vertLines: { color: "#1b2740" },
        horzLines: { color: "#1b2740" },
      },
      rightPriceScale: {
        borderColor: "#2a3a52",
        entireTextOnly: true,
        minimumWidth: 56,
        autoScale: true,
      },
      timeScale: {
        borderColor: "#2a3a52",
        timeVisible: false,
        ticksVisible: true,
        rightOffset: 0,
        barSpacing: 6,
        minBarSpacing: 0.5,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: false, price: true },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#3dcf9a",
      downColor: "#ff5d73",
      borderVisible: false,
      wickUpColor: "#3dcf9a",
      wickDownColor: "#ff5d73",
    });
    const lineOptions = {
      lineWidth: 1 as const,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    };
    const ma20 = chart.addSeries(LineSeries, { ...lineOptions, color: MA_STYLES.ma20.color });
    const ma60 = chart.addSeries(LineSeries, { ...lineOptions, color: MA_STYLES.ma60.color });
    const ma120 = chart.addSeries(LineSeries, {
      ...lineOptions,
      color: MA_STYLES.ma120.color,
      lineWidth: 2,
    });
    const volume = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, priceScaleId: "vol" },
      1,
    );
    const score = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "price", precision: 0, minMove: 1 },
        priceScaleId: "score",
        color: "#4ee0c6",
        priceLineVisible: false,
        autoscaleInfoProvider: () => {
          const max = barsRef.current.reduce((hi, bar) => Math.max(hi, bar.smart_money_score), 0);
          return {
            priceRange: {
              minValue: 0,
              maxValue: Math.max(max, 1),
            },
          };
        },
      },
      2,
    );
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.18, bottom: 0 }, autoScale: true });
    score.priceScale().applyOptions({ scaleMargins: { top: 0, bottom: 0 }, autoScale: true });

    chartRef.current = chart;
    candleRef.current = candles;
    ma20Ref.current = ma20;
    ma60Ref.current = ma60;
    ma120Ref.current = ma120;
    volumeRef.current = volume;
    scoreRef.current = score;
    markersRef.current = createSeriesMarkers<Time>(candles, []);
    const volumeProfile = new VolumeProfilePrimitive();
    candles.attachPrimitive(volumeProfile);
    volumeProfileRef.current = volumeProfile;

    const restoreAutoScale = () => {
      candles.priceScale().applyOptions({ autoScale: true });
      volume.priceScale().applyOptions({ autoScale: true });
      score.priceScale().applyOptions({ autoScale: true });
    };

    const rememberFittedSpacing = () => {
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      const width = timeScale.width();
      if (!range || width <= 0) return;
      const span = range.to - range.from;
      if (span <= 0) return;
      timeScale.applyOptions({ barSpacing: width / span });
    };

    const fitAll = () => {
      restoreAutoScale();
      const count = barsRef.current.length;
      if (count < 1) return;
      chart.timeScale().setVisibleLogicalRange({ from: 0, to: Math.max(count - 1, 0) });
      requestAnimationFrame(rememberFittedSpacing);
    };
    fitAllRef.current = fitAll;

    chart.subscribeClick((param) => {
      if (!param.time) {
        onSelectRef.current(null);
        return;
      }
      const date = timeToDate(param.time);
      onSelectRef.current(barsRef.current.find((item) => item.date === date) ?? null);
    });

    chart.subscribeDblClick(() => {
      fitAll();
    });

    return () => {
      fitAllRef.current = () => {};
      volumeProfileRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    candleRef.current?.setData(
      bars.map((bar) => ({
        time: toTime(bar.date),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );
    ma20Ref.current?.setData(smaLine(bars, 20));
    ma60Ref.current?.setData(smaLine(bars, 60));
    ma120Ref.current?.setData(smaLine(bars, 120));
    volumeRef.current?.setData(
      bars.map((bar) => ({
        time: toTime(bar.date),
        value: bar.volume,
        color: `${STATE_COLORS[bar.state] ?? "#1c2736"}aa`,
      })),
    );
    scoreRef.current?.setData(
      bars.map((bar) => ({
        time: toTime(bar.date),
        value: bar.smart_money_score,
        color: bar.smart_money_score >= 80 ? "#4ee0c6" : bar.smart_money_score >= 60 ? "#2ab8a4" : "#3a5368",
      })),
    );
    volumeProfileRef.current?.setBars(bars);
    fitAllRef.current();
  }, [bars]);

  useEffect(() => {
    markersRef.current?.setMarkers(layers.events ? eventMarkers(events) : []);
  }, [bars, events, layers.events]);

  useEffect(() => {
    window.localStorage.setItem(LAYER_KEY, JSON.stringify(layers));
    ma20Ref.current?.applyOptions({ visible: layers.ma20 });
    ma60Ref.current?.applyOptions({ visible: layers.ma60 });
    ma120Ref.current?.applyOptions({ visible: layers.ma120 });
    volumeRef.current?.applyOptions({ visible: layers.volume });
    scoreRef.current?.applyOptions({ visible: layers.score });
    volumeProfileRef.current?.setVisible(layers.profile);
    const panes = chartRef.current?.panes();
    panes?.[0]?.setStretchFactor(4.2);
    panes?.[1]?.setStretchFactor(layers.volume ? 0.82 : 0.001);
    panes?.[2]?.setStretchFactor(layers.score ? 0.62 : 0.001);
    markersRef.current?.setMarkers(layers.events ? eventMarkers(eventsRef.current) : []);
  }, [layers]);

  function toggle(key: keyof ChartLayers) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="chart-wrap">
      <ul className="ma-legend">
        <li>
          <button type="button" className={layers.ma20 ? "is-on" : ""} onClick={() => toggle("ma20")}>
            <i style={{ background: MA_STYLES.ma20.color }} />
            20
          </button>
        </li>
        <li>
          <button type="button" className={layers.ma60 ? "is-on" : ""} onClick={() => toggle("ma60")}>
            <i style={{ background: MA_STYLES.ma60.color }} />
            60
          </button>
        </li>
        <li>
          <button type="button" className={layers.ma120 ? "is-on" : ""} onClick={() => toggle("ma120")}>
            <i style={{ background: MA_STYLES.ma120.color }} />
            120
          </button>
        </li>
        <li>
          <button type="button" className={layers.profile ? "is-on" : ""} onClick={() => toggle("profile")}>
            <i className="profile" />
            매물대
          </button>
        </li>
        <li>
          <button type="button" className={layers.volume ? "is-on" : ""} onClick={() => toggle("volume")}>
            거래량
          </button>
        </li>
        <li>
          <button type="button" className={layers.score ? "is-on" : ""} onClick={() => toggle("score")}>
            Score
          </button>
        </li>
        <li>
          <button type="button" className={layers.events ? "is-on" : ""} onClick={() => toggle("events")}>
            이벤트
          </button>
        </li>
      </ul>
      <div ref={hostRef} className="chart-host" />
    </div>
  );
}
