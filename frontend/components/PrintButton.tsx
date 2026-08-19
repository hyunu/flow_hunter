"use client";

export default function PrintButton() {
  return (
    <button className="manual-print-btn" type="button" onClick={() => window.print()}>
      인쇄 / PDF 저장
    </button>
  );
}
