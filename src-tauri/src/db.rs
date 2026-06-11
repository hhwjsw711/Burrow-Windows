use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;

use crate::snapshot::{MetricsSnapshot, ProcessInfo};

pub struct Database {
    conn: Mutex<Connection>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivityRecord {
    pub id: i64,
    pub created_at: String,
    pub command: String,
    pub dry_run: bool,
    pub status: String,
    pub summary: String,
    pub exit_code: i32,
}

impl Database {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        }
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn init(&self) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collected_at TEXT NOT NULL,
                health_score INTEGER NOT NULL,
                health_message TEXT NOT NULL,
                cpu_usage_percent REAL NOT NULL,
                cpu_cores INTEGER NOT NULL,
                cpu_per_core TEXT NOT NULL,
                memory_used_bytes INTEGER NOT NULL,
                memory_total_bytes INTEGER NOT NULL,
                memory_used_percent REAL NOT NULL,
                swap_used_bytes INTEGER NOT NULL,
                swap_total_bytes INTEGER NOT NULL,
                gpu_name TEXT,
                gpu_usage_percent REAL,
                disk_total_bytes INTEGER NOT NULL,
                disk_used_bytes INTEGER NOT NULL,
                disk_read_bytes_per_sec INTEGER NOT NULL,
                disk_write_bytes_per_sec INTEGER NOT NULL,
                network_down_bytes_per_sec INTEGER NOT NULL,
                network_up_bytes_per_sec INTEGER NOT NULL,
                battery_percent REAL,
                battery_health REAL,
                power_plugged INTEGER NOT NULL,
                hostname TEXT NOT NULL,
                os_version TEXT NOT NULL,
                uptime_seconds INTEGER NOT NULL,
                top_processes TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_snapshots_collected_at ON snapshots(collected_at);
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                command TEXT NOT NULL,
                dry_run INTEGER NOT NULL,
                status TEXT NOT NULL,
                summary TEXT NOT NULL,
                exit_code INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);",
        )?;
        Ok(())
    }

    fn row_to_snapshot(row: &rusqlite::Row) -> rusqlite::Result<MetricsSnapshot> {
        let collected_at_str: String = row.get(1)?;
        let collected_at = DateTime::parse_from_rfc3339(&collected_at_str)
            .map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?
            .with_timezone(&Utc);

        let health_score: i64 = row.get(2)?;
        let health_message: String = row.get(3)?;
        let cpu_usage_percent: f64 = row.get(4)?;
        let cpu_cores: i64 = row.get(5)?;
        let cpu_per_core_str: String = row.get(6)?;
        let cpu_per_core: Vec<f64> = serde_json::from_str(&cpu_per_core_str).map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(6, rusqlite::types::Type::Text, Box::new(e))
        })?;

        let memory_used_bytes: i64 = row.get(7)?;
        let memory_total_bytes: i64 = row.get(8)?;
        let memory_used_percent: f64 = row.get(9)?;
        let swap_used_bytes: i64 = row.get(10)?;
        let swap_total_bytes: i64 = row.get(11)?;

        let gpu_name: Option<String> = row.get(12)?;
        let gpu_usage_percent: Option<f64> = row.get(13)?;

        let disk_total_bytes: i64 = row.get(14)?;
        let disk_used_bytes: i64 = row.get(15)?;
        let disk_read_bytes_per_sec: i64 = row.get(16)?;
        let disk_write_bytes_per_sec: i64 = row.get(17)?;

        let network_down_bytes_per_sec: i64 = row.get(18)?;
        let network_up_bytes_per_sec: i64 = row.get(19)?;

        let battery_percent: Option<f64> = row.get(20)?;
        let battery_health: Option<f64> = row.get(21)?;
        let power_plugged_int: i64 = row.get(22)?;

        let hostname: String = row.get(23)?;
        let os_version: String = row.get(24)?;
        let uptime_seconds: i64 = row.get(25)?;

        let top_processes_str: String = row.get(26)?;
        let top_processes: Vec<ProcessInfo> =
            serde_json::from_str(&top_processes_str).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    26,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?;

        Ok(MetricsSnapshot {
            collected_at,
            health_score: health_score as u8,
            health_message,
            cpu_usage_percent,
            cpu_cores: cpu_cores as usize,
            cpu_per_core,
            memory_used_bytes: memory_used_bytes as u64,
            memory_total_bytes: memory_total_bytes as u64,
            memory_used_percent,
            swap_used_bytes: swap_used_bytes as u64,
            swap_total_bytes: swap_total_bytes as u64,
            gpu_name,
            gpu_usage_percent,
            disk_total_bytes: disk_total_bytes as u64,
            disk_used_bytes: disk_used_bytes as u64,
            disk_read_bytes_per_sec: disk_read_bytes_per_sec as u64,
            disk_write_bytes_per_sec: disk_write_bytes_per_sec as u64,
            network_down_bytes_per_sec: network_down_bytes_per_sec as u64,
            network_up_bytes_per_sec: network_up_bytes_per_sec as u64,
            battery_percent,
            battery_health,
            power_plugged: power_plugged_int != 0,
            hostname,
            os_version,
            uptime_seconds: uptime_seconds as u64,
            top_processes,
        })
    }

    pub fn insert_snapshot(&self, snap: &MetricsSnapshot) -> rusqlite::Result<i64> {
        let cpu_per_core_json = serde_json::to_string(&snap.cpu_per_core)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let top_processes_json = serde_json::to_string(&snap.top_processes)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO snapshots (collected_at, health_score, health_message, cpu_usage_percent, cpu_cores, cpu_per_core, memory_used_bytes, memory_total_bytes, memory_used_percent, swap_used_bytes, swap_total_bytes, gpu_name, gpu_usage_percent, disk_total_bytes, disk_used_bytes, disk_read_bytes_per_sec, disk_write_bytes_per_sec, network_down_bytes_per_sec, network_up_bytes_per_sec, battery_percent, battery_health, power_plugged, hostname, os_version, uptime_seconds, top_processes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)",
            params![
                snap.collected_at.to_rfc3339(),
                snap.health_score as i64,
                &snap.health_message,
                snap.cpu_usage_percent,
                snap.cpu_cores as i64,
                cpu_per_core_json,
                snap.memory_used_bytes as i64,
                snap.memory_total_bytes as i64,
                snap.memory_used_percent,
                snap.swap_used_bytes as i64,
                snap.swap_total_bytes as i64,
                &snap.gpu_name,
                snap.gpu_usage_percent,
                snap.disk_total_bytes as i64,
                snap.disk_used_bytes as i64,
                snap.disk_read_bytes_per_sec as i64,
                snap.disk_write_bytes_per_sec as i64,
                snap.network_down_bytes_per_sec as i64,
                snap.network_up_bytes_per_sec as i64,
                snap.battery_percent,
                snap.battery_health,
                snap.power_plugged as i64,
                &snap.hostname,
                &snap.os_version,
                snap.uptime_seconds as i64,
                top_processes_json,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn latest_snapshot(&self) -> rusqlite::Result<Option<MetricsSnapshot>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM snapshots ORDER BY collected_at DESC LIMIT 1",
        )?;
        let mut rows = stmt.query_map([], Self::row_to_snapshot)?;
        match rows.next() {
            Some(Ok(snap)) => Ok(Some(snap)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    pub fn snapshots_range(
        &self,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> rusqlite::Result<Vec<MetricsSnapshot>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM snapshots WHERE collected_at >= ?1 AND collected_at <= ?2 ORDER BY collected_at ASC",
        )?;
        let rows = stmt.query_map(
            params![start.to_rfc3339(), end.to_rfc3339()],
            Self::row_to_snapshot,
        )?;
        rows.collect()
    }

    pub fn prune_before(&self, cutoff: DateTime<Utc>) -> rusqlite::Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute(
            "DELETE FROM snapshots WHERE collected_at < ?1",
            params![cutoff.to_rfc3339()],
        )?;
        Ok(count)
    }

    pub fn vacuum(&self) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("VACUUM;")?;
        Ok(())
    }

    pub fn count(&self) -> rusqlite::Result<u64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM snapshots", [], |row| {
            row.get(0)
        })?;
        Ok(count as u64)
    }

    pub fn insert_activity(
        &self,
        command: &str,
        dry_run: bool,
        status: &str,
        summary: &str,
        exit_code: i32,
    ) -> rusqlite::Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO activities (created_at, command, dry_run, status, summary, exit_code)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                Utc::now().to_rfc3339(),
                command,
                dry_run as i64,
                status,
                summary,
                exit_code,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list_activities(&self, limit: u32) -> rusqlite::Result<Vec<ActivityRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, created_at, command, dry_run, status, summary, exit_code
             FROM activities ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            let dry_run_int: i64 = row.get(3)?;
            Ok(ActivityRecord {
                id: row.get(0)?,
                created_at: row.get(1)?,
                command: row.get(2)?,
                dry_run: dry_run_int != 0,
                status: row.get(4)?,
                summary: row.get(5)?,
                exit_code: row.get(6)?,
            })
        })?;
        rows.collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db() -> Database {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let path = std::env::temp_dir()
            .join(format!("burrow_test_{}_{}.db", std::process::id(), id));
        let _ = std::fs::remove_file(&path);
        let db = Database::open(&path).expect("open");
        db.init().expect("init");
        db
    }

    fn test_snapshot() -> MetricsSnapshot {
        MetricsSnapshot {
            collected_at: chrono::Utc::now(),
            health_score: 85,
            health_message: "Healthy".into(),
            cpu_usage_percent: 25.0,
            cpu_cores: 8,
            cpu_per_core: vec![25.0, 25.0],
            memory_used_bytes: 8_589_934_592,
            memory_total_bytes: 17_179_869_184,
            memory_used_percent: 50.0,
            swap_used_bytes: 0,
            swap_total_bytes: 0,
            gpu_name: None,
            gpu_usage_percent: None,
            disk_total_bytes: 500_000_000_000,
            disk_used_bytes: 250_000_000_000,
            disk_read_bytes_per_sec: 1024,
            disk_write_bytes_per_sec: 2048,
            network_down_bytes_per_sec: 512,
            network_up_bytes_per_sec: 256,
            battery_percent: None,
            battery_health: None,
            power_plugged: true,
            hostname: "test-pc".into(),
            os_version: "Windows 11".into(),
            uptime_seconds: 3600,
            top_processes: vec![],
        }
    }

    #[test]
    fn test_insert_and_retrieve_snapshot() {
        let db = temp_db();
        let snap = test_snapshot();
        let id = db.insert_snapshot(&snap).expect("insert");
        assert!(id > 0);

        let latest = db.latest_snapshot().expect("latest");
        assert!(latest.is_some());
        let retrieved = latest.unwrap();
        assert_eq!(retrieved.health_score, 85);
    }

    #[test]
    fn test_snapshots_range() {
        let db = temp_db();
        let snap = test_snapshot();
        db.insert_snapshot(&snap).unwrap();

        let end = chrono::Utc::now();
        let start = end - chrono::Duration::hours(1);
        let results = db.snapshots_range(start, end).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_activity_insert_and_list() {
        let db = temp_db();
        let id = db
            .insert_activity("clean", true, "completed", "Freed 0 B", 0)
            .unwrap();
        assert!(id > 0);

        let list = db.list_activities(10).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].command, "clean");
        assert!(list[0].dry_run);
    }
}
