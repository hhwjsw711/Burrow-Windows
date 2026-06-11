import { useState } from "react";
import { useScanner } from "../hooks/useScanner";
import ProgressBar from "../components/ProgressBar";
import GlassCard from "../components/GlassCard";
import LogTerminal from "../components/LogTerminal";
import { PrimaryButton } from "../components/ActionButton";
import PageTitle from "../components/PageTitle";

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
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle>Installed Software</PageTitle>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
        View and manage applications installed on your system.
      </p>

      <div className="flex gap-3">
        <PrimaryButton onClick={handleScan} disabled={running}>
          Scan Installed Apps
        </PrimaryButton>
      </div>

      {running && <ProgressBar />}

      {result && apps.length === 0 && hasJson && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "#E6A93C15",
            border: "1px solid #E6A93C40",
          }}
        >
          <div className="text-sm mb-2" style={{ color: "#E6A93C" }}>
            Output is JSON format.{" "}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="underline"
            >
              {showRaw ? "Hide raw output" : "Show raw output"}
            </button>
          </div>
          {showRaw && (
            <LogTerminal
              lines={lines}
              running={false}
              emptyMessage=""
              scrollRef={scrollRef}
            />
          )}
        </div>
      )}

      {apps.length > 0 && (
        <GlassCard className="!p-0">
          <div
            className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-label"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.085)",
              color: "rgba(255,255,255,0.40)",
            }}
          >
            <div className="col-span-8">Application</div>
            <div className="col-span-4 text-right">Size</div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {apps.map((app, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="col-span-8 truncate font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.80)" }}>
                  {app.name}
                </div>
                <div className="col-span-4 text-right font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {app.size}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {result && apps.length === 0 && !hasJson && (
        <LogTerminal
          lines={lines}
          running={false}
          emptyMessage=""
          scrollRef={scrollRef}
        />
      )}
    </div>
  );
}
