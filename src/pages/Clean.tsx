import { useState } from "react";
import { useScanner } from "../hooks/useScanner";
import ProgressBar from "../components/ProgressBar";

const cleanCategories = [
  "User temp files",
  "Browser cache",
  "Developer caches (npm, pip, etc.)",
  "Windows logs & temp",
  "App-specific cache",
  "Recycle Bin",
];

export default function Clean(): React.ReactElement {
  const { lines, running, result, startScan, scrollRef } = useScanner("clean");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(cleanCategories),
  );
  const toggleCategory = (cat: string) => {
    const next = new Set(selected);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setSelected(next);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">System Cleanup</h2>

      {/* Category Selection */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-xs text-gray-500 uppercase mb-3">Categories</div>
        <div className="space-y-2">
          {cleanCategories.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                checked={selected.has(cat)}
                onChange={() => toggleCategory(cat)}
                disabled={running}
                className="accent-purple-600"
              />
              {cat}
            </label>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {selected.size} of {cleanCategories.length} selected
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => startScan(true)}
          disabled={running || selected.size === 0}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Dry Run
        </button>
        <button
          onClick={() => startScan(false)}
          disabled={running || selected.size === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clean Now
        </button>
      </div>

      {/* Progress */}
      {running && <ProgressBar />}

      {/* Output Log */}
      <div
        ref={scrollRef}
        className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
      >
        {lines.length === 0 && !running && (
          <div className="text-gray-600">
            Press Dry Run to preview, or Clean Now to execute.
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={`leading-relaxed ${getLineStyle(line)}`}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Summary */}
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
  if (line.includes("Error") || line.startsWith("✗")) return "text-red-400";
  return "text-gray-400";
}
