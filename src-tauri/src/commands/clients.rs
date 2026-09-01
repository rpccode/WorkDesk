use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub company: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientInput {
    pub name: String,
    pub company: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClientInput {
    pub id: String,
    pub name: String,
    pub company: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
}

#[tauri::command]
pub fn get_clients(state: State<'_, DbState>) -> Result<Vec<Client>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, company, email, phone, status, created_at, updated_at FROM clients ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let clients = stmt
        .query_map([], |row| {
            Ok(Client {
                id: row.get(0)?,
                name: row.get(1)?,
                company: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(clients)
}

#[tauri::command]
pub fn create_client(state: State<'_, DbState>, input: CreateClientInput) -> Result<Client, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO clients (id, name, company, email, phone, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)",
        rusqlite::params![id, input.name, input.company, input.email, input.phone, now],
    ).map_err(|e| e.to_string())?;

    Ok(Client {
        id,
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        status: "active".to_string(),
        created_at: now,
        updated_at: None,
    })
}

#[tauri::command]
pub fn update_client(state: State<'_, DbState>, input: UpdateClientInput) -> Result<Client, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows_affected = conn.execute(
        "UPDATE clients SET name = ?1, company = ?2, email = ?3, phone = ?4, status = ?5, updated_at = ?6 WHERE id = ?7",
        rusqlite::params![input.name, input.company, input.email, input.phone, input.status, now, input.id],
    ).map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err("Client not found".to_string());
    }

    Ok(Client {
        id: input.id,
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        status: input.status,
        created_at: "".to_string(), // will be refreshed by frontend or reload
        updated_at: Some(now),
    })
}

#[tauri::command]
pub fn delete_client(state: State<'_, DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM clients WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_all_clients(state: State<'_, DbState>) -> Result<usize, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let deleted = conn.execute("DELETE FROM clients", [])
        .map_err(|e| e.to_string())?;
    Ok(deleted)
}

