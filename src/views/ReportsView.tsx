import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Copy, Check, Calendar, Download } from 'lucide-react';
import { buildWeeklyReport } from '../utils/report-builder';

export const ReportsView: React.FC = () => {
  const { cases, commitments, fetchCases, fetchCommitments, consultantProfile } = useStore();
  const [period, setPeriod] = useState('Semana en Curso');
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCases();
    fetchCommitments();
  }, []);

  useEffect(() => {
    const activeCases = cases.filter((c) => c.status !== 'closed');
    const criticalCases = cases.filter((c) => c.status !== 'closed' && c.priority === 'critical');
    const completedCommitments = commitments.filter((c) => c.status === 'done');
    const pendingCommitments = commitments.filter((c) => c.status !== 'done' && c.owner === 'me');
    const waitingCommitments = commitments.filter((c) => c.status !== 'done' && c.owner !== 'me');

    const md = buildWeeklyReport({
      periodTitle: period,
      activeCases,
      criticalCases,
      completedCommitments,
      pendingCommitments,
      waitingCommitments,
      consultantName: consultantProfile.name,
      consultantRole: `${consultantProfile.role_title} • ${consultantProfile.company}`,
    });

    setReportMarkdown(md);
  }, [cases, commitments, period, consultantProfile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-workdesk-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Informe Ejecutivo & Reportes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Generación automática de estatus semanal para clientes, directores o archivo personal
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn-secondary" onClick={handleDownload}>
            <Download size={16} /> Descargar .md
          </button>
          <button className={copied ? 'btn-success' : 'btn-primary'} onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '¡Copiado!' : 'Copiar Informe'}
          </button>
        </div>
      </div>

      {/* Selector and Options */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Calendar size={18} color="var(--accent-primary)" />
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Período del Reporte:
        </label>
        <input
          type="text"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Ej. Semana del 25 al 31 de Agosto"
          style={{ width: '320px' }}
        />
      </div>

      {/* Markdown Preview Area */}
      <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            VISTA PREVIA DEL INFORME (MARKDOWN FORMATEADO)
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Listo para pegar en Teams, WhatsApp, Correo o Notion
          </span>
        </div>

        <textarea
          value={reportMarkdown}
          onChange={(e) => setReportMarkdown(e.target.value)}
          style={{
            width: '100%',
            minHeight: '480px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            resize: 'vertical',
          }}
        />
      </div>
    </div>
  );
};
