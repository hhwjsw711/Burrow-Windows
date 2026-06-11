import ReactECharts from "echarts-for-react";
import GlassCard, { Eyebrow } from "./GlassCard";

function gaugeColor(value: number, title: string): string {
  if (title === "CPU") {
    return value < 50 ? "#57D58E" : value < 80 ? "#F0B24A" : "#F0604E";
  }
  if (title === "Memory") {
    return value < 60 ? "#57D58E" : value < 85 ? "#F0B24A" : "#F0604E";
  }
  if (title === "Disk") {
    return value < 70 ? "#57D58E" : value < 90 ? "#F0B24A" : "#F0604E";
  }
  return "#57D58E";
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
            color: [[1, "rgba(255,255,255,0.10)"]],
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
          fontFamily: "Consolas, monospace",
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
  accent?: string;
}

export default function MetricCard({
  title,
  value,
  valueLabel,
  sparklineData,
  color,
  subtitle,
  accent,
}: MetricCardProps): React.ReactElement {
  const resolvedColor = color ?? (value !== undefined ? gaugeColor(value, title) : "#57D58E");
  const hasSparkline = sparklineData && sparklineData.length > 1;

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <Eyebrow label={title} accent={accent} />
        {valueLabel && (
          <div className="text-[10px] font-mono truncate ml-2 max-w-[60%] text-right" style={{ color: "rgba(255,255,255,0.40)" }}>
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
        <div className="text-[9px] font-mono mt-1 truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
          {subtitle}
        </div>
      )}
    </GlassCard>
  );
}
