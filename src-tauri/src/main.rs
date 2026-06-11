#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && args[1] == "--mcp" {
        burrow_windows::mcp::run();
        return;
    }
    burrow_windows::run();
}
