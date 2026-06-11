import type { ProcessInfo } from "../lib/api";
import { formatBytes } from "../lib/format";
import GlassCard, { Eyebrow } from "./GlassCard";

interface ProcessTableProps {
  processes: ProcessInfo[];
  accent?: string;
}

export default function ProcessTable({
  processes,
  accent,
}: ProcessTableProps): React.ReactElement {
  const top5 = processes.slice(0, 5);

  return (
    <GlassCard>
      <Eyebrow label="Top Processes" accent={accent} />
      <div className="space-y-2">
        {top5.map((p) => (
          <div key={p.pid} className="flex items-center gap-2 text-sm">
            <span className="w-28 truncate font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.80)" }}>
              {p.name}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(p.cpu_percent, 100)}%`,
                  background: accent ?? "#8E84F0",
                }}
              />
            </div>
            <span className="w-12 text-right font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.62)" }}>
              {p.cpu_percent.toFixed(1)}%
            </span>
            <span className="w-20 text-right font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              {formatBytes(p.memory_bytes)}
            </span>
          </div>
        ))}
        {top5.length === 0 && (
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No process data
          </div>
        )}
      </div>
    </GlassCard>
  );
}
