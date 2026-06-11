import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useHistory, type TimeRange, RANGES } from "../hooks/useHistory";
import ProcessTable from "../components/ProcessTable";
import GlassCard from "../components/GlassCard";
import PageTitle from "../components/PageTitle";

interface ChartPoint {
  collected_at: string;
  value: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildLineOption(
  data: ChartPoint[],
  color: string,
  unit: string,
): Record<string, unknown> {
  const times = data.map((s) => formatTime(s.collected_at));
  const values = data.map((s) => s.value);
  return {
    grid: { top: 24, right: 10, bottom: 20, left: 45 },
    xAxis: {
      type: "category",
      data: times,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      axisLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, interval: "auto" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: {
        color: "rgba(255,255,255,0.25)",
        fontSize: 10,
        formatter: `{value}${unit}`,
      },
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: unknown) => `${(v as number).toFixed(1)}${unit}`,
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}30` },
              { offset: 1, color: `${color}05` },
            ],
          },
        },
      },
    ],
  };
}

function buildAxisConfig(unit: string): Record<string, unknown> {
  return {
    grid: { top: 28, right: 10, bottom: 20, left: 45 },
    xAxis: {
      type: "category",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      axisLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, interval: "auto" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, formatter: unit },
    },
    tooltip: { trigger: "axis" },
  };
}

function ChartCard({
  title,
  option,
}: {
  title: string;
  option: Record<string, unknown>;
}): React.ReactElement {
  return (
    <GlassCard className="!p-3" style={{ height: 220 }}>
      <div className="text-[10px] font-mono font-bold uppercase tracking-label text-center mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>
        {title}
      </div>
      <ReactECharts
        option={option}
        style={{ height: "calc(100% - 16px)" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </GlassCard>
  );
}

export default function History(): React.ReactElement {
  const [range, setRange] = useState<TimeRange>("24h");
  const { snapshots, processes, loading, autoRefresh, setAutoRefresh } =
    useHistory(range);

  const cpuData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.cpu_usage_percent,
  }));
  const memData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.memory_used_percent,
  }));
  const diskReadData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.disk_read_bytes_per_sec / (1024 * 1024),
  }));
  const diskWriteData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.disk_write_bytes_per_sec / (1024 * 1024),
  }));
  const netDownData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.network_down_bytes_per_sec / (1024 * 1024),
  }));
  const netUpData: ChartPoint[] = snapshots.map((s) => ({
    collected_at: s.collected_at,
    value: s.network_up_bytes_per_sec / (1024 * 1024),
  }));

  const hasData = snapshots.length > 0;

  const diskOption: Record<string, unknown> = {
    ...buildAxisConfig("{value} MB/s"),
    xAxis: {
      type: "category",
      data: snapshots.map((s) => formatTime(s.collected_at)),
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      axisLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, interval: "auto" },
    },
    legend: {
      data: ["Read", "Write"],
      textStyle: { color: "rgba(255,255,255,0.40)", fontSize: 10 },
      top: 0,
    },
    series: [
      {
        name: "Read",
        type: "line",
        data: diskReadData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#57D58E", width: 1.5 },
      },
      {
        name: "Write",
        type: "line",
        data: diskWriteData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#F0B24A", width: 1.5 },
      },
    ],
  };

  const netOption: Record<string, unknown> = {
    ...buildAxisConfig("{value} MB/s"),
    xAxis: {
      type: "category",
      data: snapshots.map((s) => formatTime(s.collected_at)),
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      axisLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, interval: "auto" },
    },
    legend: {
      data: ["Down", "Up"],
      textStyle: { color: "rgba(255,255,255,0.40)", fontSize: 10 },
      top: 0,
    },
    series: [
      {
        name: "Down",
        type: "line",
        data: netDownData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#C79FD7", width: 1.5 },
      },
      {
        name: "Up",
        type: "line",
        data: netUpData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#F2894E", width: 1.5 },
      },
    ],
  };

  return (
    <div className="space-y-4">
      <PageTitle>History</PageTitle>

      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-0.5 rounded-full px-1 py-1"
          style={{
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.085)",
          }}
        >
          {(Object.keys(RANGES) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all duration-150"
              style={{
                background: range === r ? "white" : "transparent",
                color: range === r ? "#0B0B0D" : "rgba(255,255,255,0.40)",
              }}
            >
              {RANGES[r].label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          Auto-refresh
        </label>
      </div>

      {loading && !hasData ? (
        <div className="h-96 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.40)" }}>
          Loading history...
        </div>
      ) : !hasData ? (
        <div className="h-96 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.25)" }}>
          No data for this range. Wait for the sampler to collect more
          snapshots.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <ChartCard title="CPU" option={buildLineOption(cpuData, "#F0604E", "%")} />
            <ChartCard title="Memory" option={buildLineOption(memData, "#F0B24A", "%")} />
            <ChartCard title="Disk I/O" option={diskOption} />
            <ChartCard title="Network I/O" option={netOption} />
          </div>

          <ProcessTable processes={processes} />
        </>
      )}
    </div>
  );
}
