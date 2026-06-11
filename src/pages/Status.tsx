import MetricCard from "../components/MetricCard";
import ProcessTable from "../components/ProcessTable";
import { useMetrics } from "../hooks/useMetrics";
import { useTheme } from "../context/ThemeContext";
import { formatBytes, formatUptime } from "../lib/format";
import GlassCard, { Eyebrow } from "../components/GlassCard";
import PageTitle from "../components/PageTitle";

function getHealthColor(score: number): string {
  if (score >= 80) return "#57D58E";
  if (score >= 60) return "#E6A93C";
  if (score >= 40) return "#F2894E";
  return "#F0604E";
}

export default function Status(): React.ReactElement {
  const { latest, history } = useMetrics();
  const { accent } = useTheme();

  if (!latest)
    return (
      <div className="p-8" style={{ color: "rgba(255,255,255,0.40)" }}>
        Waiting for first sample...
      </div>
    );

  const cpuHistory = history.map((s) => s.cpu_usage_percent);
  const memHistory = history.map((s) => s.memory_used_percent);
  const netDownHistory = history.map(
    (s) => s.network_down_bytes_per_sec / (1024 * 1024),
  );

  const healthColor = getHealthColor(latest.health_score);

  const diskPct =
    latest.disk_total_bytes > 0
      ? (latest.disk_used_bytes / latest.disk_total_bytes) * 100
      : 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageTitle>Overview</PageTitle>

      <GlassCard className="flex items-center gap-6">
        <div className="text-[30px] font-semibold font-mono" style={{ color: healthColor }}>
          {latest.health_score}
        </div>
        <div>
          <div className="text-[15px] font-semibold font-sans" style={{ color: healthColor }}>
            {latest.health_message}
          </div>
          <div className="text-[11px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
            {latest.hostname} — {latest.os_version} — Uptime{" "}
            {formatUptime(latest.uptime_seconds)}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="CPU"
          value={latest.cpu_usage_percent}
          sparklineData={cpuHistory}
          subtitle={`${latest.cpu_cores} cores`}
          accent={accent}
        />
        <MetricCard
          title="Memory"
          value={latest.memory_used_percent}
          sparklineData={memHistory}
          valueLabel={`${formatBytes(latest.memory_used_bytes)} / ${formatBytes(latest.memory_total_bytes)}`}
          accent={accent}
        />
        <MetricCard
          title="Disk"
          value={diskPct}
          subtitle={`↓ ${formatBytes(latest.disk_read_bytes_per_sec)}/s  ↑ ${formatBytes(latest.disk_write_bytes_per_sec)}/s`}
          valueLabel={`${formatBytes(latest.disk_used_bytes)} / ${formatBytes(latest.disk_total_bytes)}`}
          accent={accent}
        />
        <MetricCard
          title="Network"
          value={0}
          sparklineData={netDownHistory}
          valueLabel={`↓ ${formatBytes(latest.network_down_bytes_per_sec)}/s`}
          subtitle={`↑ ${formatBytes(latest.network_up_bytes_per_sec)}/s`}
          color="#C79FD7"
          accent={accent}
        />
        <ProcessTable processes={latest.top_processes} accent={accent} />
        <GlassCard>
          <Eyebrow label="System" accent={accent} />
          <div className="space-y-1.5 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.80)" }}>
            <div>OS: {latest.os_version}</div>
            <div>Host: {latest.hostname}</div>
            <div>Uptime: {formatUptime(latest.uptime_seconds)}</div>
            <div>
              Swap: {formatBytes(latest.swap_used_bytes)} /{" "}
              {formatBytes(latest.swap_total_bytes)}
            </div>
            {latest.gpu_name && <div>GPU: {latest.gpu_name}</div>}
            {latest.battery_percent !== null && (
              <div>
                Battery: {latest.battery_percent.toFixed(0)}%{" "}
                {latest.power_plugged ? "⚡" : "🔋"}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
