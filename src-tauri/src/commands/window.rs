use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn toggle_mini_widget(app: AppHandle, enable: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if enable {
            window.set_always_on_top(true).map_err(|e| e.to_string())?;
            window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 380.0, height: 260.0 }))
                .map_err(|e| e.to_string())?;
        } else {
            window.set_always_on_top(false).map_err(|e| e.to_string())?;
            window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 1280.0, height: 820.0 }))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.unminimize().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
