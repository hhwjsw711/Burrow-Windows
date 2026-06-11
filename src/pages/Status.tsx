import MetricCard from "../components/MetricCard";
import ProcessTable from "../components/ProcessTable";
import { useMetrics } from "../hooks/useMetrics";
import { formatBytes, formatUptime } from "../lib/format";

export default function Status(): React.ReactElement {
  const { latest, history } = useMetrics();

  if (!latest)
    return (
      <div className="p-8 text-gray-500">Waiting for first sample...</div>
    );

  const cpuHistory = history.map((s) => s.cpu_usage_percent);
  const memHistory = history.map((s) => s.memory_used_percent);
  const netDownHistory = history.map(
    (s) => s.network_down_bytes_per_sec / (1024 * 1024),
  );

  const healthColor =
    latest.health_score >= 80
      ? "text-green-400"
      : latest.health_score >= 60
        ? "text-yellow-400"
        : latest.health_score >= 40
          ? "text-orange-400"
          : "text-red-400";

  const diskPct =
    latest.disk_total_bytes > 0
      ? (latest.disk_used_bytes / latest.disk_total_bytes) * 100
      : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Health Banner */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex items-center gap-4">
        <div className={`text-4xl font-bold ${healthColor}`}>
          {latest.health_score}
        </div>
        <div>
          <div className={`text-lg font-semibold ${healthColor}`}>
            {latest.health_message}
          </div>
          <div className="text-xs text-gray-500">
            {latest.hostname} — {latest.os_version} — Uptime{" "}
            {formatUptime(latest.uptime_seconds)}
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="CPU"
          value={latest.cpu_usage_percent}
          sparklineData={cpuHistory}
          subtitle={`${latest.cpu_cores} cores`}
        />
        <MetricCard
          title="Memory"
          value={latest.memory_used_percent}
          sparklineData={memHistory}
          valueLabel={`${formatBytes(latest.memory_used_bytes)} / ${formatBytes(latest.memory_total_bytes)}`}
        />
        <MetricCard
          title="Disk"
          value={diskPct}
          subtitle={`↓ ${formatBytes(latest.disk_read_bytes_per_sec)}/s  ↑ ${formatBytes(latest.disk_write_bytes_per_sec)}/s`}
          valueLabel={`${formatBytes(latest.disk_used_bytes)} / ${formatBytes(latest.disk_total_bytes)}`}
        />
        <MetricCard
          title="Network"
          value={0}
          sparklineData={netDownHistory}
          valueLabel={`↓ ${formatBytes(latest.network_down_bytes_per_sec)}/s`}
          subtitle={`↑ ${formatBytes(latest.network_up_bytes_per_sec)}/s`}
          color="#C79FD7"
        />
        <ProcessTable processes={latest.top_processes} />
        {/* System Info Card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-xs text-gray-500 uppercase mb-3">System</div>
          <div className="space-y-2 text-sm font-mono text-gray-300">
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
        </div>
      </div>
    </div>
  );
}
