use serde::Serialize;

use crate::disk_scanner::DirEntry;

#[derive(Debug, Clone, Serialize)]
#[allow(dead_code)]
pub struct TreemapNode {
    pub name: String,
    pub value: u64,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreemapNode>>,
}

#[allow(dead_code)]
impl TreemapNode {
    pub fn from_entries(entries: &[DirEntry]) -> Vec<TreemapNode> {
        entries
            .iter()
            .map(|e| TreemapNode {
                name: format_name(&e.name, e.size),
                value: if e.size == 0 { 1 } else { e.size },
                path: e.path.clone(),
                is_dir: e.is_dir,
                children: None,
            })
            .collect()
    }
}

#[allow(dead_code)]
fn format_name(name: &str, size: u64) -> String {
    if size == 0 {
        return name.to_string();
    }
    let gb = size as f64 / (1024.0 * 1024.0 * 1024.0);
    let mb = size as f64 / (1024.0 * 1024.0);
    if gb >= 1.0 {
        format!("{}  ({:.1} GB)", name, gb)
    } else if mb >= 1.0 {
        format!("{}  ({:.1} MB)", name, mb)
    } else {
        format!("{}  ({} KB)", name, size / 1024)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_name_zero_size() {
        assert_eq!(format_name("test", 0), "test");
    }

    #[test]
    fn test_format_name_kb() {
        assert_eq!(format_name("medium", 1024), "medium  (1 KB)");
    }

    #[test]
    fn test_format_name_mb() {
        let size = 5 * 1024 * 1024;
        assert_eq!(format_name("big", size), "big  (5.0 MB)");
    }

    #[test]
    fn test_format_name_gb() {
        let size = (2.5f64 * 1024.0 * 1024.0 * 1024.0) as u64;
        assert_eq!(format_name("huge", size), "huge  (2.5 GB)");
    }

    #[test]
    fn test_treemap_node_value_guard() {
        let entry = DirEntry {
            name: "zero".into(),
            path: "".into(),
            size: 0,
            is_dir: true,
            children: vec![],
        };
        let nodes = TreemapNode::from_entries(&[entry]);
        assert_eq!(nodes[0].value, 1);
    }
}
