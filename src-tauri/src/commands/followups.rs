use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Followup {
    pub id: String,
    pub case_id: String,
    pub r#type: String, // 'meeting', 'call', 'email', 'note'
    pub summary: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateFollowupInput {
    pub case_id: String,
    pub r#type: Option<String>,
    pub summary: String,
    pub date: Option<String>,
}

#[tauri::command]
pub fn get_followups(state: State<'_, DbState>, case_id: String) -> Result<Vec<Followup>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, case_id, type, summary, date, created_at
             FROM followups
             WHERE case_id = ?1
             ORDER BY date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([case_id], |row| {
            Ok(Followup {
                id: row.get(0)?,
                case_id: row.get(1)?,
                r#type: row.get(2)?,
                summary: row.get(3)?,
                date: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_followup(
    state: State<'_, DbState>,
    input: CreateFollowupInput,
) -> Result<Followup, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let ftype = input.r#type.unwrap_or_else(|| "note".to_string());
    let date = input.date.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    conn.execute(
        "INSERT INTO followups (id, case_id, type, summary, date, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, input.case_id, ftype, input.summary, date, now],
    ).map_err(|e| e.to_string())?;

    Ok(Followup {
        id,
        case_id: input.case_id,
        r#type: ftype,
        summary: input.summary,
        date,
        created_at: now,
    })
}
