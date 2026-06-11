import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface ScanProgress {
  command: string;
  line: string;
  is_done: boolean;
  summary: string | null;
}

export interface ScanResult {
  command: string;
  output: string[];
  exit_code: number;
  summary: string;
}

const CMD_MAP: Record<string, string> = {
  clean: "run_clean",
  purge: "run_purge",
  optimize: "run_optimize",
  software: "list_software",
};

export function useScanner(command: string) {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<string[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    const unlistenPromise = listen<ScanProgress>("scan-progress", (e) => {
      const p = e.payload;
      if (p.command !== command) return;
      if (p.is_done) {
        setRunning(false);
        setResult({
          command: p.command,
          output: linesRef.current,
          exit_code: 0,
          summary: p.summary ?? "",
        });
      } else if (p.line) {
        linesRef.current = [...linesRef.current, p.line];
        setLines(linesRef.current);
      }
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [command]);

  const startScan = useCallback(
    async (dryRun: boolean) => {
      linesRef.current = [];
      setLines([]);
      setResult(null);
      setRunning(true);
      const cmd = CMD_MAP[command] ?? "";
      try {
        if (command === "software") {
          await invoke(cmd);
        } else {
          await invoke(cmd, { dryRun });
        }
      } catch (e) {
        setRunning(false);
        const errLine = `Error: ${e}`;
        linesRef.current = [...linesRef.current, errLine];
        setLines(linesRef.current);
      }
    },
    [command],
  );

  return { lines, running, result, startScan, scrollRef };
}
