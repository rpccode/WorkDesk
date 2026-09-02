import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User,
  Zap,
  AlertTriangle,
  Sun,
} from 'lucide-react';
import { askCopilotQnA, generateMorningBriefAI, detectAbandonedAndRiskCases } from '../services/ai-copilot';

export const CopilotPanel: React.FC = () => {
  const {
    isCopilotOpen,
    setCopilotOpen,
    aiConfig,
    copilotMessages,
    addCopilotMessage,
    clearCopilotHistory,
    cases,
    commitments,
    clients,
    tickets,
    notes,
    inboxItems,
    consultantProfile,
    setActiveTab,
  } = useStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isCopilotOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isCopilotOpen, copilotMessages]);

  if (!isCopilotOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const question = (customPrompt || inputPrompt).trim();
    if (!question || isThinking) return;

    setInputPrompt('');
    addCopilotMessage({
      sender: 'user',
      content: question,
    });

    setIsThinking(true);

    try {
      const dataContext = {
        cases,
        commitments,
        clients,
        tickets,
        notes,
        inboxItems,
        userName: consultantProfile.name,
        userRole: consultantProfile.role_title,
      };

      const answer = await askCopilotQnA(
        question,
        copilotMessages,
        dataContext,
        aiConfig
      );

      addCopilotMessage({
        sender: 'assistant',
        content: answer,
      });
    } catch (err: any) {
      addCopilotMessage({
        sender: 'assistant',
        content: `⚠️ **Error:** ${err.message || 'No se pudo procesar tu consulta con la IA. Verifica tu API Key en Ajustes.'}`,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickMorningBrief = async () => {
    setIsThinking(true);
    addCopilotMessage({
      sender: 'user',
      content: '🌅 Generar Morning Brief del día',
    });

    try {
      const brief = await generateMorningBriefAI(
        {
          cases,
          commitments,
          clients,
          tickets,
          notes,
          inboxItems,
          userName: consultantProfile.name,
          userRole: consultantProfile.role_title,
        },
        aiConfig
      );

      addCopilotMessage({
        sender: 'assistant',
        content: brief,
      });
    } catch (err: any) {
      addCopilotMessage({
        sender: 'assistant',
        content: `⚠️ Error al generar brief: ${err.message}`,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickRisks = () => {
    addCopilotMessage({
      sender: 'user',
      content: '⚠️ ¿Cuáles son mis casos abandonados o con mayor riesgo?',
    });

    const risks = detectAbandonedAndRiskCases(cases, commitments, tickets, clients);
    if (risks.length === 0) {
      addCopilotMessage({
        sender: 'assistant',
        content: '✅ **Excelente noticia:** No se detectaron casos abandonados ni compromisos en riesgo crítico.',
      });
      return;
    }

    let report = `🚨 **Casos en Riesgo o Abandonados (${risks.length}):**\n\n`;
    risks.slice(0, 5).forEach((r) => {
      const badge = r.riskLevel === 'critical' ? '🔴 CRÍTICO' : r.riskLevel === 'high' ? '🟠 ALTO' : '🟡 MEDIO';
      report += `### [${badge}] ${r.caseTitle} (${r.clientName})\n`;
      r.reasons.forEach((reason) => {
        report += `- ${reason}\n`;
      });
      report += `💡 **Acción recomendada:** ${r.suggestedAction}\n\n`;
    });

    addCopilotMessage({
      sender: 'assistant',
      content: report,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '440px',
        maxWidth: '100vw',
        backgroundColor: 'var(--bg-surface-elevated)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.35)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              display: 'flex',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              WorkDesk AI Copilot
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: aiConfig.isConfigured ? 'var(--status-low-bg)' : 'var(--status-high-bg)',
                  color: aiConfig.isConfigured ? 'var(--status-low)' : 'var(--status-high)',
                }}
              >
                {aiConfig.isConfigured ? aiConfig.provider.toUpperCase() : 'Sin Configurar'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Razonamiento sobre tus casos y operaciones
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {copilotMessages.length > 0 && (
            <button
              type="button"
              onClick={clearCopilotHistory}
              title="Limpiar conversación"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: '4px',
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCopilotOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Config Warning Banner (if not configured) ────────────────────── */}
      {!aiConfig.isConfigured && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--accent-glow)',
            borderBottom: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-primary)',
          }}
        >
          <span>💡 Configura tu API Key de Gemini o OpenAI para máxima potencia.</span>
          <button
            type="button"
            onClick={() => {
              setCopilotOpen(false);
              setActiveTab('settings');
            }}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.7rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Configurar
          </button>
        </div>
      )}

      {/* ── Quick Suggestions Bar ───────────────────────────────────────── */}
      <div
        style={{
          padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <button
          type="button"
          onClick={handleQuickMorningBrief}
          disabled={isThinking}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Sun size={13} color="var(--accent-primary)" /> Morning Brief
        </button>

        <button
          type="button"
          onClick={handleQuickRisks}
          disabled={isThinking}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={13} color="var(--status-high)" /> Riesgos & Abandonados
        </button>

        <button
          type="button"
          onClick={() => handleSend('¿Cuáles son mis próximos 3 compromisos más urgentes?')}
          disabled={isThinking}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={13} color="var(--accent-primary)" /> Top 3 Urgentes
        </button>
      </div>

      {/* ── Messages List ───────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {copilotMessages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: 'var(--text-muted)',
              gap: '0.75rem',
              padding: '2rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ¿En qué puedo asistirte hoy?
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                Pregúntame sobre tus casos, bloqueos con clientes, preparación de reuniones o prioridades del día.
              </div>
            </div>
          </div>
        ) : (
          copilotMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {isUser ? (
                    <>
                      <span>Tú</span>
                      <User size={12} />
                    </>
                  ) : (
                    <>
                      <Bot size={12} color="var(--accent-primary)" />
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>AI Copilot</span>
                    </>
                  )}
                </div>

                <div
                  style={{
                    maxWidth: '92%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: isUser ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.78rem', fontStyle: 'italic', padding: '0.5rem' }}>
            <Sparkles size={16} className="animate-spin" />
            <span>AI Copilot está analizando tu información...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Box ───────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0.75rem 1rem 1rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.6rem',
          }}
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Pregunta sobre tus casos o clientes (Enter para enviar)..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isThinking}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              backgroundColor: inputPrompt.trim() && !isThinking ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: '#ffffff',
              border: 'none',
              cursor: inputPrompt.trim() && !isThinking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
