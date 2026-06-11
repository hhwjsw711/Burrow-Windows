import { useScanner } from "../hooks/useScanner";
import ProgressBar from "../components/ProgressBar";

const optimizeSteps = [
  "Clear Windows Update cache",
  "Reset DNS cache",
  "Clean event logs and diagnostic reports",
  "Refresh Windows Search index",
  "Clear thumbnail cache",
  "Optimize startup programs",
  "System repairs (Font/Icon/Store/Search)",
];

export default function Optimize(): React.ReactElement {
  const { lines, running, result, startScan, scrollRef } =
    useScanner("optimize");

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">
        System Optimization
      </h2>
      <p className="text-sm text-gray-500">
        Run safe system maintenance — rebuild caches, flush DNS, repair system
        services, and more.
      </p>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-xs text-gray-500 uppercase mb-3">
          Optimization Steps
        </div>
        <ul className="space-y-1">
          {optimizeSteps.map((step, i) => (
            <li key={i} className="text-sm text-gray-400">
              • {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => startScan(true)}
          disabled={running}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Dry Run
        </button>
        <button
          onClick={() => startScan(false)}
          disabled={running}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Optimize Now
        </button>
      </div>

      {running && <ProgressBar />}

      <div
        ref={scrollRef}
        className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
      >
        {lines.length === 0 && !running && (
          <div className="text-gray-600">
            Press Dry Run to preview, or Optimize Now to execute.
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`leading-relaxed ${getLineStyle(line)}`}>
            {line}
          </div>
        ))}
      </div>

      {result && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4">
          <div className="text-green-400 font-semibold text-sm">
            {result.summary}
          </div>
        </div>
      )}
    </div>
  );
}

function getLineStyle(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("completed") || lower.includes("success")) {
    return "text-green-400 font-bold";
  }
  if (line.startsWith("[stderr]")) return "text-red-400";
  if (line.includes("✓")) return "text-green-300";
  if (line.includes("error") || line.startsWith("✗")) return "text-red-400";
  return "text-gray-400";
}
