import { invoke } from "@tauri-apps/api/core";

export interface MetricsSnapshot {
  collected_at: string;
  health_score: number;
  health_message: string;
  cpu_usage_percent: number;
  cpu_cores: number;
  cpu_per_core: number[];
  memory_used_bytes: number;
  memory_total_bytes: number;
  memory_used_percent: number;
  swap_used_bytes: number;
  swap_total_bytes: number;
  gpu_name: string | null;
  gpu_usage_percent: number | null;
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_read_bytes_per_sec: number;
  disk_write_bytes_per_sec: number;
  network_down_bytes_per_sec: number;
  network_up_bytes_per_sec: number;
  battery_percent: number | null;
  battery_health: number | null;
  power_plugged: boolean;
  hostname: string;
  os_version: string;
  uptime_seconds: number;
  top_processes: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
}

export interface SamplerInfo {
  is_running: boolean;
  last_collected_at: string | null;
  total_snapshots: number;
  db_size_bytes: number;
  retention_days: number;
  sampling_interval_secs: number;
}

export async function getLatestSnapshot(): Promise<MetricsSnapshot | null> {
  return invoke<MetricsSnapshot | null>("get_latest_snapshot");
}

export async function getSnapshotHistory(
  hours: number,
  strideSecs: number,
): Promise<MetricsSnapshot[]> {
  return invoke<MetricsSnapshot[]>("get_snapshot_history", {
    hours,
    strideSecs,
  });
}

export async function getTopProcesses(hours: number): Promise<ProcessInfo[]> {
  return invoke<ProcessInfo[]>("get_top_processes", { hours });
}

export async function getSamplerInfo(): Promise<SamplerInfo> {
  return invoke<SamplerInfo>("get_sampler_info");
}

export interface DirEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: DirEntry[];
}

export interface TreemapNode {
  name: string;
  value: number;
  path: string;
  isDir: boolean;
  children?: TreemapNode[];
}

export async function scanDirectory(
  path: string,
  maxDepth: number = 2,
): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("scan_directory", { path, maxDepth });
}

export interface ActivityRecord {
  id: number;
  created_at: string;
  command: string;
  dry_run: boolean;
  status: string;
  summary: string;
  exit_code: number;
}

export async function getActivities(): Promise<ActivityRecord[]> {
  return invoke<ActivityRecord[]>("get_activities");
}
