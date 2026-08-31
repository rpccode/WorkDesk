use crate::db::DbState;
use chrono::Utc;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailAccount {
    pub id: String,
    pub name: String,
    pub email: String,
    pub provider: String,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub imap_host: Option<String>,
    pub imap_port: Option<u16>,
    pub imap_user: Option<String>,
    pub imap_password: Option<String>,
    pub oauth_access_token: Option<String>,
    pub oauth_refresh_token: Option<String>,
    pub is_default: bool,
    pub created_at: String,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveEmailAccountInput {
    pub id: Option<String>,
    pub name: String,
    pub email: String,
    pub provider: String,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub imap_host: Option<String>,
    pub imap_port: Option<u16>,
    pub imap_user: Option<String>,
    pub imap_password: Option<String>,
    pub oauth_access_token: Option<String>,
    pub oauth_refresh_token: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CaseEmail {
    pub id: String,
    pub case_id: String,
    pub account_id: Option<String>,
    pub direction: String, // "inbound" | "outbound"
    pub sender: String,
    pub recipient: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
    pub message_id: Option<String>,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendEmailInput {
    pub account_id: Option<String>,
    pub case_id: String,
    pub recipient: String,
    pub subject: String,
    pub body: String,
    pub auto_log_followup: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendEmailResponse {
    pub success: bool,
    pub email_id: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncEmailsResult {
    pub new_emails_count: u32,
    pub updated_cases_count: u32,
    pub message: String,
}

#[tauri::command]
pub fn get_email_accounts(db: State<'_, DbState>) -> Result<Vec<EmailAccount>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password,
                    imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token,
                    is_default, created_at, last_synced_at
             FROM email_accounts
             ORDER BY is_default DESC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let accounts = stmt
        .query_map([], |row| {
            Ok(EmailAccount {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                provider: row.get(3)?,
                smtp_host: row.get(4)?,
                smtp_port: row.get(5)?,
                smtp_user: row.get(6)?,
                smtp_password: row.get(7)?,
                imap_host: row.get(8)?,
                imap_port: row.get(9)?,
                imap_user: row.get(10)?,
                imap_password: row.get(11)?,
                oauth_access_token: row.get(12)?,
                oauth_refresh_token: row.get(13)?,
                is_default: row.get::<_, i64>(14)? == 1,
                created_at: row.get(15)?,
                last_synced_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(accounts)
}

#[tauri::command]
pub fn save_email_account(
    db: State<'_, DbState>,
    input: SaveEmailAccountInput,
) -> Result<EmailAccount, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let is_default = input.is_default.unwrap_or(false);

    if is_default {
        let _ = conn.execute("UPDATE email_accounts SET is_default = 0", []);
    }

    let account_id = match input.id {
        Some(id) if !id.trim().is_empty() => {
            conn.execute(
                "UPDATE email_accounts
                 SET name = ?1, email = ?2, provider = ?3,
                     smtp_host = ?4, smtp_port = ?5, smtp_user = ?6, smtp_password = ?7,
                     imap_host = ?8, imap_port = ?9, imap_user = ?10, imap_password = ?11,
                     oauth_access_token = ?12, oauth_refresh_token = ?13, is_default = ?14
                 WHERE id = ?15",
                params![
                    input.name,
                    input.email,
                    input.provider,
                    input.smtp_host,
                    input.smtp_port,
                    input.smtp_user,
                    input.smtp_password,
                    input.imap_host,
                    input.imap_port,
                    input.imap_user,
                    input.imap_password,
                    input.oauth_access_token,
                    input.oauth_refresh_token,
                    if is_default { 1 } else { 0 },
                    id
                ],
            )
            .map_err(|e| e.to_string())?;
            id
        }
        _ => {
            let new_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO email_accounts
                 (id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password,
                  imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token,
                  is_default, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                params![
                    new_id,
                    input.name,
                    input.email,
                    input.provider,
                    input.smtp_host,
                    input.smtp_port,
                    input.smtp_user,
                    input.smtp_password,
                    input.imap_host,
                    input.imap_port,
                    input.imap_user,
                    input.imap_password,
                    input.oauth_access_token,
                    input.oauth_refresh_token,
                    if is_default { 1 } else { 0 },
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
            new_id
        }
    };

    let mut stmt = conn
        .prepare(
            "SELECT id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password,
                    imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token,
                    is_default, created_at, last_synced_at
             FROM email_accounts WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let account = stmt
        .query_row([&account_id], |row| {
            Ok(EmailAccount {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                provider: row.get(3)?,
                smtp_host: row.get(4)?,
                smtp_port: row.get(5)?,
                smtp_user: row.get(6)?,
                smtp_password: row.get(7)?,
                imap_host: row.get(8)?,
                imap_port: row.get(9)?,
                imap_user: row.get(10)?,
                imap_password: row.get(11)?,
                oauth_access_token: row.get(12)?,
                oauth_refresh_token: row.get(13)?,
                is_default: row.get::<_, i64>(14)? == 1,
                created_at: row.get(15)?,
                last_synced_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub fn delete_email_account(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM email_accounts WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn test_email_connection(
    _db: State<'_, DbState>,
    input: SaveEmailAccountInput,
) -> Result<TestConnectionResponse, String> {
    if input.provider == "smtp_imap" {
        let host = input
            .smtp_host
            .ok_or_else(|| "Servidor SMTP no configurado".to_string())?;
        let user = input
            .smtp_user
            .ok_or_else(|| "Usuario SMTP no configurado".to_string())?;
        let password = input
            .smtp_password
            .ok_or_else(|| "Contraseña SMTP no configurada".to_string())?;
        let port = input.smtp_port.unwrap_or(587);

        let creds = Credentials::new(user, password);
        let mailer = SmtpTransport::relay(&host)
            .map_err(|e| format!("Error en host SMTP: {}", e))?
            .port(port)
            .credentials(creds)
            .timeout(Some(Duration::from_secs(10)))
            .build();

        match mailer.test_connection() {
            Ok(true) => Ok(TestConnectionResponse {
                success: true,
                message: "¡Conexión SMTP exitosa! Credenciales y servidor validados correctamente.".to_string(),
            }),
            Ok(false) => Err("El servidor rechazó la prueba de conexión.".to_string()),
            Err(e) => Err(format!("Error conectando a servidor SMTP: {}", e)),
        }
    } else {
        Ok(TestConnectionResponse {
            success: true,
            message: "Configuración de API Cloud registrada correctamente.".to_string(),
        })
    }
}

#[tauri::command]
pub async fn send_email_direct(
    db: State<'_, DbState>,
    input: SendEmailInput,
) -> Result<SendEmailResponse, String> {
    let account: EmailAccount = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        if let Some(acc_id) = &input.account_id {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password,
                            imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token,
                            is_default, created_at, last_synced_at
                     FROM email_accounts WHERE id = ?1",
                )
                .map_err(|e| e.to_string())?;
            stmt.query_row([acc_id], |row| {
                Ok(EmailAccount {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    email: row.get(2)?,
                    provider: row.get(3)?,
                    smtp_host: row.get(4)?,
                    smtp_port: row.get(5)?,
                    smtp_user: row.get(6)?,
                    smtp_password: row.get(7)?,
                    imap_host: row.get(8)?,
                    imap_port: row.get(9)?,
                    imap_user: row.get(10)?,
                    imap_password: row.get(11)?,
                    oauth_access_token: row.get(12)?,
                    oauth_refresh_token: row.get(13)?,
                    is_default: row.get::<_, i64>(14)? == 1,
                    created_at: row.get(15)?,
                    last_synced_at: row.get(16)?,
                })
            })
            .map_err(|_| "Cuenta de correo no encontrada".to_string())?
        } else {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password,
                            imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token,
                            is_default, created_at, last_synced_at
                     FROM email_accounts WHERE is_default = 1 LIMIT 1",
                )
                .map_err(|e| e.to_string())?;
            stmt.query_row([], |row| {
                Ok(EmailAccount {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    email: row.get(2)?,
                    provider: row.get(3)?,
                    smtp_host: row.get(4)?,
                    smtp_port: row.get(5)?,
                    smtp_user: row.get(6)?,
                    smtp_password: row.get(7)?,
                    imap_host: row.get(8)?,
                    imap_port: row.get(9)?,
                    imap_user: row.get(10)?,
                    imap_password: row.get(11)?,
                    oauth_access_token: row.get(12)?,
                    oauth_refresh_token: row.get(13)?,
                    is_default: row.get::<_, i64>(14)? == 1,
                    created_at: row.get(15)?,
                    last_synced_at: row.get(16)?,
                })
            })
            .map_err(|_| "No hay una cuenta de correo configurada por defecto".to_string())?
        }
    };

    // 1. Send via Microsoft Graph REST API
    if account.provider == "microsoft_graph" {
        let token = account
            .oauth_access_token
            .as_ref()
            .ok_or_else(|| "No hay token de acceso para la cuenta Microsoft 365".to_string())?;

        let client = reqwest::Client::new();
        let payload = json!({
            "message": {
                "subject": input.subject,
                "body": {
                    "contentType": "Text",
                    "content": input.body
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": input.recipient
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        });

        let res = client
            .post("https://graph.microsoft.com/v1.0/me/sendMail")
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Error en Microsoft Graph API: {}", e))?;

        if !res.status().is_success() {
            let err_msg = res.text().await.unwrap_or_default();
            return Err(format!("Microsoft Graph rechazó el envío: {}", err_msg));
        }
    }
    // 2. Send via traditional SMTP
    else if account.provider == "smtp_imap" {
        let smtp_host = account
            .smtp_host
            .as_ref()
            .ok_or_else(|| "Servidor SMTP no configurado en la cuenta".to_string())?;
        let smtp_user = account
            .smtp_user
            .as_ref()
            .ok_or_else(|| "Usuario SMTP no configurado".to_string())?;
        let smtp_pass = account
            .smtp_password
            .as_ref()
            .ok_or_else(|| "Contraseña SMTP no configurada".to_string())?;
        let smtp_port = account.smtp_port.unwrap_or(587);

        let from_header = format!("{} <{}>", account.name, account.email);
        let email_builder = Message::builder()
            .from(from_header.parse().map_err(|e| format!("Error en remitente: {}", e))?)
            .to(input.recipient.parse().map_err(|e| format!("Error en destinatario: {}", e))?)
            .subject(&input.subject)
            .body(input.body.clone())
            .map_err(|e| format!("Error al construir correo: {}", e))?;

        let creds = Credentials::new(smtp_user.clone(), smtp_pass.clone());
        let mailer = SmtpTransport::relay(smtp_host)
            .map_err(|e| format!("Error en relay SMTP: {}", e))?
            .port(smtp_port)
            .credentials(creds)
            .timeout(Some(Duration::from_secs(15)))
            .build();

        mailer
            .send(&email_builder)
            .map_err(|e| format!("Error al enviar por SMTP: {}", e))?;
    }

    // 3. Store email in case_emails table
    let email_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO case_emails (id, case_id, account_id, direction, sender, recipient, subject, body_text, date, created_at)
             VALUES (?1, ?2, ?3, 'outbound', ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                email_id,
                input.case_id,
                account.id,
                account.email,
                input.recipient,
                input.subject,
                input.body,
                now,
                now
            ],
        )
        .map_err(|e| e.to_string())?;

        if input.auto_log_followup.unwrap_or(true) {
            let followup_id = Uuid::new_v4().to_string();
            let summary_text = format!("Envío de correo a {}: \"{}\"", input.recipient, input.subject);
            let _ = conn.execute(
                "INSERT INTO followups (id, case_id, type, summary, date, created_at)
                 VALUES (?1, ?2, 'email', ?3, ?4, ?5)",
                params![followup_id, input.case_id, summary_text, now, now],
            );
        }
    }

    Ok(SendEmailResponse {
        success: true,
        email_id,
        message: format!("Correo enviado exitosamente a {} vía {}", input.recipient, if account.provider == "microsoft_graph" { "Microsoft 365 Cloud" } else { "SMTP" }),
    })
}

#[tauri::command]
pub fn get_case_emails(db: State<'_, DbState>, case_id: String) -> Result<Vec<CaseEmail>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, case_id, account_id, direction, sender, recipient, subject, body_text, body_html, message_id, date, created_at
             FROM case_emails
             WHERE case_id = ?1
             ORDER BY date DESC",
        )
        .map_err(|e| e.to_string())?;

    let emails = stmt
        .query_map([&case_id], |row| {
            Ok(CaseEmail {
                id: row.get(0)?,
                case_id: row.get(1)?,
                account_id: row.get(2)?,
                direction: row.get(3)?,
                sender: row.get(4)?,
                recipient: row.get(5)?,
                subject: row.get(6)?,
                body_text: row.get(7)?,
                body_html: row.get(8)?,
                message_id: row.get(9)?,
                date: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(emails)
}

#[derive(Debug, Deserialize)]
struct GraphMessageItem {
    pub id: Option<String>,
    pub subject: Option<String>,
    #[serde(rename = "bodyPreview")]
    pub body_preview: Option<String>,
    #[serde(rename = "receivedDateTime")]
    pub received_date_time: Option<String>,
    pub from: Option<GraphRecipient>,
}

#[derive(Debug, Deserialize)]
struct GraphRecipient {
    #[serde(rename = "emailAddress")]
    pub email_address: Option<GraphEmailAddress>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct GraphEmailAddress {
    pub name: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GraphMessagesResponse {
    pub value: Vec<GraphMessageItem>,
}

#[tauri::command]
pub async fn sync_inbox_emails(db: State<'_, DbState>) -> Result<SyncEmailsResult, String> {
    let (accounts, clients_map): (Vec<EmailAccount>, Vec<(String, String)>) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        
        let mut acc_stmt = conn.prepare("SELECT id, name, email, provider, smtp_host, smtp_port, smtp_user, smtp_password, imap_host, imap_port, imap_user, imap_password, oauth_access_token, oauth_refresh_token, is_default, created_at, last_synced_at FROM email_accounts").map_err(|e| e.to_string())?;
        let accs = acc_stmt.query_map([], |row| {
            Ok(EmailAccount {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                provider: row.get(3)?,
                smtp_host: row.get(4)?,
                smtp_port: row.get(5)?,
                smtp_user: row.get(6)?,
                smtp_password: row.get(7)?,
                imap_host: row.get(8)?,
                imap_port: row.get(9)?,
                imap_user: row.get(10)?,
                imap_password: row.get(11)?,
                oauth_access_token: row.get(12)?,
                oauth_refresh_token: row.get(13)?,
                is_default: row.get::<_, i64>(14)? == 1,
                created_at: row.get(15)?,
                last_synced_at: row.get(16)?,
            })
        }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        // Map client email -> case_id (for open cases)
        let mut cases_stmt = conn.prepare("SELECT c.id, cl.email FROM cases c JOIN clients cl ON c.client_id = cl.id WHERE c.status != 'closed' AND cl.email IS NOT NULL AND cl.email != ''").map_err(|e| e.to_string())?;
        let cmap = cases_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?.to_lowercase()))
        }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        (accs, cmap)
    };

    let mut new_emails = 0u32;
    let client = reqwest::Client::new();
    let now = Utc::now().to_rfc3339();

    for acc in accounts {
        if acc.provider == "microsoft_graph" {
            if let Some(token) = &acc.oauth_access_token {
                let url = "https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,subject,bodyPreview,receivedDateTime,from&$orderby=receivedDateTime%20desc";
                if let Ok(res) = client.get(url).bearer_auth(token).send().await {
                    if let Ok(data) = res.json::<GraphMessagesResponse>().await {
                        let conn = db.0.lock().map_err(|e| e.to_string())?;
                        for msg in data.value {
                            if let Some(from) = msg.from.and_then(|f| f.email_address) {
                                let sender_email = from.address.unwrap_or_default().to_lowercase();
                                // Check if sender matches any client email
                                if let Some((case_id, _)) = clients_map.iter().find(|(_, em)| em == &sender_email) {
                                    let msg_id = msg.id.unwrap_or_else(|| Uuid::new_v4().to_string());
                                    
                                    // Check if already stored
                                    let exists: i64 = conn.query_row("SELECT COUNT(*) FROM case_emails WHERE message_id = ?1", [&msg_id], |r| r.get(0)).unwrap_or(0);
                                    if exists == 0 {
                                        let email_id = Uuid::new_v4().to_string();
                                        let subject = msg.subject.unwrap_or_else(|| "(Sin Asunto)".to_string());
                                        let body_text = msg.body_preview.unwrap_or_default();
                                        let date = msg.received_date_time.unwrap_or_else(|| now.clone());

                                        let _ = conn.execute(
                                            "INSERT INTO case_emails (id, case_id, account_id, direction, sender, recipient, subject, body_text, message_id, date, created_at)
                                             VALUES (?1, ?2, ?3, 'inbound', ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                                            params![email_id, case_id, acc.id, sender_email, acc.email, subject, body_text, msg_id, date, now],
                                        );

                                        // Auto-log followup
                                        let f_id = Uuid::new_v4().to_string();
                                        let f_sum = format!("Correo entrante de {}: \"{}\"", sender_email, subject);
                                        let _ = conn.execute(
                                            "INSERT INTO followups (id, case_id, type, summary, date, created_at) VALUES (?1, ?2, 'email', ?3, ?4, ?5)",
                                            params![f_id, case_id, f_sum, date, now]
                                        );

                                        new_emails += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute("UPDATE email_accounts SET last_synced_at = ?1", [&now]);
    }

    Ok(SyncEmailsResult {
        new_emails_count: new_emails,
        updated_cases_count: if new_emails > 0 { 1 } else { 0 },
        message: if new_emails > 0 {
            format!("Sincronización finalizada: {} nuevo(s) correo(s) de clientes asociados.", new_emails)
        } else {
            "Bandeja de entrada sincronizada. No hay nuevos correos de clientes pendientes.".to_string()
        },
    })
}
