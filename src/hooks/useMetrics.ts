import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  getLatestSnapshot,
  getSnapshotHistory,
  type MetricsSnapshot,
} from "../lib/api";

const MAX_BUFFER = 300;

export function useMetrics() {
  const [latest, setLatest] = useState<MetricsSnapshot | null>(null);
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const historyRef = useRef<MetricsSnapshot[]>([]);

  useEffect(() => {
    getLatestSnapshot().then(setLatest);
    getSnapshotHistory(1, 0).then((snaps) => {
      setHistory(snaps);
      historyRef.current = snaps;
    });

    const unlistenPromise = listen<MetricsSnapshot>(
      "snapshot-update",
      (e) => {
        const snap = e.payload;
        setLatest(snap);
        historyRef.current = [...historyRef.current, snap].slice(-MAX_BUFFER);
        setHistory(historyRef.current);
      },
    );

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  return { latest, history };
}
