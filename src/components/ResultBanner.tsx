import type { ScanResult } from "../hooks/useScanner";

export default function ResultBanner({
  result,
  accent,
}: {
  result: ScanResult;
  accent: string;
}): React.ReactElement {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `${accent}15`,
        border: `1px solid ${accent}40`,
      }}
    >
      <div className="text-sm font-semibold" style={{ color: accent }}>
        {result.summary}
      </div>
    </div>
  );
}
