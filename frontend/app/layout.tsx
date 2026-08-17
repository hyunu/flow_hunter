import type { Metadata } from "next";
import { ibmPlexMono, notoSansKr } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowHunter",
  description: "대규모 자금 활동 가능성 구간을 탐지하고 과거 성과를 검증합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${ibmPlexMono.variable}`}>
      <body className={notoSansKr.className}>{children}</body>
    </html>
  );
}
