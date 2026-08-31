use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Duration;
use tauri::State;
use uuid::Uuid;

// Default public client IDs for desktop app integrations
pub const DEFAULT_MICROSOFT_CLIENT_ID: &str = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"; // Azure CLI / Standard Public Multi-tenant Client ID
pub const DEFAULT_GOOGLE_CLIENT_ID: &str = "907094034444-j4s968lcv4q89u5l5q2s8sodg402tqub.apps.googleusercontent.com";

#[derive(Debug, Serialize, Deserialize)]
pub struct StartOAuthInput {
    pub provider: String, // "microsoft" | "google"
    pub custom_client_id: Option<String>,
    pub custom_tenant_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub token_type: Option<String>,
    pub expires_in: Option<u64>,
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
    pub id_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MicrosoftUserProfile {
    pub id: Option<String>,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "mail")]
    pub mail: Option<String>,
    #[serde(rename = "userPrincipalName")]
    pub user_principal_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleUserProfile {
    pub id: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthLoginResult {
    pub success: bool,
    pub account_id: String,
    pub name: String,
    pub email: String,
    pub provider: String,
    pub message: String,
}

#[tauri::command]
pub async fn start_oauth_login(
    db: State<'_, DbState>,
    input: StartOAuthInput,
) -> Result<OAuthLoginResult, String> {
    let provider = input.provider.to_lowercase();
    let port = 8989;
    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

    // 1. Bind local callback listener
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("No se pudo iniciar el receptor local en puerto {}: {}", port, e))?;
    listener
        .set_nonblocking(false)
        .map_err(|e| e.to_string())?;

    let client_id = if provider == "microsoft" || provider == "microsoft_graph" {
        input
            .custom_client_id
            .as_deref()
            .unwrap_or(DEFAULT_MICROSOFT_CLIENT_ID)
            .to_string()
    } else {
        input
            .custom_client_id
            .as_deref()
            .unwrap_or(DEFAULT_GOOGLE_CLIENT_ID)
            .to_string()
    };

    let tenant = input
        .custom_tenant_id
        .as_deref()
        .unwrap_or("common")
        .to_string();

    // 2. Build Authorization URL
    let auth_url = if provider == "microsoft" || provider == "microsoft_graph" {
        let scope = urlencoding::encode("offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read");

        format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/authorize?client_id={}&response_type=code&redirect_uri={}&response_mode=query&scope={}&state=workdesk_oauth",
            tenant,
            urlencoding::encode(&client_id),
            urlencoding::encode(&redirect_uri),
            scope
        )
    } else {
        let scope = urlencoding::encode("openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send");

        format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&response_type=code&redirect_uri={}&scope={}&access_type=offline&prompt=consent&state=workdesk_oauth",
            urlencoding::encode(&client_id),
            urlencoding::encode(&redirect_uri),
            scope
        )
    };

    // 3. Open browser for official login
    let _ = open::that(&auth_url);

    // 4. Accept single callback request with timeout
    let mut code = String::new();
    let mut stream = listener
        .incoming()
        .next()
        .ok_or_else(|| "No se recibió respuesta del navegador".to_string())?
        .map_err(|e| format!("Error en conexión entrante: {}", e))?;

    stream
        .set_read_timeout(Some(Duration::from_secs(120)))
        .map_err(|e| e.to_string())?;

    let mut buffer = [0; 2048];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|e| format!("Error al leer callback: {}", e))?;
    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

    // Parse ?code=...
    if let Some(query_idx) = request_str.find("GET /callback?") {
        let after_query = &request_str[query_idx + 14..];
        if let Some(end_idx) = after_query.find(' ') {
            let query = &after_query[..end_idx];
            for param in query.split('&') {
                if let Some((k, v)) = param.split_once('=') {
                    if k == "code" {
                        code = v.to_string();
                        break;
                    }
                }
            }
        }
    }

    // Return HTML to user in browser
    let response_body = if !code.is_empty() {
        "<!DOCTYPE html><html><body style='font-family:sans-serif;background:#0b0f19;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'><div style='text-align:center;padding:2rem;background:#111827;border-radius:14px;border:1px solid #1f293d;max-width:440px;'><h1 style='color:#3b82f6;margin-bottom:0.5rem;'>¡Conexión Exitosa!</h1><p style='color:#94a3b8;line-height:1.5;'>Tu cuenta de correo ha sido vinculada correctamente a WorkDesk. Puedes cerrar esta ventana y regresar a la aplicación.</p></div><script>setTimeout(function(){window.close();}, 2500);</script></body></html>"
    } else {
        "<!DOCTYPE html><html><body style='font-family:sans-serif;background:#0b0f19;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'><div style='text-align:center;padding:2rem;background:#111827;border-radius:14px;border:1px solid #ef4444;max-width:440px;'><h1 style='color:#ef4444;'>No se pudo completar el acceso</h1><p style='color:#94a3b8;'>No se recibió el código de autorización requerido.</p></div></body></html>"
    };

    let http_response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        response_body.len(),
        response_body
    );
    let _ = stream.write_all(http_response.as_bytes());
    let _ = stream.flush();

    if code.is_empty() {
        return Err("No se encontró el código de autorización en la respuesta de inicio de sesión".to_string());
    }

    let client = reqwest::Client::new();

    // 5. Exchange code for Access & Refresh Tokens and fetch user profile
    let (account_name, account_email, access_token, refresh_token, provider_key) =
        if provider == "microsoft" || provider == "microsoft_graph" {
            let token_url = format!("https://login.microsoftonline.com/{}/oauth2/v2.0/token", tenant);
            let params = [
                ("client_id", client_id.as_str()),
                ("grant_type", "authorization_code"),
                ("code", code.as_str()),
                ("redirect_uri", redirect_uri.as_str()),
                ("scope", "offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read"),
            ];

            let token_res = client
                .post(&token_url)
                .form(&params)
                .send()
                .await
                .map_err(|e| format!("Error solicitando tokens de Microsoft: {}", e))?;

            if !token_res.status().is_success() {
                let err_text = token_res.text().await.unwrap_or_default();
                return Err(format!("Error en respuesta de Microsoft OAuth: {}", err_text));
            }

            let token_data: OAuthTokenResponse = token_res
                .json()
                .await
                .map_err(|e| format!("Error decodificando tokens: {}", e))?;

            // Fetch user profile from Microsoft Graph
            let profile_res = client
                .get("https://graph.microsoft.com/v1.0/me")
                .bearer_auth(&token_data.access_token)
                .send()
                .await
                .map_err(|e| format!("Error obteniendo perfil de Microsoft Graph: {}", e))?;

            let profile: MicrosoftUserProfile = profile_res
                .json()
                .await
                .map_err(|e| format!("Error decodificando perfil de usuario: {}", e))?;

            let email = profile
                .mail
                .or(profile.user_principal_name)
                .unwrap_or_else(|| "usuario@outlook.com".to_string());
            let name = profile
                .display_name
                .unwrap_or_else(|| "Cuenta Microsoft 365".to_string());

            (
                name,
                email,
                token_data.access_token,
                token_data.refresh_token,
                "microsoft_graph".to_string(),
            )
        } else {
            let token_url = "https://oauth2.googleapis.com/token";
            let params = [
                ("client_id", client_id.as_str()),
                ("grant_type", "authorization_code"),
                ("code", code.as_str()),
                ("redirect_uri", redirect_uri.as_str()),
            ];

            let token_res = client
                .post(token_url)
                .form(&params)
                .send()
                .await
                .map_err(|e| format!("Error solicitando tokens de Google: {}", e))?;

            if !token_res.status().is_success() {
                let err_text = token_res.text().await.unwrap_or_default();
                return Err(format!("Error en respuesta de Google OAuth: {}", err_text));
            }

            let token_data: OAuthTokenResponse = token_res
                .json()
                .await
                .map_err(|e| format!("Error decodificando tokens de Google: {}", e))?;

            let profile_res = client
                .get("https://www.googleapis.com/oauth2/v2/userinfo")
                .bearer_auth(&token_data.access_token)
                .send()
                .await
                .map_err(|e| format!("Error obteniendo perfil de Google: {}", e))?;

            let profile: GoogleUserProfile = profile_res
                .json()
                .await
                .map_err(|e| format!("Error decodificando perfil de Google: {}", e))?;

            let email = profile
                .email
                .unwrap_or_else(|| "usuario@gmail.com".to_string());
            let name = profile
                .name
                .unwrap_or_else(|| "Cuenta Google Workspace".to_string());

            (
                name,
                email,
                token_data.access_token,
                token_data.refresh_token,
                "gmail_api".to_string(),
            )
        };

    // 6. Save or update email account in local SQLite
    let account_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;

        // Check if account already exists with this email
        let existing_id: Option<String> = conn
            .query_row(
                "SELECT id FROM email_accounts WHERE email = ?1",
                [&account_email],
                |row| row.get(0),
            )
            .ok();

        if let Some(id) = existing_id {
            conn.execute(
                "UPDATE email_accounts
                 SET name = ?1, provider = ?2, oauth_access_token = ?3, oauth_refresh_token = ?4, is_default = 1, last_synced_at = ?5
                 WHERE id = ?6",
                params![
                    account_name,
                    provider_key,
                    access_token,
                    refresh_token,
                    now,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            // Set as default
            let _ = conn.execute("UPDATE email_accounts SET is_default = 0", []);

            conn.execute(
                "INSERT INTO email_accounts
                 (id, name, email, provider, oauth_access_token, oauth_refresh_token, is_default, created_at, last_synced_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)",
                params![
                    account_id,
                    account_name,
                    account_email,
                    provider_key,
                    access_token,
                    refresh_token,
                    now,
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(OAuthLoginResult {
        success: true,
        account_id,
        name: account_name,
        email: account_email.clone(),
        provider: provider_key,
        message: format!("Cuenta {} vinculada exitosamente con inicio de sesión oficial.", account_email),
    })
}
