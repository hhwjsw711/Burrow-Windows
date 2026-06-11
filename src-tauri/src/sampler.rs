use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tauri::Emitter;

use crate::db::Database;
use crate::snapshot::MetricsSnapshot;

pub struct Sampler {
    db: Arc<Database>,
    app_handle: tauri::AppHandle,
    interval_secs: u64,
    retention_days: u32,
}

#[derive(serde::Serialize)]
pub struct SamplerInfo {
    pub is_running: bool,
    pub last_collected_at: Option<String>,
    pub total_snapshots: u64,
    pub db_size_bytes: u64,
    pub retention_days: u32,
    pub sampling_interval_secs: u64,
}

impl Sampler {
    pub fn new(
        db: Arc<Database>,
        app_handle: tauri::AppHandle,
        interval_secs: u64,
        retention_days: u32,
    ) -> Self {
        Sampler {
            db,
            app_handle,
            interval_secs,
            retention_days,
        }
    }

    pub fn interval_secs(&self) -> u64 {
        self.interval_secs
    }

    pub fn retention_days(&self) -> u32 {
        self.retention_days
    }

    pub fn start(&self, running: Arc<AtomicBool>) -> tauri::async_runtime::JoinHandle<()> {
        running.store(true, Ordering::SeqCst);
        let db = self.db.clone();
        let app_handle = self.app_handle.clone();
        let interval_secs = self.interval_secs;
        let retention_days = self.retention_days;

        tauri::async_runtime::spawn(async move {
            let mut sys = sysinfo::System::new_all();
            let mut disks = sysinfo::Disks::new_with_refreshed_list();
            let mut networks = sysinfo::Networks::new_with_refreshed_list();

            let mut prev_disk_read: u64 = 0;
            let mut prev_disk_write: u64 = 0;
            let mut prev_net_recv: u64 = 0;
            let mut prev_net_sent: u64 = 0;
            let mut first_run = true;

            loop {
                if !running.load(Ordering::SeqCst) {
                    break;
                }

                sys.refresh_all();
                disks.refresh_list();
                disks.refresh();
                networks.refresh_list();
                networks.refresh();

                let mut snap = MetricsSnapshot::new(&sys, &disks, &networks);

                let total_disk_read: u64 = sys
                    .processes()
                    .values()
                    .map(|p| p.disk_usage().total_read_bytes)
                    .sum();
                let total_disk_write: u64 = sys
                    .processes()
                    .values()
                    .map(|p| p.disk_usage().total_written_bytes)
                    .sum();
                let net_recv: u64 = networks
                    .list()
                    .values()
                    .map(|nd| nd.total_received())
                    .sum();
                let net_sent: u64 = networks
                    .list()
                    .values()
                    .map(|nd| nd.total_transmitted())
                    .sum();

                if first_run {
                    first_run = false;
                } else {
                    snap.disk_read_bytes_per_sec =
                        total_disk_read.saturating_sub(prev_disk_read) / interval_secs;
                    snap.disk_write_bytes_per_sec =
                        total_disk_write.saturating_sub(prev_disk_write) / interval_secs;
                    snap.network_down_bytes_per_sec =
                        net_recv.saturating_sub(prev_net_recv) / interval_secs;
                    snap.network_up_bytes_per_sec =
                        net_sent.saturating_sub(prev_net_sent) / interval_secs;
                }
                prev_disk_read = total_disk_read;
                prev_disk_write = total_disk_write;
                prev_net_recv = net_recv;
                prev_net_sent = net_sent;

                if let Err(e) = db.insert_snapshot(&snap) {
                    eprintln!("sampler: failed to insert snapshot: {e}");
                }

                let _ = app_handle.emit("snapshot-update", &snap);
                crate::tray::update_tray(&app_handle, &snap);

                let cutoff =
                    chrono::Utc::now() - chrono::Duration::days(retention_days as i64);
                if let Err(e) = db.prune_before(cutoff) {
                    eprintln!("sampler: failed to prune old snapshots: {e}");
                }

                tokio::time::sleep(tokio::time::Duration::from_secs(interval_secs)).await;
            }
        })
    }
}
