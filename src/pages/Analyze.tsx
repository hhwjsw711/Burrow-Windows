import { useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { scanDirectory, type DirEntry, type TreemapNode } from "../lib/api";
import { formatBytes } from "../lib/format";
import GlassCard from "../components/GlassCard";
import { PrimaryButton } from "../components/ActionButton";
import PageTitle from "../components/PageTitle";

export default function Analyze(): React.ReactElement {
  const [currentPath, setCurrentPath] = useState<string>("C:\\Users");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  const doScan = useCallback(
    async (path: string, addToBreadcrumb: boolean) => {
      setLoading(true);
      try {
        const result = await scanDirectory(path, 2);
        setEntries(result);
        setCurrentPath(path);
        if (addToBreadcrumb) {
          setBreadcrumb((prev) => {
            if (prev[prev.length - 1] !== path) {
              return [...prev, path];
            }
            return prev;
          });
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    doScan(currentPath, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (idx: number) => {
    const path = breadcrumb[idx];
    setBreadcrumb(breadcrumb.slice(0, idx + 1));
    doScan(path, false);
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doScan(currentPath, true);
  };

  const treemapData: TreemapNode[] = useMemo(
    () =>
      entries.map((e) => ({
        name: e.name,
        value: e.size || 1,
        path: e.path,
        isDir: e.is_dir,
      })),
    [entries],
  );

  const option = useMemo(() => ({
    tooltip: {
      formatter: (params: unknown) => {
        const d = (params as { data: { name: string; value: number; isDir: boolean } }).data;
        return `${d.name}<br/>Size: ${formatBytes(d.value)}<br/>${d.isDir ? "Directory" : "File"}<br/><span style="color:#888">Double-click to enter directory</span>`;
      },
    },
    series: [
      {
        type: "treemap",
        data: treemapData,
        width: "100%",
        height: "100%",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { name: string; rect?: { width: number } };
            const name = p.name ?? "";
            const maxLen = Math.floor((p.rect?.width ?? 200) / 8);
            return name.length > maxLen
              ? name.slice(0, maxLen - 2) + ".."
              : name;
          },
          fontSize: 12,
          color: "#fff",
        },
        upperLabel: {
          show: true,
          height: 20,
          color: "#888",
          fontSize: 10,
        },
        itemStyle: { borderColor: "#0B0B0D", borderWidth: 2 },
        levels: [
          {
            colorMappingBy: "value",
            color: [
              "#12233A",
              "#152B4A",
              "#193359",
              "#1D3C6E",
              "#224C8A",
              "#275DA0",
              "#2C6DB5",
              "#3580CC",
            ],
          },
        ],
      },
    ],
  }), [treemapData]);

  const onChartClick = (params: unknown) => {
    const p = params as { data?: { path: string; isDir: boolean } };
    if (p.data) {
      setSelectedPath(p.data.path);
    }
  };

  const onChartDblClick = (params: unknown) => {
    const p = params as { data?: { path: string; isDir: boolean } };
    if (p.data?.isDir) {
      doScan(p.data.path, true);
    }
  };

  const openInExplorer = async (path: string) => {
    const shell = await import("@tauri-apps/plugin-shell");
    shell.open(`file:///${path.replace(/\\/g, "/")}`);
  };

  const totalSize = useMemo(() => entries.reduce((sum, e) => sum + e.size, 0), [entries]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageTitle>Disk Analysis</PageTitle>

      <div className="space-y-2">
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumb.map((p, i) => {
            const parts = p.split("\\");
            const label = i === 0 ? parts[0] : parts[parts.length - 1];
            return (
              <span key={i} className="flex items-center gap-1 font-mono text-[10px]">
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>}
                <button
                  onClick={() => navigateTo(i)}
                  className="transition-colors duration-150"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  {label || p}
                </button>
              </span>
            );
          })}
        </div>
        <form onSubmit={handlePathSubmit} className="flex gap-2">
          <input
            type="text"
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.085)",
              color: "rgba(255,255,255,0.80)",
            }}
            placeholder="C:\Users\..."
          />
          <PrimaryButton onClick={() => handlePathSubmit({ preventDefault: () => {} } as React.FormEvent)} disabled={loading}>
            {loading ? "Scanning..." : "Scan"}
          </PrimaryButton>
        </form>
      </div>

      <GlassCard className="flex items-center gap-4 text-xs font-mono px-4 py-2">
        <span style={{ color: "rgba(255,255,255,0.40)" }}>{entries.length} items</span>
        <span style={{ color: "rgba(255,255,255,0.62)" }}>Total: {formatBytes(totalSize)}</span>
        {selectedPath && (
          <>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
            <span className="truncate" style={{ color: "rgba(255,255,255,0.62)" }}>
              {selectedPath}
            </span>
            <button
              onClick={() => openInExplorer(selectedPath)}
              className="transition-colors duration-150"
            >
              Open in Explorer
            </button>
          </>
        )}
      </GlassCard>

      {loading && entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.40)" }}>
          Scanning...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.25)" }}>
          No items found or access denied.
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            onEvents={{
              click: onChartClick,
              dblclick: onChartDblClick,
            }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      )}
    </div>
  );
}
