use std::process::Stdio;

use serde::Serialize;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

#[derive(Debug, Clone, Serialize)]
pub struct ScanProgress {
    pub command: String,
    pub line: String,
    pub is_done: bool,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub command: String,
    pub output: Vec<String>,
    pub exit_code: i32,
    pub summary: String,
}

pub fn engine_dir() -> String {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new("."));

    // 1. 打包/捆绑模式：exe 同级目录的 engine/
    let candidate = exe_dir.join("engine");
    if candidate.exists() {
        return candidate.to_string_lossy().to_string();
    }

    // 2. 开发模式：从 target/debug 向上查找项目根
    let project_root = exe_dir
        .ancestors()
        .find(|a| a.join("engine").exists())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| exe_dir.to_path_buf());

    project_root.join("engine").to_string_lossy().to_string()
}

pub async fn run_scan(
    app: tauri::AppHandle,
    command: &str,
    script: &str,
    args: &[&str],
    dry_run: bool,
) -> Result<ScanResult, String> {
    let engine = engine_dir();
    let script_path = format!("{}/{}", engine, script);

    let mut cmd_args: Vec<String> = vec![
        "-NoProfile".into(),
        "-ExecutionPolicy".into(),
        "Bypass".into(),
        "-File".into(),
        script_path.clone(),
    ];

    if dry_run {
        cmd_args.push("--dry-run".into());
    }

    cmd_args.push("--non-interactive".into());

    for arg in args {
        cmd_args.push(arg.to_string());
    }

    let mut child = TokioCommand::new("powershell.exe")
        .args(&cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn powershell: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    let mut reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let mut output_lines: Vec<String> = Vec::new();
    let mut summary = String::new();

    let app_clone = app.clone();
    let cmd_name = command.to_string();

    loop {
        tokio::select! {
            line_result = reader.next_line() => {
                match line_result {
                    Ok(Some(line)) => {
                        output_lines.push(line.clone());

                        let lower = line.to_lowercase();
                        if lower.contains("space freed") || lower.contains("freed") {
                            summary = line.clone();
                        }

                        let _ = app_clone.emit("scan-progress", ScanProgress {
                            command: cmd_name.clone(),
                            line: line.clone(),
                            is_done: false,
                            summary: None,
                        });
                    }
                    Ok(None) => break,
                    Err(e) => {
                        eprintln!("commander stdout error: {e}");
                        break;
                    }
                }
            }
            err_line = stderr_reader.next_line() => {
                match err_line {
                    Ok(Some(line)) => {
                        let _ = app_clone.emit("scan-progress", ScanProgress {
                            command: cmd_name.clone(),
                            line: format!("[stderr] {line}"),
                            is_done: false,
                            summary: None,
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let exit_code = status.code().unwrap_or(-1);

    if summary.is_empty() && !output_lines.is_empty() {
        summary = output_lines.last().cloned().unwrap_or_default();
    }

    let result = ScanResult {
        command: command.to_string(),
        output: output_lines.clone(),
        exit_code,
        summary: summary.clone(),
    };

    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            command: command.to_string(),
            line: String::new(),
            is_done: true,
            summary: Some(summary),
        },
    );

    Ok(result)
}
