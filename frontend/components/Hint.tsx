import type { ReactNode } from "react";

export default function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="hint-btn" role="note" aria-label="이 카드 읽는 법">
      i
      <span className="hint-tip">{children}</span>
    </span>
  );
}