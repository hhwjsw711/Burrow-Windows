use std::io::{BufRead, Write};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::db::Database;
use crate::snapshot::MetricsSnapshot;

#[derive(Deserialize)]
#[allow(dead_code)]
struct Request {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Option<Value>,
}

#[derive(Serialize)]
struct Response {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

#[derive(Serialize)]
struct ServerInfo {
    name: String,
    version: String,
}

#[derive(Serialize)]
#[allow(non_snake_case)]
struct InitializeResult {
    protocolVersion: String,
    capabilities: Value,
    serverInfo: ServerInfo,
}

#[derive(Serialize)]
struct ToolDef {
    name: String,
    description: String,
    #[serde(rename = "inputSchema")]
    input_schema: Value,
}

pub fn run() {
    eprintln!("burrow.mcp: starting stdio MCP server");

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = format!("{}\\Burrow\\burrow.db", local_app_data);
    let db = match Database::open(std::path::Path::new(&db_path)) {
        Ok(db) => {
            let _ = db.init();
            Arc::new(db)
        }
        Err(e) => {
            eprintln!("burrow.mcp: failed to open database: {e}");
            std::process::exit(1);
        }
    };

    let stdin = std::io::stdin();
    let mut reader = stdin.lock();
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => {}
            Err(e) => {
                eprintln!("burrow.mcp: read error: {e}");
                break;
            }
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let request: Request = match serde_json::from_str(trimmed) {
            Ok(r) => r,
            Err(e) => {
                let resp = jsonrpc_error(None, -32700, &format!("Parse error: {e}"));
                write_response(&resp);
                continue;
            }
        };

        let response = match request.method.as_str() {
            "initialize" => handle_initialize(request.id),
            "notifications/initialized" => continue,
            "ping" => handle_ping(request.id),
            "tools/list" => handle_tools_list(request.id),
            "tools/call" => handle_tools_call(request.id, request.params, &db),
            _ => jsonrpc_error(
                request.id,
                -32601,
                &format!("Method not found: {}", request.method),
            ),
        };
        write_response(&response);
    }
}

fn write_response(resp: &Response) {
    if let Ok(json) = serde_json::to_string(resp) {
        let stdout = std::io::stdout();
        let mut handle = stdout.lock();
        let _ = writeln!(handle, "{json}");
        let _ = handle.flush();
    }
}

fn jsonrpc_result(id: Option<Value>, result: Value) -> Response {
    Response {
        jsonrpc: "2.0".into(),
        id,
        result: Some(result),
        error: None,
    }
}

fn jsonrpc_error(id: Option<Value>, code: i32, message: &str) -> Response {
    Response {
        jsonrpc: "2.0".into(),
        id,
        result: None,
        error: Some(JsonRpcError {
            code,
            message: message.to_string(),
        }),
    }
}

fn handle_initialize(id: Option<Value>) -> Response {
    let result = serde_json::to_value(InitializeResult {
        protocolVersion: "2024-11-05".into(),
        capabilities: serde_json::json!({ "tools": {} }),
        serverInfo: ServerInfo {
            name: "Burrow-Windows".into(),
            version: "0.1.0".into(),
        },
    })
    .unwrap_or(Value::Null);
    jsonrpc_result(id, result)
}

fn handle_ping(id: Option<Value>) -> Response {
    jsonrpc_result(id, serde_json::json!({}))
}

fn handle_tools_list(id: Option<Value>) -> Response {
    let tools: Vec<ToolDef> = vec![
        ToolDef {
            name: "burrow_snapshot".into(),
            description: "Get the current system health snapshot with CPU, memory, disk, network, and top processes.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolDef {
            name: "burrow_history".into(),
            description: "Get historical system metrics over a time range (CPU, memory, disk I/O, network I/O).".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "hours": { "type": "integer", "description": "Number of hours to look back", "default": 1 }
                }
            }),
        },
        ToolDef {
            name: "burrow_top_processes".into(),
            description: "Get top CPU-consuming processes over a time range, with average CPU and peak memory.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "hours": { "type": "integer", "description": "Number of hours to look back", "default": 1 }
                }
            }),
        },
        ToolDef {
            name: "burrow_info".into(),
            description: "Get system information: hostname, OS version, uptime, and disk usage.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {}
            }),
        },
    ];
    jsonrpc_result(id, serde_json::json!({ "tools": tools }))
}

fn handle_tools_call(
    id: Option<Value>,
    params: Option<Value>,
    db: &Database,
) -> Response {
    let params = match params {
        Some(p) => p,
        None => return jsonrpc_error(id, -32602, "Missing params"),
    };
    let tool_name = params["name"].as_str().unwrap_or("");
    let args = params.get("arguments").cloned().unwrap_or(Value::Null);

    match tool_name {
        "burrow_snapshot" => call_burrow_snapshot(id, db),
        "burrow_history" => call_burrow_history(id, &args, db),
        "burrow_top_processes" => call_burrow_top_processes(id, &args, db),
        "burrow_info" => call_burrow_info(id, db),
        _ => jsonrpc_error(id, -32601, &format!("Unknown tool: {tool_name}")),
    }
}

fn call_burrow_snapshot(id: Option<Value>, db: &Database) -> Response {
    match db.latest_snapshot() {
        Ok(Some(snap)) => {
            let content =
                serde_json::to_string_pretty(&snap).unwrap_or_default();
            jsonrpc_result(
                id,
                serde_json::json!({
                    "content": [{ "type": "text", "text": content }]
                }),
            )
        }
        Ok(None) => jsonrpc_result(
            id,
            serde_json::json!({
                "content": [{ "type": "text", "text": "No snapshots available yet. Wait for the sampler to collect data." }]
            }),
        ),
        Err(e) => jsonrpc_result(
            id,
            serde_json::json!({
                "content": [{ "type": "text", "text": format!("Error fetching snapshot: {e}") }]
            }),
        ),
    }
}

fn call_burrow_history(
    id: Option<Value>,
    args: &Value,
    db: &Database,
) -> Response {
    let hours = args.get("hours").and_then(|v| v.as_u64()).unwrap_or(1) as u32;
    let stride = if hours <= 6 {
        0
    } else if hours <= 24 {
        300
    } else {
        3600
    };
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::hours(hours as i64);

    match db.snapshots_range(start, end) {
        Ok(snaps) => {
            let data: Vec<&MetricsSnapshot> = if stride > 0 {
                snaps
                    .iter()
                    .step_by((stride / 30).max(1) as usize)
                    .collect()
            } else {
                snaps.iter().collect()
            };
            let summary = serde_json::json!({
                "count": data.len(),
                "range_hours": hours,
                "samples": data,
            });
            jsonrpc_result(
                id,
                serde_json::json!({
                    "content": [{ "type": "text", "text": serde_json::to_string_pretty(&summary).unwrap_or_default() }]
                }),
            )
        }
        Err(e) => jsonrpc_result(
            id,
            serde_json::json!({
                "content": [{ "type": "text", "text": format!("Error: {e}") }]
            }),
        ),
    }
}

fn call_burrow_top_processes(
    id: Option<Value>,
    args: &Value,
    db: &Database,
) -> Response {
    let hours = args.get("hours").and_then(|v| v.as_u64()).unwrap_or(1) as u32;
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::hours(hours as i64);

    let snaps = match db.snapshots_range(start, end) {
        Ok(s) => s,
        Err(e) => {
            return jsonrpc_result(
                id,
                serde_json::json!({
                    "content": [{ "type": "text", "text": format!("Error: {e}") }]
                }),
            );
        }
    };

    use std::collections::HashMap;
    let mut aggregated: HashMap<u32, (String, f64, u64)> = HashMap::new();
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

    let mut result: Vec<Value> = aggregated
        .into_iter()
        .map(|(pid, (name, cpu_total, memory_bytes))| {
            serde_json::json!({
                "pid": pid,
                "name": name,
                "avg_cpu_percent": if count > 0 { cpu_total / count as f64 } else { 0.0 },
                "memory_bytes": memory_bytes,
            })
        })
        .collect();

    result.sort_by(|a, b| {
        b["avg_cpu_percent"]
            .as_f64()
            .unwrap_or(0.0)
            .partial_cmp(&a["avg_cpu_percent"].as_f64().unwrap_or(0.0))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    result.truncate(10);

    jsonrpc_result(
        id,
        serde_json::json!({
            "content": [{ "type": "text", "text": serde_json::to_string_pretty(&result).unwrap_or_default() }]
        }),
    )
}

fn call_burrow_info(id: Option<Value>, db: &Database) -> Response {
    let info = match db.latest_snapshot() {
        Ok(Some(snap)) => serde_json::json!({
            "hostname": snap.hostname,
            "os_version": snap.os_version,
            "uptime_seconds": snap.uptime_seconds,
            "memory_total_bytes": snap.memory_total_bytes,
            "memory_used_bytes": snap.memory_used_bytes,
            "disk_total_bytes": snap.disk_total_bytes,
            "disk_used_bytes": snap.disk_used_bytes,
            "cpu_cores": snap.cpu_cores,
            "health_score": snap.health_score,
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

    jsonrpc_result(
        id,
        serde_json::json!({
            "content": [{ "type": "text", "text": serde_json::to_string_pretty(&info).unwrap_or_default() }]
        }),
    )
}
