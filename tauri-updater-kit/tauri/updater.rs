use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

/// Información devuelta al frontend tras verificar actualizaciones
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UpdateCheckResult {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Comando Tauri para verificar e instalar actualizaciones automáticamente en segundo plano.
///
/// Flujo:
/// 1. Consulta el endpoint configurado en `tauri.conf.json` (ej: releases de GitHub).
/// 2. Si existe una versión más reciente, descarga e instala los paquetes en modo pasivo.
/// 3. Retorna un objeto JSON con `{ "available": true, "version": "...", "notes": "..." }`.
/// 4. Si no hay actualizaciones, retorna `{ "available": false }`.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Error al inicializar el updater de Tauri: {e}"))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let notes = update.body.clone().unwrap_or_default();

            // Descarga e instala en segundo plano.
            // Los closures (_, _) y () manejan el progreso de bytes y finalización respectivamente.
            update
                .download_and_install(|_chunk_length, _content_length| {}, || {})
                .await
                .map_err(|e| format!("Error durante la descarga o instalación: {e}"))?;

            Ok(serde_json::json!({
                "available": true,
                "version": version,
                "notes": notes,
            }))
        }
        Ok(None) => Ok(serde_json::json!({ "available": false })),
        Err(e) => Err(format!("Fallo al consultar actualizaciones: {e}")),
    }
}
