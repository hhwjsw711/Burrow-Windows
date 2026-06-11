use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub collected_at: DateTime<Utc>,
    pub health_score: u8,
    pub health_message: String,

    pub cpu_usage_percent: f64,
    pub cpu_cores: usize,
    pub cpu_per_core: Vec<f64>,

    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub memory_used_percent: f64,
    pub swap_used_bytes: u64,
    pub swap_total_bytes: u64,

    pub gpu_name: Option<String>,
    pub gpu_usage_percent: Option<f64>,

    pub disk_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_read_bytes_per_sec: u64,
    pub disk_write_bytes_per_sec: u64,

    pub network_down_bytes_per_sec: u64,
    pub network_up_bytes_per_sec: u64,

    pub battery_percent: Option<f64>,
    pub battery_health: Option<f64>,
    pub power_plugged: bool,

    pub hostname: String,
    pub os_version: String,
    pub uptime_seconds: u64,

    pub top_processes: Vec<ProcessInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f64,
    pub memory_bytes: u64,
}

impl MetricsSnapshot {
    pub fn new(
        sys: &sysinfo::System,
        disks: &sysinfo::Disks,
        _networks: &sysinfo::Networks,
    ) -> Self {
        let cpus = sys.cpus();
        let cpu_cores = cpus.len();
        let cpu_per_core: Vec<f64> = cpus.iter().map(|c| c.cpu_usage() as f64).collect();
        let cpu_usage_percent = if cpu_cores == 0 {
            0.0
        } else {
            cpu_per_core.iter().sum::<f64>() / cpu_cores as f64
        };

        let memory_total_bytes = sys.total_memory();
        let memory_used_bytes = sys.used_memory();
        let memory_used_percent = if memory_total_bytes > 0 {
            (memory_used_bytes as f64 / memory_total_bytes as f64) * 100.0
        } else {
            0.0
        };
        let swap_total_bytes = sys.total_swap();
        let swap_used_bytes = sys.used_swap();

        let disk_list = disks.list();
        let disk_total_bytes: u64 = disk_list.iter().map(|d| d.total_space()).sum();
        let disk_available: u64 = disk_list.iter().map(|d| d.available_space()).sum();
        let disk_used_bytes = disk_total_bytes.saturating_sub(disk_available);

        let hostname = sysinfo::System::host_name().unwrap_or_else(|| "unknown".to_string());
        let os_version = format!(
            "{} {}",
            sysinfo::System::name().unwrap_or_default(),
            sysinfo::System::kernel_version().unwrap_or_default()
        );
        let uptime_seconds = sysinfo::System::uptime();

        let mut processes: Vec<(&sysinfo::Pid, &sysinfo::Process)> =
            sys.processes().iter().collect();
        processes.sort_by(|a, b| {
            b.1.cpu_usage()
                .partial_cmp(&a.1.cpu_usage())
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        processes.truncate(10);
        let top_processes: Vec<ProcessInfo> = processes
            .into_iter()
            .map(|(pid, proc)| ProcessInfo {
                pid: pid.as_u32(),
                name: proc.name().to_string_lossy().to_string(),
                cpu_percent: proc.cpu_usage() as f64,
                memory_bytes: proc.memory(),
            })
            .collect();

        let disk_used_pct = if disk_total_bytes > 0 {
            (disk_used_bytes as f64 / disk_total_bytes as f64) * 100.0
        } else {
            0.0
        };
        let mut health_score = 100u8;
        health_score = health_score.saturating_sub(((cpu_usage_percent / 5.0) as u8).min(20));
        health_score = health_score.saturating_sub(((memory_used_percent / 5.0) as u8).min(20));
        health_score = health_score.saturating_sub(((disk_used_pct / 5.0) as u8).min(15));
        let health_message = if health_score >= 80 {
            "Healthy"
        } else if health_score >= 60 {
            "Moderate"
        } else if health_score >= 40 {
            "Under pressure"
        } else {
            "Critical"
        }
        .to_string();

        MetricsSnapshot {
            collected_at: Utc::now(),
            health_score,
            health_message,
            cpu_usage_percent,
            cpu_cores,
            cpu_per_core,
            memory_used_bytes,
            memory_total_bytes,
            memory_used_percent,
            swap_used_bytes,
            swap_total_bytes,
            gpu_name: None,
            gpu_usage_percent: None,
            disk_total_bytes,
            disk_used_bytes,
            disk_read_bytes_per_sec: 0,
            disk_write_bytes_per_sec: 0,
            network_down_bytes_per_sec: 0,
            network_up_bytes_per_sec: 0,
            battery_percent: None,
            battery_health: None,
            power_plugged: true,
            hostname,
            os_version,
            uptime_seconds,
            top_processes,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_score_in_range() {
        let sys = sysinfo::System::new_all();
        let disks = sysinfo::Disks::new_with_refreshed_list();
        let networks = sysinfo::Networks::new_with_refreshed_list();
        let snap = MetricsSnapshot::new(&sys, &disks, &networks);
        assert!(snap.health_score <= 100);
    }

    #[test]
    fn test_health_message_matches_score() {
        let sys = sysinfo::System::new_all();
        let disks = sysinfo::Disks::new_with_refreshed_list();
        let networks = sysinfo::Networks::new_with_refreshed_list();
        let snap = MetricsSnapshot::new(&sys, &disks, &networks);
        if snap.health_score >= 80 {
            assert_eq!(snap.health_message, "Healthy");
        } else if snap.health_score >= 60 {
            assert_eq!(snap.health_message, "Moderate");
        } else if snap.health_score >= 40 {
            assert_eq!(snap.health_message, "Under pressure");
        } else {
            assert_eq!(snap.health_message, "Critical");
        }
    }

    #[test]
    fn test_health_score_formula() {
        let sys = sysinfo::System::new_all();
        let disks = sysinfo::Disks::new_with_refreshed_list();
        let networks = sysinfo::Networks::new_with_refreshed_list();
        let snap = MetricsSnapshot::new(&sys, &disks, &networks);

        let disk_pct = if snap.disk_total_bytes > 0 {
            (snap.disk_used_bytes as f64 / snap.disk_total_bytes as f64) * 100.0
        } else {
            0.0
        };
        let expected = 100u8
            .saturating_sub(((snap.cpu_usage_percent / 5.0) as u8).min(20))
            .saturating_sub(((snap.memory_used_percent / 5.0) as u8).min(20))
            .saturating_sub(((disk_pct / 5.0) as u8).min(15));

        assert_eq!(snap.health_score, expected);
        assert!(!snap.top_processes.is_empty() || snap.cpu_cores > 0);
    }
}
