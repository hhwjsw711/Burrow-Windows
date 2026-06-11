import { useCallback, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { scanDirectory, type DirEntry, type TreemapNode } from "../lib/api";
import { formatBytes } from "../lib/format";

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

  const treemapData: TreemapNode[] = entries.map((e) => ({
    name: e.name,
    value: e.size || 1,
    path: e.path,
    isDir: e.is_dir,
  }));

  const option = {
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
        itemStyle: { borderColor: "#0a0a0f", borderWidth: 2 },
        levels: [
          {
            colorMappingBy: "value",
            color: [
              "#4a1a6b",
              "#5a2d7a",
              "#6b3fa0",
              "#7d52c6",
              "#8f64ec",
              "#a177f0",
              "#b38af4",
              "#c59df8",
            ],
          },
        ],
      },
    ],
  };

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

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Breadcrumb + Path Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-sm text-gray-400 flex-wrap">
          {breadcrumb.map((p, i) => {
            const parts = p.split("\\");
            const label = i === 0 ? parts[0] : parts[parts.length - 1];
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-600">/</span>}
                <button
                  onClick={() => navigateTo(i)}
                  className="hover:text-white transition-colors"
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
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 font-mono focus:outline-none focus:border-purple-500"
            placeholder="C:\Users\..."
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-40 transition-colors"
          >
            {loading ? "Scanning..." : "Scan"}
          </button>
        </form>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-900 rounded-lg px-4 py-2 border border-gray-800">
        <span>{entries.length} items</span>
        <span>Total: {formatBytes(totalSize)}</span>
        {selectedPath && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 truncate">{selectedPath}</span>
            <button
              onClick={() => openInExplorer(selectedPath)}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Open in Explorer
            </button>
          </>
        )}
      </div>

      {/* Treemap */}
      {loading && entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Scanning...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
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
