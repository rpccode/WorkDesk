use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Tauri path error: {0}")]
    Tauri(String),
}

pub struct DbState(pub Mutex<Connection>);

const MIGRATIONS: &[(&str, &str)] = &[
    ("001_initial", include_str!("migrations/001_initial.sql")),
];

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, DbError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DbError::Tauri(e.to_string()))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    Ok(app_dir.join("workdesk.db"))
}

pub fn init_db(app: &AppHandle) -> Result<DbState, DbError> {
    let db_path = get_db_path(app)?;
    let mut conn = Connection::open(&db_path)?;

    // PRAGMAs
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;

    // Migrations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT UNIQUE NOT NULL,
            applied_at TEXT NOT NULL
        );",
        [],
    )?;

    // Run pending migrations
    for (version, sql) in MIGRATIONS {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM _migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;

        if count == 0 {
            let tx = conn.transaction()?;
            tx.execute_batch(sql)?;
            tx.execute(
                "INSERT INTO _migrations (version, applied_at) VALUES (?1, datetime('now'))",
                [version],
            )?;
            tx.commit()?;
        }
    }

    Ok(DbState(Mutex::new(conn)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_in_memory() {
        let mut conn = Connection::open_in_memory().expect("open in memory db");
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;",
        ).expect("pragmas");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT UNIQUE NOT NULL,
                applied_at TEXT NOT NULL
            );",
            [],
        ).expect("migrations table");

        for (version, sql) in MIGRATIONS {
            let tx = conn.transaction().expect("tx");
            tx.execute_batch(sql).expect("execute migration");
            tx.execute(
                "INSERT INTO _migrations (version, applied_at) VALUES (?1, datetime('now'))",
                [version],
            ).expect("insert record");
            tx.commit().expect("commit");
        }

        // Verify tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(tables.contains(&"clients".to_string()));
        assert!(tables.contains(&"cases".to_string()));
        assert!(tables.contains(&"commitments".to_string()));
        assert!(tables.contains(&"followups".to_string()));
        assert!(tables.contains(&"notes".to_string()));
    }
}

