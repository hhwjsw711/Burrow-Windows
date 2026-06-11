use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::Arc;

use crate::db::Database;
use crate::snapshot::MetricsSnapshot;

pub fn start(db: Arc<Database>) {
    let listener =
        TcpListener::bind("127.0.0.1:9277").expect("Failed to bind to 127.0.0.1:9277");
    eprintln!("burrow.query_server: listening on http://127.0.0.1:9277");

    std::thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let db = db.clone();
                    std::thread::spawn(move || {
                        let mut reader = BufReader::new(&mut stream);
                        let mut request_line = String::new();
                        if reader.read_line(&mut request_line).is_err() {
                            return;
                        }
                        let parts: Vec<&str> =
                            request_line.trim().split_whitespace().collect();
                        if parts.len() < 2 {
                            return;
                        }
                        let method = parts[0];
                        let path = parts[1];

                        if method != "GET" {
                            write_http_response(
                                &mut stream,
                                405,
                                r#"{"error":"Method not allowed"}"#,
                            );
                            return;
                        }

                        let (status, body) = handle_route(path, &db);
                        write_http_response(&mut stream, status, &body);
                    });
                }
                Err(e) => eprintln!("burrow.query_server: connection error: {e}"),
            }
        }
    });
}

fn handle_route(path: &str, db: &Database) -> (u16, String) {
    let route = path.split('?').next().unwrap_or(path);

    match route {
        "/snapshot" => handle_snapshot(db),
        "/history" => handle_history(path, db),
        "/info" => handle_info(db),
        _ => (
            404,
            format!(r#"{{"error":"Not found: {route}"}}"#),
        ),
    }
}

fn parse_query(path: &str) -> Vec<(&str, &str)> {
    path.split('?')
        .nth(1)
        .unwrap_or("")
        .split('&')
        .filter_map(|p| p.split_once('='))
        .collect()
}

fn handle_snapshot(db: &Database) -> (u16, String) {
    match db.latest_snapshot() {
        Ok(Some(snap)) => (
            200,
            serde_json::to_string(&snap).unwrap_or_default(),
        ),
        Ok(None) => (
            200,
            r#"{"error":"No snapshots available yet"}"#.into(),
        ),
        Err(e) => (
            500,
            serde_json::json!({ "error": e.to_string() }).to_string(),
        ),
    }
}

fn handle_history(path: &str, db: &Database) -> (u16, String) {
    let query = parse_query(path);
    let mut hours = 1u32;
    let mut stride = 0u32;

    for (k, v) in &query {
        match *k {
            "hours" => hours = v.parse().unwrap_or(1),
            "stride" => stride = v.parse().unwrap_or(0),
            _ => {}
        }
    }

    let end = chrono::Utc::now();
    let start = end - chrono::Duration::hours(hours as i64);

    match db.snapshots_range(start, end) {
        Ok(snaps) => {
            let filtered: Vec<&MetricsSnapshot> = if stride > 0 {
                snaps
                    .iter()
                    .step_by((stride / 30).max(1) as usize)
                    .collect()
            } else {
                snaps.iter().collect()
            };
            (
                200,
                serde_json::to_string(&filtered).unwrap_or_default(),
            )
        }
        Err(e) => (
            500,
            serde_json::json!({ "error": e.to_string() }).to_string(),
        ),
    }
}

fn handle_info(db: &Database) -> (u16, String) {
    let info = match db.latest_snapshot() {
        Ok(Some(snap)) => serde_json::json!({
            "hostname": snap.hostname,
            "os_version": snap.os_version,
            "uptime_seconds": snap.uptime_seconds,
            "health_score": snap.health_score,
            "cpu_cores": snap.cpu_cores,
            "memory_used_bytes": snap.memory_used_bytes,
            "memory_total_bytes": snap.memory_total_bytes,
            "disk_used_bytes": snap.disk_used_bytes,
            "disk_total_bytes": snap.disk_total_bytes,
        }),
        _ => serde_json::json!({
            "hostname": sysinfo::System::host_name().unwrap_or_default(),
            "os_version": format!(
                "{} {}",
                sysinfo::System::name().unwrap_or_default(),
                sysinfo::System::kernel_version().unwrap_or_default()
            ),
            "uptime_seconds": sysinfo::System::uptime(),
        }),
    };
    (200, info.to_string())
}

fn write_http_response(stream: &mut std::net::TcpStream, status: u16, body: &str) {
    let status_text = match status {
        200 => "OK",
        404 => "Not Found",
        405 => "Method Not Allowed",
        500 => "Internal Server Error",
        _ => "Unknown",
    };
    let response = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        status_text,
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}
