import { useState } from "react";
import { useScanner } from "../hooks/useScanner";
import { useTheme } from "../context/ThemeContext";
import ProgressBar from "../components/ProgressBar";
import GlassCard, { Eyebrow } from "../components/GlassCard";
import LogTerminal from "../components/LogTerminal";
import ResultBanner from "../components/ResultBanner";
import { PrimaryButton, SecondaryButton } from "../components/ActionButton";
import PageTitle from "../components/PageTitle";
import { scanLineStyle } from "../lib/lineStyle";

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
  const { accent } = useTheme();
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
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle>System Cleanup</PageTitle>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
        Remove temporary files, caches, and clutter — preview before committing.
      </p>

      <GlassCard>
        <Eyebrow label="Categories" accent={accent} />
        <div className="space-y-2">
          {cleanCategories.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 text-sm"
              style={{ color: "rgba(255,255,255,0.80)" }}
            >
              <input
                type="checkbox"
                checked={selected.has(cat)}
                onChange={() => toggleCategory(cat)}
                disabled={running}
                className="h-4 w-4 rounded"
                style={{ accentColor: accent }}
              />
              {cat}
            </label>
          ))}
        </div>
        <div className="mt-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.40)" }}>
          {selected.size} of {cleanCategories.length} selected
        </div>
      </GlassCard>

      <div className="flex gap-3">
        <SecondaryButton onClick={() => startScan(true)} disabled={running || selected.size === 0}>
          Dry Run
        </SecondaryButton>
        <PrimaryButton onClick={() => startScan(false)} disabled={running || selected.size === 0}>
          Clean Now
        </PrimaryButton>
      </div>

      {running && <ProgressBar />}

      <LogTerminal
        lines={lines}
        running={running}
        emptyMessage="Press Dry Run to preview, or Clean Now to execute."
        scrollRef={scrollRef}
        getLineStyle={scanLineStyle}
      />

      {result && <ResultBanner result={result} accent={accent} />}
    </div>
  );
}
