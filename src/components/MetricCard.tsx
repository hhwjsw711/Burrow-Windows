import ReactECharts from "echarts-for-react";

function gaugeColor(value: number, title: string): string {
  if (title === "CPU") {
    return value < 50 ? "#A5D6A7" : value < 80 ? "#FFD75F" : "#FF5F5F";
  }
  if (title === "Memory") {
    return value < 60 ? "#A5D6A7" : value < 85 ? "#FFD75F" : "#FF5F5F";
  }
  if (title === "Disk") {
    return value < 70 ? "#A5D6A7" : value < 90 ? "#FFD75F" : "#FF5F5F";
  }
  return "#A5D6A7";
}

function buildGaugeOption(
  value: number,
  color: string,
): Record<string, unknown> {
  return {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        center: ["50%", "60%"],
        radius: "85%",
        progress: {
          show: true,
          width: 6,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: {
            width: 6,
            color: [[1, "#1f2937"]],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          show: true,
          offsetCenter: [0, "70%"],
          valueAnimation: true,
          fontSize: 18,
          fontFamily: "monospace",
          color: color,
          formatter: `{value}%`,
        },
        data: [{ value }],
        pointer: { show: false },
        title: { show: false },
      },
    ],
  };
}

function buildSparklineOption(
  data: number[],
  color: string,
): Record<string, unknown> {
  const indices = data.map((_, i) => i);
  return {
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: "category", show: false, data: indices },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        data,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}08` },
            ],
          },
        },
      },
    ],
  };
}

export interface MetricCardProps {
  title: string;
  value?: number;
  valueLabel?: string;
  sparklineData?: number[];
  color?: string;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  valueLabel,
  sparklineData,
  color,
  subtitle,
}: MetricCardProps): React.ReactElement {
  const resolvedColor = color ?? (value !== undefined ? gaugeColor(value, title) : "#A5D6A7");
  const hasSparkline = sparklineData && sparklineData.length > 1;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div className="text-xs text-gray-500 uppercase">{title}</div>
        {valueLabel && (
          <div className="text-xs font-mono text-gray-400 truncate ml-2 max-w-[60%] text-right">
            {valueLabel}
          </div>
        )}
      </div>

      {value !== undefined && (
        <div className="flex-1" style={{ height: 110 }}>
          <ReactECharts
            option={buildGaugeOption(value, resolvedColor)}
            style={{ height: 110 }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      )}

      {hasSparkline && (
        <div style={{ height: 40 }}>
          <ReactECharts
            option={buildSparklineOption(sparklineData!, resolvedColor)}
            style={{ height: 40 }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      )}

      {subtitle && (
        <div className="text-xs text-gray-500 mt-1 font-mono truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
