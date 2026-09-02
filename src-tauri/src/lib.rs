pub mod db;
pub mod commands;

use tauri::Manager;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

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

            // Configure System Tray Icon & Context Menu
            let show_item = MenuItem::with_id(app, "show_app", "Abrir WorkDesk", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit_app", "Cerrar WorkDesk Completamente", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &sep, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("WorkDesk — Centro de Operaciones")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show_app" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit_app" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent window from closing, hide it to tray instead so background services remain active
                api.prevent_close();
                let _ = window.hide();
            }
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
            commands::emails::save_case_email,
            commands::emails::sync_inbox_emails,
            // OAuth
            commands::oauth::start_oauth_login,
            // Window & Mini HUD
            commands::window::toggle_mini_widget,
            commands::window::hide_to_tray,
            commands::window::show_main_window,
            commands::window::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
