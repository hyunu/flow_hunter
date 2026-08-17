import type { Bar } from "@/lib/types";

const WINDOWS = [
  { key: "ma20", window: 20 },
  { key: "ma60", window: 60 },
  { key: "ma120", window: 120 },
] as const;

export function attachMovingAverages(bars: Bar[]): Bar[] {
  const sums = WINDOWS.map(() => 0);
  return bars.map((bar, index) => {
    const features = { ...bar.features };
    WINDOWS.forEach((item, slot) => {
      sums[slot] += bar.close;
      if (index >= item.window) sums[slot] -= bars[index - item.window].close;
      if (index >= item.window - 1) {
        features[item.key] = sums[slot] / item.window;
      }
    });
    return { ...bar, features };
  });
}
