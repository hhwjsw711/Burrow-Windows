#![allow(dead_code)]

use chrono::{Duration, Utc};

use crate::db::Database;

pub fn prune_old_snapshots(db: &Database, retention_days: u32) -> rusqlite::Result<usize> {
    let cutoff = Utc::now() - Duration::days(retention_days as i64);
    db.prune_before(cutoff)
}

pub fn vacuum_if_needed(db: &Database) -> rusqlite::Result<()> {
    let cutoff = Utc::now() - Duration::days(1);
    let pruned = db.prune_before(cutoff)?;
    if pruned > 10000 {
        db.vacuum()?;
    }
    Ok(())
}
