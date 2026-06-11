use serde::Serialize;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children: Vec<DirEntry>,
}

pub fn scan_directory(root: &Path, max_depth: usize) -> Result<Vec<DirEntry>, String> {
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", root.display()));
    }

    let mut entries: Vec<DirEntry> = Vec::new();
    let read_dir = std::fs::read_dir(root)
        .map_err(|e| format!("Cannot read {}: {}", root.display(), e))?;

    for entry in read_dir {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = path.is_dir();
        let size = if is_dir {
            dir_size_recursive(&path, max_depth)
        } else {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        };
        entries.push(DirEntry {
            name,
            path: path.to_string_lossy().to_string(),
            size,
            is_dir,
            children: Vec::new(),
        });
    }

    entries.sort_by(|a, b| b.size.cmp(&a.size));
    Ok(entries)
}

fn dir_size_recursive(root: &Path, max_depth: usize) -> u64 {
    if max_depth == 0 {
        return 0;
    }
    let walker = WalkDir::new(root)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok());

    walker
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

#[allow(dead_code)]
pub fn dir_total_size(root: &Path) -> u64 {
    WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}
