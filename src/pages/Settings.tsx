import { useEffect, useState } from "react";
import { getSamplerInfo, type SamplerInfo } from "../lib/api";
import GlassCard from "../components/GlassCard";
import PageTitle from "../components/PageTitle";

function formatDbSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <span className="text-sm font-sans" style={{ color: "rgba(255,255,255,0.62)" }}>
        {label}
      </span>
      <span className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.80)" }}>
        {value}
      </span>
    </div>
  );
}

export default function Settings(): React.ReactElement {
  const [info, setInfo] = useState<SamplerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSamplerInfo()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load settings"));
  }, []);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <PageTitle>Settings</PageTitle>

      {error && (
        <div className="text-sm" style={{ color: "#F0604E" }}>
          {error}
        </div>
      )}

      <GlassCard className="!p-0">
        <SettingRow
          label="Sampler"
          value={
            info ? (info.is_running ? "Running" : "Stopped") : "..."
          }
        />
        <SettingRow
          label="Sampling Interval"
          value={
            info ? `${info.sampling_interval_secs}s` : "..."
          }
        />
        <SettingRow
          label="Data Retention"
          value={info ? `${info.retention_days} days` : "..."}
        />
        <SettingRow
          label="Total Snapshots"
          value={
            info ? info.total_snapshots.toLocaleString() : "..."
          }
        />
        <SettingRow
          label="Database Size"
          value={info ? formatDbSize(info.db_size_bytes) : "..."}
        />
        <SettingRow
          label="Database Path"
          value="%LOCALAPPDATA%\Burrow\burrow.db"
        />
      </GlassCard>

      <GlassCard className="!p-0">
        <SettingRow label="Version" value="0.1.0" />
        <SettingRow label="Engine" value="Mole-Windows (PowerShell)" />
        <SettingRow label="Window Manager" value="Tauri v2" />
      </GlassCard>
    </div>
  );
}
