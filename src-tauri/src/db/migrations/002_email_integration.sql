-- 002_email_integration.sql: Tablas para integración y sincronización de correo

PRAGMA foreign_keys = ON;

-- Cuentas de correo configuradas (SMTP/IMAP o APIs Cloud)
CREATE TABLE IF NOT EXISTS email_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'smtp_imap', -- 'smtp_imap', 'microsoft_graph', 'gmail_api'
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_password TEXT,
    imap_host TEXT,
    imap_port INTEGER,
    imap_user TEXT,
    imap_password TEXT,
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL,
    last_synced_at TEXT
);

-- Correos vinculados a casos (salientes o entrantes)
CREATE TABLE IF NOT EXISTS case_emails (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    account_id TEXT,
    direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound', 'outbound'
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    message_id TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_case_emails_case_id ON case_emails(case_id);
CREATE INDEX IF NOT EXISTS idx_case_emails_date ON case_emails(date);
CREATE INDEX IF NOT EXISTS idx_case_emails_direction ON case_emails(direction);
