use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub case_id: Option<String>,
    pub case_title: Option<String>,
    pub client_name: Option<String>,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteInput {
    pub case_id: Option<String>,
    pub content: String,
}

#[tauri::command]
pub fn get_notes(state: State<'_, DbState>, case_id: Option<String>) -> Result<Vec<Note>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let sql = if let Some(cid) = case_id {
        format!(
            "SELECT n.id, n.case_id, cs.title, cl.name, n.content, n.created_at
             FROM notes n
             LEFT JOIN cases cs ON n.case_id = cs.id
             LEFT JOIN clients cl ON cs.client_id = cl.id
             WHERE n.case_id = '{}'
             ORDER BY n.created_at DESC",
            cid.replace('\'', "''")
        )
    } else {
        "SELECT n.id, n.case_id, cs.title, cl.name, n.content, n.created_at
         FROM notes n
         LEFT JOIN cases cs ON n.case_id = cs.id
         LEFT JOIN clients cl ON cs.client_id = cl.id
         ORDER BY n.created_at DESC"
            .to_string()
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let items = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                case_id: row.get(1)?,
                case_title: row.get(2)?,
                client_name: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_note(state: State<'_, DbState>, input: CreateNoteInput) -> Result<Note, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO notes (id, case_id, content, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, input.case_id, input.content, now],
    ).map_err(|e| e.to_string())?;

    let (case_title, client_name): (Option<String>, Option<String>) = if let Some(ref cid) = input.case_id {
        conn.query_row(
            "SELECT cs.title, cl.name FROM cases cs LEFT JOIN clients cl ON cs.client_id = cl.id WHERE cs.id = ?1",
            [cid],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap_or((None, None))
    } else {
        (None, None)
    };

    Ok(Note {
        id,
        case_id: input.case_id,
        case_title,
        client_name,
        content: input.content,
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_note(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
