import type { RefObject } from "react";

export default function LogTerminal({
  lines,
  running,
  emptyMessage,
  scrollRef,
  getLineStyle,
  className = "",
}: {
  lines: string[];
  running: boolean;
  emptyMessage: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  getLineStyle?: (line: string) => string;
  className?: string;
}): React.ReactElement {
  const styleFn = getLineStyle ?? (() => "");
  return (
    <div
      ref={scrollRef}
      className={`rounded-2xl p-4 h-80 overflow-y-auto font-mono text-xs ${className}`}
      style={{
        background: "rgba(0,0,0,0.30)",
        border: "1px solid rgba(255,255,255,0.085)",
      }}
    >
      {lines.length === 0 && !running && (
        <div style={{ color: "rgba(255,255,255,0.25)" }}>
          {emptyMessage}
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`leading-relaxed ${styleFn(line)}`}>
          {line}
        </div>
      ))}
    </div>
  );
}
