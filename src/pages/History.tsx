import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useHistory, type TimeRange, RANGES } from "../hooks/useHistory";
import ProcessTable from "../components/ProcessTable";

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
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#666", fontSize: 10, interval: "auto" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#1a1a2e" } },
      axisLabel: { color: "#666", fontSize: 10, formatter: `{value}${unit}` },
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

  const diskTimes = snapshots.map((s) => formatTime(s.collected_at));
  const diskOption: Record<string, unknown> = {
    grid: { top: 28, right: 10, bottom: 20, left: 45 },
    xAxis: {
      type: "category",
      data: diskTimes,
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#666", fontSize: 10, interval: "auto" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#1a1a2e" } },
      axisLabel: {
        color: "#666",
        fontSize: 10,
        formatter: "{value} MB/s",
      },
    },
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Read", "Write"],
      textStyle: { color: "#888", fontSize: 10 },
      top: 0,
    },
    series: [
      {
        name: "Read",
        type: "line",
        data: diskReadData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#A5D6A7", width: 1.5 },
      },
      {
        name: "Write",
        type: "line",
        data: diskWriteData.map((d) => d.value),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#FFD75F", width: 1.5 },
      },
    ],
  };

  const netTimes = snapshots.map((s) => formatTime(s.collected_at));
  const netOption: Record<string, unknown> = {
    grid: { top: 28, right: 10, bottom: 20, left: 45 },
    xAxis: {
      type: "category",
      data: netTimes,
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#666", fontSize: 10, interval: "auto" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#1a1a2e" } },
      axisLabel: {
        color: "#666",
        fontSize: 10,
        formatter: "{value} MB/s",
      },
    },
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Down", "Up"],
      textStyle: { color: "#888", fontSize: 10 },
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
        lineStyle: { color: "#FF8A65", width: 1.5 },
      },
    ],
  };

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(Object.keys(RANGES) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === r
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {RANGES[r].label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-purple-600"
          />
          Auto-refresh
        </label>
      </div>

      {loading && !hasData ? (
        <div className="h-96 flex items-center justify-center text-gray-500">
          Loading history...
        </div>
      ) : !hasData ? (
        <div className="h-96 flex items-center justify-center text-gray-600">
          No data for this range. Wait for the sampler to collect more
          snapshots.
        </div>
      ) : (
        <>
          {/* 2x2 Chart Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-gray-900 rounded-lg border border-gray-800 p-3"
              style={{ height: 220 }}
            >
              <div className="text-xs text-gray-500 text-center mb-1">
                CPU
              </div>
              <ReactECharts
                option={buildLineOption(cpuData, "#FF5F5F", "%")}
                style={{ height: "calc(100% - 16px)" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div
              className="bg-gray-900 rounded-lg border border-gray-800 p-3"
              style={{ height: 220 }}
            >
              <div className="text-xs text-gray-500 text-center mb-1">
                Memory
              </div>
              <ReactECharts
                option={buildLineOption(memData, "#FFD75F", "%")}
                style={{ height: "calc(100% - 16px)" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div
              className="bg-gray-900 rounded-lg border border-gray-800 p-3"
              style={{ height: 220 }}
            >
              <div className="text-xs text-gray-500 text-center mb-1">
                Disk I/O
              </div>
              <ReactECharts
                option={diskOption}
                style={{ height: "calc(100% - 16px)" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div
              className="bg-gray-900 rounded-lg border border-gray-800 p-3"
              style={{ height: 220 }}
            >
              <div className="text-xs text-gray-500 text-center mb-1">
                Network I/O
              </div>
              <ReactECharts
                option={netOption}
                style={{ height: "calc(100% - 16px)" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          {/* Top Processes */}
          <ProcessTable processes={processes} />
        </>
      )}
    </div>
  );
}
