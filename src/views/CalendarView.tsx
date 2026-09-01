import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckSquare,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Filter,
} from 'lucide-react';
import {
  getMonthMatrix,
  getWeekDays,
  formatMonthYear,
  groupCalendarEvents,
  type CalendarDay,
  type CalendarEvent,
} from '../utils/calendar-utils';
import { CommitmentModal } from '../components/CommitmentModal';
import { isOverdue, isDueToday, formatDate, formatRelativeDate } from '../utils/date';

type CalendarViewMode = 'month' | 'week' | 'agenda';

export const CalendarView: React.FC = () => {
  const {
    commitments,
    followups,
    clients,
    cases,
    markCommitmentDone,
    setSelectedCaseId,
  } = useStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [showOnlyPending, setShowOnlyPending] = useState<boolean>(false);

  // Modals & Selection
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState<boolean>(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered commitments & followups
  const filteredCommitments = useMemo(() => {
    return commitments.filter((com) => {
      if (showOnlyPending && com.status === 'done') return false;
      if (selectedOwner !== 'all' && com.owner !== selectedOwner) return false;
      if (selectedClientId !== 'all') {
        const caseItem = cases.find((c) => c.id === com.case_id);
        if (caseItem?.client_id !== selectedClientId) return false;
      }
      return true;
    });
  }, [commitments, showOnlyPending, selectedOwner, selectedClientId, cases]);

  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      if (selectedClientId !== 'all') {
        const caseItem = cases.find((c) => c.id === f.case_id);
        if (caseItem?.client_id !== selectedClientId) return false;
      }
      return true;
    });
  }, [followups, selectedClientId, cases]);

  // Group events by YYYY-MM-DD
  const eventsMap = useMemo(() => {
    return groupCalendarEvents(filteredCommitments, filteredFollowups);
  }, [filteredCommitments, filteredFollowups]);

  // Days matrices
  const monthDays = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Agenda events list (ordered)
  const agendaEvents = useMemo(() => {
    const list: CalendarEvent[] = [];
    eventsMap.forEach((events) => {
      list.push(...events);
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [eventsMap]);

  const handleOpenAddCommitment = (dateStr?: string) => {
    setPrefilledDate(dateStr);
    setIsCommitmentModalOpen(true);
  };

  const getEventBadgeStyle = (event: CalendarEvent) => {
    if (event.type === 'followup') {
      return {
        bg: 'rgba(147, 51, 234, 0.1)',
        border: 'rgba(147, 51, 234, 0.3)',
        color: '#9333ea',
      };
    }
    if (event.status === 'done') {
      return {
        bg: 'var(--status-low-bg)',
        border: 'var(--status-low-border)',
        color: 'var(--status-low)',
      };
    }
    if (isOverdue(event.date)) {
      return {
        bg: 'var(--status-critical-bg)',
        border: 'var(--status-critical-border)',
        color: 'var(--status-critical)',
      };
    }
    if (isDueToday(event.date)) {
      return {
        bg: 'var(--status-medium-bg)',
        border: 'var(--status-medium-border)',
        color: 'var(--status-medium)',
      };
    }
    return {
      bg: 'var(--accent-glow)',
      border: 'rgba(37, 99, 235, 0.3)',
      color: 'var(--accent-primary)',
    };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Top Header & Controls ───────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1.2rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Month Navigator & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button className="btn-secondary" style={{ padding: '0.45rem' }} onClick={handlePrev} title="Anterior">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', fontWeight: 600 }} onClick={handleToday}>
              Hoy
            </button>
            <button className="btn-secondary" style={{ padding: '0.45rem' }} onClick={handleNext} title="Siguiente">
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
              {formatMonthYear(year, month)}
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {filteredCommitments.length} compromiso(s) programado(s)
            </p>
          </div>
        </div>

        {/* Right: View switcher & New Commitment CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn-ghost ${viewMode === 'month' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: viewMode === 'month' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'month' ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setViewMode('month')}
            >
              Mes
            </button>
            <button
              className={`btn-ghost ${viewMode === 'week' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: viewMode === 'week' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'week' ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn-ghost ${viewMode === 'agenda' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: viewMode === 'agenda' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'agenda' ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>

          <button
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', fontWeight: 600 }}
            onClick={() => handleOpenAddCommitment()}
          >
            <Plus size={15} /> Nuevo Compromiso
          </button>
        </div>
      </div>

      {/* ── Filters Bar ────────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Filter size={14} /> Filtros:
        </span>

        {/* Client filter */}
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          style={{ width: 'auto', minWidth: '180px', fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
        >
          <option value="all">Todos los Clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Owner filter */}
        <select
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
          style={{ width: 'auto', minWidth: '150px', fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
        >
          <option value="all">Todos los Responsables</option>
          <option value="me">👤 Míos (Consultor)</option>
          <option value="client">🏢 Cliente</option>
          <option value="third_party">👥 Terceros</option>
        </select>

        {/* Status checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showOnlyPending}
            onChange={(e) => setShowOnlyPending(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          />
          Ocultar completados
        </label>
      </div>

      {/* ── MONTH VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          {/* Day of week headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
              gap: '1px',
              backgroundColor: 'var(--border-subtle)',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              overflow: 'hidden',
            }}
          >
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, idx) => (
              <div
                key={d}
                style={{
                  padding: '0.65rem',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: idx >= 5 ? 'var(--text-muted)' : 'var(--text-secondary)',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
              gap: '1px',
              backgroundColor: 'var(--border-subtle)',
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            {monthDays.map((day) => {
              const events = eventsMap.get(day.date) || [];
              const pendingEvents = events.filter((e) => e.status !== 'done');
              const hasOverdue = events.some((e) => e.status !== 'done' && isOverdue(e.date));

              return (
                <div
                  key={day.date}
                  style={{
                    minHeight: '115px',
                    padding: '0.55rem',
                    backgroundColor: day.isToday
                      ? 'rgba(37,99,235,0.06)'
                      : day.isCurrentMonth
                      ? 'var(--bg-surface)'
                      : 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                  onClick={() => setSelectedDay(day)}
                >
                  {/* Top Day Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: day.isToday ? 800 : 600,
                        color: day.isToday
                          ? 'var(--accent-primary)'
                          : day.isCurrentMonth
                          ? 'var(--text-primary)'
                          : 'var(--text-muted)',
                        width: day.isToday ? '22px' : 'auto',
                        height: day.isToday ? '22px' : 'auto',
                        borderRadius: '50%',
                        backgroundColor: day.isToday ? 'var(--accent-glow)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {day.dayOfMonth}
                    </span>

                    {events.length > 0 && (
                      <span
                        className={`nav-badge ${hasOverdue ? 'nav-badge-critical' : 'nav-badge-default'}`}
                        style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem' }}
                      >
                        {pendingEvents.length > 0 ? pendingEvents.length : '✓'}
                      </span>
                    )}
                  </div>

                  {/* Event pills inside day cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'hidden' }}>
                    {events.slice(0, 3).map((ev) => {
                      const badge = getEventBadgeStyle(ev);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title={ev.title}
                        >
                          {ev.type === 'commitment' ? (
                            <CheckSquare size={10} style={{ flexShrink: 0 }} />
                          ) : (
                            <MessageSquare size={10} style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                        </div>
                      );
                    })}

                    {events.length > 3 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        +{events.length - 3} más...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {weekDays.map((day) => {
            const events = eventsMap.get(day.date) || [];
            return (
              <div
                key={day.date}
                className="glass-card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: day.isToday ? 'rgba(37,99,235,0.04)' : undefined,
                  borderTop: day.isToday ? '3px solid var(--accent-primary)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                      {formatDate(day.date)}
                    </h4>
                    {day.isToday && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        (Hoy)
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.72rem' }}
                    onClick={() => handleOpenAddCommitment(day.date)}
                    title="Añadir compromiso en este día"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Day events list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  {events.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Sin compromisos
                    </div>
                  ) : (
                    events.map((ev) => {
                      const badge = getEventBadgeStyle(ev);
                      const isDone = ev.status === 'done';
                      return (
                        <div
                          key={ev.id}
                          style={{
                            padding: '0.65rem 0.8rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: badge.color }}>
                              {ev.title}
                            </span>
                            {ev.type === 'commitment' && !isDone && (
                              <button
                                className="btn-ghost"
                                style={{ padding: '0.1rem', color: 'var(--status-low)' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markCommitmentDone(ev.id.replace('com-', ''));
                                }}
                                title="Marcar como completado"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                          </div>
                          {ev.subtitle && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {ev.subtitle}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── AGENDA TIMELINE VIEW ───────────────────────────────────── */}
      {viewMode === 'agenda' && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={18} color="var(--accent-primary)" />
            Cronograma de Entregas & Eventos
          </h3>

          {agendaEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <CheckSquare size={36} color="var(--accent-primary)" />
              <p>No hay compromisos ni eventos registrados en las fechas seleccionadas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {agendaEvents.map((ev) => {
                const badge = getEventBadgeStyle(ev);
                const isDone = ev.status === 'done';
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderLeft: `4px solid ${badge.color}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ minWidth: '95px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {formatDate(ev.date)}
                        </span>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {formatRelativeDate(ev.date)}
                        </p>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                            {ev.title}
                          </span>
                          <span
                            className="badge"
                            style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                          >
                            {ev.type === 'commitment' ? (isDone ? 'Completado' : isOverdue(ev.date) ? 'Vencido' : 'Pendiente') : 'Seguimiento'}
                          </span>
                        </div>
                        {ev.subtitle && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {ev.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ev.case_id && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                          onClick={() => setSelectedCaseId(ev.case_id)}
                        >
                          <ExternalLink size={13} /> Ver Caso
                        </button>
                      )}

                      {ev.type === 'commitment' && !isDone && (
                        <button
                          className="btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => markCommitmentDone(ev.id.replace('com-', ''))}
                        >
                          <CheckCircle2 size={13} /> Hecho
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Day Details Drawer / Popover ───────────────────────────── */}
      {selectedDay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9980,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '480px',
              height: '100%',
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ padding: '1.3rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {formatDate(selectedDay.date)}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {eventsMap.get(selectedDay.date)?.length || 0} evento(s) programado(s)
                </p>
              </div>
              <button className="btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setSelectedDay(null)}>
                ✕
              </button>
            </div>

            {/* Day Events Feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(eventsMap.get(selectedDay.date) || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <CalendarIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p>No hay eventos ni compromisos para este día.</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '0.8rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      const d = selectedDay.date;
                      setSelectedDay(null);
                      handleOpenAddCommitment(d);
                    }}
                  >
                    <Plus size={14} /> Añadir Compromiso
                  </button>
                </div>
              ) : (
                (eventsMap.get(selectedDay.date) || []).map((ev) => {
                  const badge = getEventBadgeStyle(ev);
                  const isDone = ev.status === 'done';
                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: '1rem 1.15rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderLeft: `4px solid ${badge.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {ev.title}
                        </span>
                        <span className="badge" style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {ev.type === 'commitment' ? (isDone ? 'Completado' : isOverdue(ev.date) ? 'Vencido' : 'Pendiente') : 'Seguimiento'}
                        </span>
                      </div>

                      {ev.subtitle && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {ev.subtitle}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {ev.case_id && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                            onClick={() => {
                              setSelectedDay(null);
                              setSelectedCaseId(ev.case_id);
                            }}
                          >
                            <ExternalLink size={12} /> Ver Caso
                          </button>
                        )}
                        {ev.type === 'commitment' && !isDone && (
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                            onClick={() => markCommitmentDone(ev.id.replace('com-', ''))}
                          >
                            <CheckCircle2 size={12} /> Completar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer bottom button */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.85rem' }}
                onClick={() => {
                  const d = selectedDay.date;
                  setSelectedDay(null);
                  handleOpenAddCommitment(d);
                }}
              >
                <Plus size={15} /> Programar Compromiso para {formatDate(selectedDay.date)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commitment Creation Modal */}
      <CommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => setIsCommitmentModalOpen(false)}
        initialDueDate={prefilledDate}
      />
    </div>
  );
};
