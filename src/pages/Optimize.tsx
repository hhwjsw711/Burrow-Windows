import { useScanner } from "../hooks/useScanner";
import { useTheme } from "../context/ThemeContext";
import ProgressBar from "../components/ProgressBar";
import GlassCard, { Eyebrow } from "../components/GlassCard";
import LogTerminal from "../components/LogTerminal";
import ResultBanner from "../components/ResultBanner";
import { PrimaryButton, SecondaryButton } from "../components/ActionButton";
import PageTitle from "../components/PageTitle";
import { optimizeLineStyle } from "../lib/lineStyle";

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
  const { accent } = useTheme();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle>System Optimization</PageTitle>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
        Run safe system maintenance — rebuild caches, flush DNS, repair system
        services, and more.
      </p>

      <GlassCard>
        <Eyebrow label="Optimization Steps" accent={accent} />
        <ul className="space-y-1.5">
          {optimizeSteps.map((step, i) => (
            <li
              key={i}
              className="text-sm font-mono"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              • {step}
            </li>
          ))}
        </ul>
      </GlassCard>

      <div className="flex gap-3">
        <SecondaryButton onClick={() => startScan(true)} disabled={running}>
          Dry Run
        </SecondaryButton>
        <PrimaryButton onClick={() => startScan(false)} disabled={running}>
          Optimize Now
        </PrimaryButton>
      </div>

      {running && <ProgressBar />}

      <LogTerminal
        lines={lines}
        running={running}
        emptyMessage="Press Dry Run to preview, or Optimize Now to execute."
        scrollRef={scrollRef}
        getLineStyle={optimizeLineStyle}
      />

      {result && <ResultBanner result={result} accent={accent} />}
    </div>
  );
}
