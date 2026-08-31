use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Case {
    pub id: String,
    pub client_id: String,
    pub client_name: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub closed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaseInput {
    pub client_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
}

#[tauri::command]
pub fn get_cases(state: State<'_, DbState>, status_filter: Option<String>) -> Result<Vec<Case>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let sql = match status_filter.as_deref() {
        Some("active") => {
            "SELECT c.id, c.client_id, cl.name, c.title, c.description, c.status, c.priority, c.created_at, c.updated_at, c.closed_at
             FROM cases c
             LEFT JOIN clients cl ON c.client_id = cl.id
             WHERE c.status != 'closed'
             ORDER BY c.created_at DESC"
        }
        Some("closed") => {
            "SELECT c.id, c.client_id, cl.name, c.title, c.description, c.status, c.priority, c.created_at, c.updated_at, c.closed_at
             FROM cases c
             LEFT JOIN clients cl ON c.client_id = cl.id
             WHERE c.status = 'closed'
             ORDER BY c.closed_at DESC"
        }
        _ => {
            "SELECT c.id, c.client_id, cl.name, c.title, c.description, c.status, c.priority, c.created_at, c.updated_at, c.closed_at
             FROM cases c
             LEFT JOIN clients cl ON c.client_id = cl.id
             ORDER BY c.created_at DESC"
        }
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let cases = stmt
        .query_map([], |row| {
            Ok(Case {
                id: row.get(0)?,
                client_id: row.get(1)?,
                client_name: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                closed_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cases)
}

#[tauri::command]
pub fn create_case(state: State<'_, DbState>, input: CreateCaseInput) -> Result<Case, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // Check if client exists
    let client_exists: i64 = conn
        .query_row("SELECT COUNT(*) FROM clients WHERE id = ?1", [&input.client_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if client_exists == 0 {
        return Err("El cliente especificado no existe.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let priority = input.priority.unwrap_or_else(|| "medium".to_string());

    conn.execute(
        "INSERT INTO cases (id, client_id, title, description, status, priority, created_at)
         VALUES (?1, ?2, ?3, ?4, 'open', ?5, ?6)",
        rusqlite::params![id, input.client_id, input.title, input.description, priority, now],
    ).map_err(|e| e.to_string())?;

    let client_name: Option<String> = conn
        .query_row("SELECT name FROM clients WHERE id = ?1", [&input.client_id], |r| r.get(0))
        .ok();

    Ok(Case {
        id,
        client_id: input.client_id,
        client_name,
        title: input.title,
        description: input.description,
        status: "open".to_string(),
        priority,
        created_at: now,
        updated_at: None,
        closed_at: None,
    })
}

#[tauri::command]
pub fn update_case(state: State<'_, DbState>, input: UpdateCaseInput) -> Result<Case, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE cases SET title = ?1, description = ?2, status = ?3, priority = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![input.title, input.description, input.status, input.priority, now, input.id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Caso no encontrado.".to_string());
    }

    // Return refreshed case
    let mut stmt = conn.prepare(
        "SELECT c.id, c.client_id, cl.name, c.title, c.description, c.status, c.priority, c.created_at, c.updated_at, c.closed_at
         FROM cases c
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE c.id = ?1"
    ).map_err(|e| e.to_string())?;

    let updated = stmt.query_row([&input.id], |row| {
        Ok(Case {
            id: row.get(0)?,
            client_id: row.get(1)?,
            client_name: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            status: row.get(5)?,
            priority: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            closed_at: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn close_case(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE cases SET status = 'closed', closed_at = ?1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Caso no encontrado.".to_string());
    }

    Ok(())
}
