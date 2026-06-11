import type { ProcessInfo } from "../lib/api";
import { formatBytes } from "../lib/format";

export default function ProcessTable({
  processes,
}: {
  processes: ProcessInfo[];
}): React.ReactElement {
  const top5 = processes.slice(0, 5);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="text-xs text-gray-500 uppercase mb-3">Top Processes</div>
      <div className="space-y-2">
        {top5.map((p) => (
          <div key={p.pid} className="flex items-center gap-2 text-sm">
            <span className="w-28 truncate text-gray-300">{p.name}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(p.cpu_percent, 100)}%` }}
              />
            </div>
            <span className="w-12 text-right text-gray-400 font-mono text-xs">
              {p.cpu_percent.toFixed(1)}%
            </span>
            <span className="w-20 text-right text-gray-500 font-mono text-xs">
              {formatBytes(p.memory_bytes)}
            </span>
          </div>
        ))}
        {top5.length === 0 && (
          <div className="text-xs text-gray-600">No process data</div>
        )}
      </div>
    </div>
  );
}
