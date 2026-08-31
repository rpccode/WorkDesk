use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;
use crate::db::DbState;
use crate::commands::cases::Case;
use crate::commands::commitments::Commitment;

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub active_cases_count: i64,
    pub critical_cases_count: i64,
    pub pending_commitments_count: i64,
    pub overdue_commitments_count: i64,
    pub waiting_on_others_count: i64,
    pub urgent_commitments: Vec<Commitment>,
    pub critical_cases: Vec<Case>,
}

#[tauri::command]
pub fn get_dashboard_summary(state: State<'_, DbState>) -> Result<DashboardSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let active_cases_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cases WHERE status != 'closed'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let critical_cases_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cases WHERE status != 'closed' AND priority = 'critical'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let pending_commitments_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM commitments WHERE status != 'done' AND owner = 'me'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let overdue_commitments_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM commitments WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?1",
            [&today],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let waiting_on_others_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM commitments WHERE status != 'done' AND owner != 'me'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    // Urgent commitments (due today or overdue or next 3 days)
    let mut stmt = conn
        .prepare(
            "SELECT cm.id, cm.case_id, cs.title, cl.name, cm.description, cm.owner, cm.due_date, cm.status, cm.created_at, cm.done_at
             FROM commitments cm
             LEFT JOIN cases cs ON cm.case_id = cs.id
             LEFT JOIN clients cl ON cs.client_id = cl.id
             WHERE cm.status != 'done'
             ORDER BY 
                CASE WHEN cm.due_date IS NULL THEN 1 ELSE 0 END,
                cm.due_date ASC,
                cm.created_at DESC
             LIMIT 6",
        )
        .map_err(|e| e.to_string())?;

    let urgent_commitments = stmt
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

    // Critical/High active cases
    let mut case_stmt = conn
        .prepare(
            "SELECT c.id, c.client_id, cl.name, c.title, c.description, c.status, c.priority, c.created_at, c.updated_at, c.closed_at
             FROM cases c
             LEFT JOIN clients cl ON c.client_id = cl.id
             WHERE c.status != 'closed'
             ORDER BY 
                CASE c.priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                c.updated_at DESC,
                c.created_at DESC
             LIMIT 6",
        )
        .map_err(|e| e.to_string())?;

    let critical_cases = case_stmt
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

    Ok(DashboardSummary {
        active_cases_count,
        critical_cases_count,
        pending_commitments_count,
        overdue_commitments_count,
        waiting_on_others_count,
        urgent_commitments,
        critical_cases,
    })
}
