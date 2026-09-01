pub mod db;
pub mod commands;

use tauri::Manager;

/// Called from the frontend to check + install an available update.
/// Returns { available: bool, version?: string, notes?: string }
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Updater build error: {e}"))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let notes   = update.body.clone().unwrap_or_default();
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| format!("Install error: {e}"))?;
            Ok(serde_json::json!({
                "available": true,
                "version": version,
                "notes": notes,
            }))
        }
        Ok(None) => Ok(serde_json::json!({ "available": false })),
        Err(e)   => Err(format!("Update check failed: {e}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let db_state = db::init_db(&app.handle())
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_for_updates,
            // Clients
            commands::clients::get_clients,
            commands::clients::create_client,
            commands::clients::update_client,
            commands::clients::delete_client,
            commands::clients::delete_all_clients,
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
            // Window & Mini HUD
            commands::window::toggle_mini_widget,
            commands::window::hide_to_tray,
            commands::window::show_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
