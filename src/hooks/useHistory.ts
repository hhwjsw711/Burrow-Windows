import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSnapshotHistory,
  getTopProcesses,
  type MetricsSnapshot,
  type ProcessInfo,
} from "../lib/api";

export type TimeRange = "5m" | "1h" | "6h" | "24h" | "7d" | "30d" | "90d";

interface RangeConfig {
  hours: number;
  strideSecs: number;
  label: string;
}

export const RANGES: Record<TimeRange, RangeConfig> = {
  "5m":  { hours: 0.083, strideSecs: 0, label: "5m" },
  "1h": { hours: 1, strideSecs: 0, label: "1h" },
  "6h": { hours: 6, strideSecs: 300, label: "6h" },
  "24h": { hours: 24, strideSecs: 900, label: "24h" },
  "7d": { hours: 168, strideSecs: 3600, label: "7d" },
  "30d": { hours: 720, strideSecs: 14400, label: "30d" },
  "90d": { hours: 2160, strideSecs: 43200, label: "90d" },
};

export function useHistory(range: TimeRange) {
  const [snapshots, setSnapshots] = useState<MetricsSnapshot[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  const fetchData = useCallback(async (r: TimeRange) => {
    const cfg = RANGES[r];
    setLoading(true);
    try {
      const [snaps, procs] = await Promise.all([
        getSnapshotHistory(cfg.hours, cfg.strideSecs),
        getTopProcesses(cfg.hours),
      ]);
      setSnapshots(snaps);
      setProcesses(procs);
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(range), 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, range, fetchData]);

  return {
    snapshots,
    processes,
    loading,
    autoRefresh,
    setAutoRefresh,
    fetchData: () => fetchData(range),
  };
}
