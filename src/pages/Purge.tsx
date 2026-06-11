import { useScanner } from "../hooks/useScanner";
import { useTheme } from "../context/ThemeContext";
import ProgressBar from "../components/ProgressBar";
import LogTerminal from "../components/LogTerminal";
import ResultBanner from "../components/ResultBanner";
import { PrimaryButton, SecondaryButton } from "../components/ActionButton";
import PageTitle from "../components/PageTitle";
import { scanLineStyle } from "../lib/lineStyle";

export default function Purge(): React.ReactElement {
  const { lines, running, result, startScan, scrollRef } = useScanner("purge");
  const { accent } = useTheme();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle>Development Artifact Purge</PageTitle>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
        Clean up old build artifacts — node_modules, target/, build/, dist/,
        venv, __pycache__ — from your projects.
      </p>

      <div className="flex gap-3">
        <SecondaryButton onClick={() => startScan(true)} disabled={running}>
          Dry Run
        </SecondaryButton>
        <PrimaryButton onClick={() => startScan(false)} disabled={running}>
          Purge Now
        </PrimaryButton>
      </div>

      {running && <ProgressBar />}

      <LogTerminal
        lines={lines}
        running={running}
        emptyMessage="Press Dry Run to preview, or Purge Now to clean."
        scrollRef={scrollRef}
        getLineStyle={scanLineStyle}
      />

      {result && <ResultBanner result={result} accent={accent} />}
    </div>
  );
}
