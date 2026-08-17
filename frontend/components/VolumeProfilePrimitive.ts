import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import { volumeByPrice, type VolumeBin } from "@/lib/volumeProfile";
import type { Bar } from "@/lib/types";

type ProfileItem = VolumeBin & { y1: number; y2: number };

class ProfileRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly items: ProfileItem[],
    private readonly maxVolume: number,
  ) {}

  draw(target: Parameters<IPrimitivePaneRenderer["draw"]>[0]) {
    if (this.items.length === 0 || this.maxVolume <= 0) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const maxWidth = mediaSize.width * 0.28;
      for (const item of this.items) {
        const top = Math.min(item.y1, item.y2);
        const height = Math.abs(item.y2 - item.y1);
        if (height < 0.5) continue;
        const width = (item.volume / this.maxVolume) * maxWidth;
        ctx.fillStyle = item.poc ? "rgba(78, 224, 198, 0.38)" : "rgba(74, 163, 217, 0.18)";
        ctx.fillRect(0, top, width, height);
      }
    });
  }
}

class ProfilePaneView implements IPrimitivePaneView {
  private current: ProfileRenderer | null = null;

  zOrder() {
    return "bottom" as const;
  }

  update(chart: IChartApi | null, series: ISeriesApi<"Candlestick"> | null, bars: Bar[]) {
    this.current = null;
    if (!chart || !series || bars.length === 0) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    const from = Math.max(0, Math.floor(range.from));
    const to = Math.min(bars.length - 1, Math.ceil(range.to));
    if (to < from) return;
    const bins = volumeByPrice(bars.slice(from, to + 1));
    const items: ProfileItem[] = [];
    let maxVolume = 0;
    for (const bin of bins) {
      const y1 = series.priceToCoordinate(bin.priceHigh);
      const y2 = series.priceToCoordinate(bin.priceLow);
      if (y1 === null || y2 === null) continue;
      items.push({ ...bin, y1, y2 });
      if (bin.volume > maxVolume) maxVolume = bin.volume;
    }
    this.current = new ProfileRenderer(items, maxVolume);
  }

  renderer() {
    return this.current;
  }

  clear() {
    this.current = null;
  }
}

export class VolumeProfilePrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private requestUpdate: (() => void) | null = null;
  private bars: Bar[] = [];
  private visible = true;
  private readonly view = new ProfilePaneView();
  private readonly views = [this.view];

  setBars(bars: Bar[]) {
    this.bars = bars;
    this.requestUpdate?.();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.requestUpdate?.();
  }

  attached(param: SeriesAttachedParameter<Time, "Candlestick">) {
    this.chart = param.chart as IChartApi;
    this.series = param.series as ISeriesApi<"Candlestick">;
    this.requestUpdate = param.requestUpdate;
  }

  detached() {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  updateAllViews() {
    try {
      if (!this.visible) {
        this.view.clear();
        return;
      }
      this.view.update(this.chart, this.series, this.bars);
    } catch {
      // viewport can update before price coordinates exist
    }
  }

  paneViews() {
    return this.views;
  }
}
