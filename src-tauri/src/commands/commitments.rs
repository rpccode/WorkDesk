use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Commitment {
    pub id: String,
    pub case_id: String,
    pub case_title: Option<String>,
    pub client_name: Option<String>,
    pub description: String,
    pub owner: String, // 'me', 'client', 'third_party'
    pub due_date: Option<String>,
    pub status: String, // 'pending', 'done', 'overdue', 'snoozed'
    pub created_at: String,
    pub done_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommitmentInput {
    pub case_id: String,
    pub description: String,
    pub owner: Option<String>,
    pub due_date: Option<String>,
}

#[tauri::command]
pub fn get_commitments(
    state: State<'_, DbState>,
    case_id: Option<String>,
    status_filter: Option<String>,
) -> Result<Vec<Commitment>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT cm.id, cm.case_id, cs.title, cl.name, cm.description, cm.owner, cm.due_date, cm.status, cm.created_at, cm.done_at
         FROM commitments cm
         LEFT JOIN cases cs ON cm.case_id = cs.id
         LEFT JOIN clients cl ON cs.client_id = cl.id
         WHERE 1=1 "
    );

    if let Some(ref cid) = case_id {
        sql.push_str(&format!(" AND cm.case_id = '{}' ", cid.replace('\'', "''")));
    }

    if let Some(ref st) = status_filter {
        if st == "pending" {
            sql.push_str(" AND cm.status != 'done' ");
        } else if st == "done" {
            sql.push_str(" AND cm.status = 'done' ");
        } else if st == "waiting" {
            sql.push_str(" AND cm.owner != 'me' AND cm.status != 'done' ");
        }
    }

    sql.push_str(" ORDER BY cm.due_date ASC, cm.created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let items = stmt
        .query_map([], |row| {
            Ok(Commitment {
                id: row.get(0)?,
                case_id: row.get(1)?,
                case_title: row.get(2)?,
                client_name: row.get(3)?,
                description: row.get(4)?,
                owner: row.get(5)?,
                due_date: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                done_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_commitment(
    state: State<'_, DbState>,
    input: CreateCommitmentInput,
) -> Result<Commitment, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Check case exists
    let case_exists: i64 = conn
        .query_row("SELECT COUNT(*) FROM cases WHERE id = ?1", [&input.case_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if case_exists == 0 {
        return Err("El caso especificado no existe.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let owner = input.owner.unwrap_or_else(|| "me".to_string());

    conn.execute(
        "INSERT INTO commitments (id, case_id, description, owner, due_date, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
        rusqlite::params![id, input.case_id, input.description, owner, input.due_date, now],
    ).map_err(|e| e.to_string())?;

    // Fetch case and client info
    let (case_title, client_name): (Option<String>, Option<String>) = conn
        .query_row(
            "SELECT cs.title, cl.name FROM cases cs LEFT JOIN clients cl ON cs.client_id = cl.id WHERE cs.id = ?1",
            [&input.case_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((None, None));

    Ok(Commitment {
        id,
        case_id: input.case_id,
        case_title,
        client_name,
        description: input.description,
        owner,
        due_date: input.due_date,
        status: "pending".to_string(),
        created_at: now,
        done_at: None,
    })
}

#[tauri::command]
pub fn mark_commitment_done(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE commitments SET status = 'done', done_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Compromiso no encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn snooze_commitment(
    state: State<'_, DbState>,
    id: String,
    new_due_date: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let rows = conn.execute(
        "UPDATE commitments SET due_date = ?1, status = 'pending' WHERE id = ?2",
        rusqlite::params![new_due_date, id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Compromiso no encontrado.".to_string());
    }

    Ok(())
}
