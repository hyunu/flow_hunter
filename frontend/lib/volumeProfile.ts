import type { Bar } from "@/lib/types";

export type VolumeBin = {
  priceLow: number;
  priceHigh: number;
  volume: number;
  poc: boolean;
};

export function volumeByPrice(bars: Bar[], bins = 28): VolumeBin[] {
  if (bars.length === 0) return [];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const bar of bars) {
    if (bar.low < min) min = bar.low;
    if (bar.high > max) max = bar.high;
  }
  if (!(max > min)) return [];
  const step = (max - min) / bins;
  const volumes = new Array<number>(bins).fill(0);
  for (const bar of bars) {
    const start = Math.max(0, Math.floor((bar.low - min) / step));
    const end = Math.min(bins - 1, Math.floor((bar.high - min) / step));
    const share = bar.volume / (end - start + 1);
    for (let i = start; i <= end; i += 1) volumes[i] += share;
  }
  const peak = Math.max(...volumes, 0);
  return volumes.map((volume, index) => ({
    priceLow: min + index * step,
    priceHigh: min + (index + 1) * step,
    volume,
    poc: peak > 0 && volume === peak,
  }));
}
