import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Copy, Check, Terminal, Download } from 'lucide-react';
import { logAppError, downloadErrorLogsTxt } from '../utils/error-logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error captured by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Store error persistently via error-logger
    logAppError(error, {
      componentStack: errorInfo.componentStack || undefined,
      source: 'React ErrorBoundary',
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    window.location.reload();
  };

  private handleDownloadTxt = () => {
    downloadErrorLogsTxt(undefined, `workdesk_crash_report_${new Date().toISOString().split('T')[0]}.txt`);
  };

  private handleCopyLog = async () => {
    const errorText = `[WorkDesk Crash Report]
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}`;

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // ignore
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              maxWidth: '680px',
              width: '100%',
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-critical, #ef4444)',
              }}
            >
              <AlertOctagon size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                {this.props.fallbackTitle || 'Se produjo un error inesperado en la interfaz'}
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                WorkDesk contuvo el problema de forma segura para evitar que la aplicación se cierre por completo.
              </p>
            </div>

            {/* Error Details Accordion Box */}
            <div
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: 'var(--bg-surface-elevated, #1e293b)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-critical, #ef4444)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                <Terminal size={14} /> Detalle Técnico:
              </div>
              <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error?.message || 'Error desconocido'}
                {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
              </code>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={this.handleReset}
                style={{ fontSize: '0.84rem', padding: '0.55rem 1.25rem', gap: '0.45rem' }}
              >
                <RefreshCw size={15} /> Recargar Vista
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={this.handleDownloadTxt}
                style={{ fontSize: '0.84rem', padding: '0.55rem 1.25rem', gap: '0.45rem' }}
              >
                <Download size={15} /> Descargar Log (.txt)
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={this.handleCopyLog}
                style={{ fontSize: '0.84rem', padding: '0.55rem 1.25rem', gap: '0.45rem' }}
              >
                {this.state.copied ? <Check size={15} color="var(--status-low, #10b981)" /> : <Copy size={15} />}
                {this.state.copied ? '¡Copiado!' : 'Copiar Registro'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
