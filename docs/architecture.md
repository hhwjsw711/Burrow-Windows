# Burrow-Windows Architecture Plan

## Tech Stack
- **Backend**: Rust (Tauri v2) — 系统调用、进程管理、SQLite、MCP Server
- **Frontend**: React + TypeScript + ECharts — 仪表盘、图表、UI
- **Build**: `pnpm` + `cargo` + Tauri CLI
- **Engine**: 复用 Mole-Windows 的 PowerShell 清理脚本（clean/uninstall/optimize/purge）

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │          React Frontend (TypeScript)          │
                    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
                    │  │Status│ │Clean │ │Analyze│ │History│  ...  │
                    │  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘      │
                    │     │        │        │        │           │
                    │     └────────┴────────┴────────┘           │
                    │              │ invoke / event                │
                    └──────────────┼──────────────────────────────┘
                                   │
              ════════════════════════════════════════
              ║   Tauri IPC / Command Bridge         ║
              ════════════════════════════════════════
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                    Rust Backend                              │
    │                                                              │
    │  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
    │  │ Sampler  │   │  Storage │   │ Commander│                │
    │  │ (sysinfo)│──>│ (SQLite) │   │ (ps1/go) │                │
    │  └──────────┘   └────┬─────┘   └────┬─────┘                │
    │                      │              │                        │
    │              ┌───────┴───────┐      │                        │
    │              │  QueryServer  │      │                        │
    │              │  (:9277 HTTP) │      │                        │
    │              └───────────────┘      │                        │
    │                      │              │                        │
    │              ┌───────┴───────┐      │                        │
    │              │  MCP Server   │      │                        │
    │              │  (stdio RPC)  │      │                        │
    │              └───────────────┘      │                        │
    └────────────────────────────────────┼────────────────────────┘
                                         │
                           Mole-Windows Engine
                           ├─ bin/clean.ps1
                           ├─ bin/uninstall.ps1
                           ├─ bin/optimize.ps1
                           └─ bin/purge.ps1
```

## Module Map

### 1. Sampler → SQLite Pipeline

| 模块 | Burrow (Swift) | Burrow-Windows (Rust) |
|---|---|---|
| 指标采集 | `MoleStatus.swift` 解析 `mo status --json` | `sysinfo` crate 直接采集（不依赖外部进程） |
| 采样调度 | `Sampler.swift` Timer 驱动 | `tokio::interval` 定时采集 |
| 存储 | `DB.swift` SQLite WAL | `rusqlite` + WAL 模式 |
| 快照结构 | `SnapshotStore.swift` | 同构 Rust struct |
| 剪枝 | `Maintenance.swift` prune | 同逻辑实现 |

### 2. 命令行/引擎集成

| 功能 | Burrow (macOS) | Burrow-Windows |
|---|---|---|
| Clean | `mo clean --json` | `powershell -File clean.ps1` 流式解析 |
| Uninstall | `mo uninstall --list` | `powershell -File uninstall.ps1` |
| Optimize | `mo optimize` | `powershell -File optimize.ps1` |
| Purge | `mo purge` | `powershell -File purge.ps1` |
| Analyze | `mo analyze --json` | Rust 原生目录扫描（不依赖外部） |

### 3. GUI Pages (React)

| Page | Burrow (SwiftUI) | Burrow-Windows (React) |
|---|---|---|
| Status | `StatusView.swift` — CPU/内存/磁盘/网络/电池 | ECharts 仪表盘 + 折线图 |
| Clean | `CleanView.swift` — 分类清理 | React 表单 + 流式进度 |
| Purge | 同上 | 同上 |
| Installers | `InstallerView.swift` | 可延后（Windows 无 .dmg/.pkg） |
| Optimize | `OptimizeView.swift` | React 步骤列表 |
| Software | `SoftwareView.swift` | React 列表（调用 uninstall.ps1） |
| Analyze | `AnalyzeView.swift` — Treemap | ECharts Treemap（Rust 提供 squarified 布局数据） |
| History | `HistoryView.swift` — 时间范围图表 | ECharts 时间序列 + 进程排名 |
| Activity | `ActivityView.swift` | React 实时日志流 |
| Settings | `SettingsView.swift` | React 表单 |

### 4. AI 集成

| 组件 | Burrow | Burrow-Windows |
|---|---|---|
| MCP Server | `MCP.swift` stdio JSON-RPC | Rust 实现，同协议 |
| HTTP Query | `QueryServer.swift` (:9277) | `axum` 或 `actix-web` |
| MCP Tools | burrow_snapshot / burrow_history / burrow_top_processes / burrow_process_usage / burrow_info | 完全相同 tool 签名 |

### 5. System Tray (替代 macOS Menu Bar)

| 能力 | Burrow (NSStatusBar) | Burrow-Windows (Tauri tray) |
|---|---|---|
| 图标 + 健康分 | `StatusBarController.swift` | Tauri `tray-icon` |
| 指标小窗 | `HUDController.swift` | Tray menu + 独立 React 弹窗 |
| 打开主窗口 | 点击图标 | 点击图标 |

## 数据流

```
sysinfo::System::refresh_all()
        │
        ▼
  MetricsSnapshot (Rust struct)
        │
        ├──> rusqlite INSERT (WAL mode)
        │         │
        │         ├──> Tauri event → React Status/History
        │         ├──> HTTP QueryServer GET /snapshot
        │         └──> MCP burrow_snapshot / burrow_history
        │
        └──> Tauri event → React Status (real-time spark)
```

## 目录结构

```
Burrow-Windows/
├── src-tauri/                 # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs           # Entry: GUI/MCP fork
│   │   ├── sampler.rs        # Periodic metric collection
│   │   ├── db.rs             # SQLite schema + queries
│   │   ├── snapshot.rs       # MetricsSnapshot struct
│   │   ├── commander.rs      # PowerShell process management
│   │   ├── mcp.rs            # stdio MCP server
│   │   ├── query_server.rs   # HTTP API (:9277)
│   │   ├── disk_scanner.rs   # Directory analysis
│   │   ├── treemap.rs        # Squarified layout algorithm
│   │   ├── maintenance.rs    # Prune / vacuum
│   │   └── tray.rs           # System tray management
├── src/                       # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Status.tsx
│   │   ├── Clean.tsx
│   │   ├── Purge.tsx
│   │   ├── Optimize.tsx
│   │   ├── Software.tsx
│   │   ├── Analyze.tsx
│   │   ├── History.tsx
│   │   ├── Activity.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── TopNav.tsx
│   │   ├── MetricCard.tsx
│   │   ├── SparkLine.tsx
│   │   ├── Treemap.tsx
│   │   ├── ProcessTable.tsx
│   │   ├── ProgressBar.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useMetrics.ts
│   │   ├── useHistory.ts
│   │   └── useScanner.ts
│   └── lib/
│       ├── tauri.ts
│       └── api.ts
├── engine/                    # Mole-Windows scripts (git submodule or vendored)
│   └── ... (clean.ps1, uninstall.ps1, etc.)
├── tests/                     # Pester + Rust tests
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Implementation Order

| Phase | 模块 | 预估 |
|---|---|---|
| **Phase 1** | 项目脚手架 (Tauri + React + Vite) | 1d |
| **Phase 2** | Sampler + SQLite 存储 + 基础 Snapshot | 2d |
| **Phase 3** | Status 页面 (ECharts 仪表盘) | 2d |
| **Phase 4** | Trace (System Tray) | 1d |
| **Phase 5** | Commander + Clean 页面 (流式进度) | 2d |
| **Phase 6** | Purge / Optimize / Software 页面 | 2d |
| **Phase 7** | DiskScanner + Treemap + Analyze 页面 | 2d |
| **Phase 8** | History 页面 (时间范围图表) | 2d |
| **Phase 9** | Activity 页面 | 1d |
| **Phase 10** | Settings 页面 | 1d |
| **Phase 11** | MCP Server (stdio) | 1.5d |
| **Phase 12** | HTTP QueryServer | 0.5d |
| **Phase 13** | 测试 + 打包 | 2d |

**总计预估：~20d**（单人全职）
