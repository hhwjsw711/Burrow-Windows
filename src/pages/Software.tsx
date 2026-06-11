import { useState } from "react";
import { useScanner } from "../hooks/useScanner";
import ProgressBar from "../components/ProgressBar";

interface AppInfo {
  name: string;
  size: string;
}

function parseAppLine(line: string): AppInfo | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("[") ||
    trimmed.startsWith("=") ||
    trimmed.startsWith("-")
  ) {
    return null;
  }
  const parts = trimmed.split("|").map((s) => s.trim());
  if (parts.length >= 2) {
    return { name: parts[0], size: parts[1] };
  }
  if (
    trimmed.length > 3 &&
    !trimmed.toLowerCase().includes("mole") &&
    !trimmed.includes("====")
  ) {
    return { name: trimmed, size: "" };
  }
  return null;
}

export default function Software(): React.ReactElement {
  const { lines, running, result, startScan, scrollRef } =
    useScanner("software");
  const [showRaw, setShowRaw] = useState(false);

  const handleScan = () => {
    startScan(false);
  };

  const apps = result
    ? lines.map(parseAppLine).filter((a): a is AppInfo => a !== null)
    : [];

  const hasJson = lines.some(
    (l) => l.trim().startsWith("[") || l.trim().startsWith("{"),
  );

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">
        Installed Software
      </h2>
      <p className="text-sm text-gray-500">
        View and manage applications installed on your system.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleScan}
          disabled={running}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Scan Installed Apps
        </button>
      </div>

      {running && <ProgressBar />}

      {result && apps.length === 0 && hasJson && (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
          <div className="text-yellow-400 text-sm mb-2">
            Output is JSON format.{" "}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="underline"
            >
              {showRaw ? "Hide raw output" : "Show raw output"}
            </button>
          </div>
          {showRaw && (
            <div
              ref={scrollRef}
              className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
            >
              {lines.map((line, i) => (
                <div key={i} className="text-gray-400 leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {apps.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase">
            <div className="col-span-8">Application</div>
            <div className="col-span-4 text-right">Size</div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {apps.map((app, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm border-b border-gray-800/50 hover:bg-gray-800/50"
              >
                <div className="col-span-8 text-gray-300 truncate">
                  {app.name}
                </div>
                <div className="col-span-4 text-right text-gray-500 font-mono text-xs">
                  {app.size}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && apps.length === 0 && !hasJson && (
        <div
          ref={scrollRef}
          className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
        >
          {lines.map((line, i) => (
            <div key={i} className="text-gray-400 leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
