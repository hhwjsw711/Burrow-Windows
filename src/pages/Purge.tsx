import { useScanner } from "../hooks/useScanner";
import ProgressBar from "../components/ProgressBar";

export default function Purge(): React.ReactElement {
  const { lines, running, result, startScan, scrollRef } = useScanner("purge");

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">
        Development Artifact Purge
      </h2>
      <p className="text-sm text-gray-500">
        Clean up old build artifacts — node_modules, target/, build/, dist/,
        venv, __pycache__ — from your projects.
      </p>

      {/* Controls */}
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
          Purge Now
        </button>
      </div>

      {running && <ProgressBar />}

      {/* Output Log */}
      <div
        ref={scrollRef}
        className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
      >
        {lines.length === 0 && !running && (
          <div className="text-gray-600">
            Press Dry Run to preview, or Purge Now to clean.
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
  if (lower.includes("space freed") || lower.includes("freed")) {
    return "text-green-400 font-bold";
  }
  if (line.startsWith("[stderr]")) return "text-red-400";
  if (line.includes("✓") || line.includes("Success")) return "text-green-300";
  return "text-gray-400";
}
