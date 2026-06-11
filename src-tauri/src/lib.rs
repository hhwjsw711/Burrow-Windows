mod sampler;
mod db;
mod snapshot;
mod commander;
pub mod mcp;
mod query_server;
mod disk_scanner;
mod treemap;
mod maintenance;
mod tray;

use std::sync::{atomic::AtomicBool, Arc, Mutex};

use tauri::Manager;

pub use sampler::{Sampler, SamplerInfo};
use db::{ActivityRecord, Database};
use snapshot::{MetricsSnapshot, ProcessInfo};

pub struct AppState {
    pub db: Arc<Database>,
    pub db_path: String,
    pub sampler_running: Arc<AtomicBool>,
    pub sampler_handle: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub retention_days: u32,
    pub sampling_interval_secs: u64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Burrow-Windows is running.", name)
}

#[tauri::command]
async fn get_latest_snapshot(
    state: tauri::State<'_, AppState>,
) -> Result<Option<MetricsSnapshot>, String> {
    state.db.latest_snapshot().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_snapshot_history(
    state: tauri::State<'_, AppState>,
    hours: u32,
    stride_secs: u32,
) -> Result<Vec<MetricsSnapshot>, String> {
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::hours(hours as i64);
    let snaps = state
        .db
        .snapshots_range(start, end)
        .map_err(|e| e.to_string())?;

    if stride_secs > 0 && !snaps.is_empty() {
        let stride = chrono::Duration::seconds(stride_secs as i64);
        let mut downsampled: Vec<MetricsSnapshot> = Vec::new();
        let mut next_tick = snaps[0].collected_at + stride;
        let mut bucket: Vec<&MetricsSnapshot> = Vec::new();

        for snap in &snaps {
            if snap.collected_at >= next_tick {
                if !bucket.is_empty() {
                    downsampled.push(bucket[bucket.len() / 2].clone());
                    bucket.clear();
                }
                next_tick = snap.collected_at + stride;
            }
            bucket.push(snap);
        }
        if !bucket.is_empty() {
            downsampled.push(bucket[bucket.len() / 2].clone());
        }
        return Ok(downsampled);
    }

    Ok(snaps)
}

#[tauri::command]
async fn get_top_processes(
    state: tauri::State<'_, AppState>,
    hours: u32,
) -> Result<Vec<ProcessInfo>, String> {
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::hours(hours as i64);
    let snaps = state
        .db
        .snapshots_range(start, end)
        .map_err(|e| e.to_string())?;

    let mut aggregated: std::collections::HashMap<u32, (String, f64, u64)> =
        std::collections::HashMap::new();
    let mut count = 0u64;

    for snap in &snaps {
        count += 1;
        for proc in &snap.top_processes {
            let entry = aggregated
                .entry(proc.pid)
                .or_insert_with(|| (proc.name.clone(), 0.0, 0));
            entry.1 += proc.cpu_percent;
            entry.2 = proc.memory_bytes;
        }
    }

    let mut result: Vec<ProcessInfo> = aggregated
        .into_iter()
        .map(|(pid, (name, cpu_total, memory_bytes))| ProcessInfo {
            pid,
            name,
            cpu_percent: if count > 0 {
                cpu_total / count as f64
            } else {
                0.0
            },
            memory_bytes,
        })
        .collect();

    result.sort_by(|a, b| {
        b.cpu_percent
            .partial_cmp(&a.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    result.truncate(10);

    Ok(result)
}

#[tauri::command]
async fn get_sampler_info(
    state: tauri::State<'_, AppState>,
) -> Result<SamplerInfo, String> {
    let total_snapshots = state.db.count().map_err(|e| e.to_string())?;
    let db_size_bytes = std::fs::metadata(&state.db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(SamplerInfo {
        is_running: state
            .sampler_running
            .load(std::sync::atomic::Ordering::SeqCst),
        last_collected_at: None,
        total_snapshots,
        db_size_bytes,
        retention_days: state.retention_days,
        sampling_interval_secs: state.sampling_interval_secs,
    })
}

#[tauri::command]
async fn run_clean(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    dry_run: bool,
) -> Result<commander::ScanResult, String> {
    let result =
        commander::run_scan(app, "clean", "clean.ps1", &[], dry_run).await?;
    let status = if result.exit_code == 0 {
        "completed"
    } else {
        "failed"
    };
    let _ = state.db.insert_activity(
        "clean", dry_run, status, &result.summary, result.exit_code,
    );
    Ok(result)
}

#[tauri::command]
async fn run_purge(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    dry_run: bool,
) -> Result<commander::ScanResult, String> {
    let result =
        commander::run_scan(app, "purge", "purge.ps1", &[], dry_run).await?;
    let status = if result.exit_code == 0 {
        "completed"
    } else {
        "failed"
    };
    let _ = state.db.insert_activity(
        "purge", dry_run, status, &result.summary, result.exit_code,
    );
    Ok(result)
}

#[tauri::command]
async fn run_optimize(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    dry_run: bool,
) -> Result<commander::ScanResult, String> {
    let result = commander::run_scan(app, "optimize", "optimize.ps1", &[], dry_run)
        .await?;
    let status = if result.exit_code == 0 {
        "completed"
    } else {
        "failed"
    };
    let _ = state.db.insert_activity(
        "optimize",
        dry_run,
        status,
        &result.summary,
        result.exit_code,
    );
    Ok(result)
}

#[tauri::command]
async fn list_software(
    app: tauri::AppHandle,
) -> Result<commander::ScanResult, String> {
    commander::run_scan(app, "software", "uninstall.ps1", &["--list"], false).await
}

#[tauri::command]
async fn scan_directory(
    path: String,
    max_depth: usize,
) -> Result<Vec<disk_scanner::DirEntry>, String> {
    let root = std::path::Path::new(&path);
    disk_scanner::scan_directory(root, max_depth)
}

#[tauri::command]
async fn get_activities(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ActivityRecord>, String> {
    state.db.list_activities(50).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sampling_interval_secs: u64 = 30;
    let retention_days: u32 = 90;

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let db_dir = format!("{}\\Burrow", local_app_data);
    let db_path = format!("{}\\burrow.db", db_dir);

    let db = Database::open(std::path::Path::new(&db_path)).expect("failed to open database");
    db.init().expect("failed to initialize database");

    let sampler_running = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            db: Arc::new(db),
            db_path: db_path.clone(),
            sampler_running: sampler_running.clone(),
            sampler_handle: Mutex::new(None),
            retention_days,
            sampling_interval_secs,
        })
        .setup(move |app| {
            let state = app.state::<AppState>();
            let sampler = Sampler::new(
                state.db.clone(),
                app.handle().clone(),
                sampling_interval_secs,
                retention_days,
            );
            let handle = sampler.start(sampler_running);
            *state.sampler_handle.lock().unwrap() = Some(handle);

            let tray_state = tray::create_tray(app.handle())?;
            app.manage(tray_state);

            let db_for_server = state.db.clone();
            query_server::start(db_for_server);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_latest_snapshot,
            get_snapshot_history,
            get_top_processes,
            get_sampler_info,
            run_clean,
            run_purge,
            run_optimize,
            list_software,
            scan_directory,
            get_activities
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
