pub mod db;
pub mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_state = db::init_db(&app.handle())
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Clients
            commands::clients::get_clients,
            commands::clients::create_client,
            commands::clients::update_client,
            // Cases
            commands::cases::get_cases,
            commands::cases::create_case,
            commands::cases::update_case,
            commands::cases::close_case,
            // Commitments
            commands::commitments::get_commitments,
            commands::commitments::create_commitment,
            commands::commitments::mark_commitment_done,
            commands::commitments::snooze_commitment,
            // Followups
            commands::followups::get_followups,
            commands::followups::create_followup,
            // Notes
            commands::notes::get_notes,
            commands::notes::create_note,
            commands::notes::delete_note,
            // Dashboard
            commands::dashboard::get_dashboard_summary,
            // Emails
            commands::emails::get_email_accounts,
            commands::emails::save_email_account,
            commands::emails::delete_email_account,
            commands::emails::test_email_connection,
            commands::emails::send_email_direct,
            commands::emails::get_case_emails,
            commands::emails::sync_inbox_emails,
            // OAuth
            commands::oauth::start_oauth_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
