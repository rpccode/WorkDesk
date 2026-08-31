import type { Case, Commitment } from '../types';
import { formatDate } from './date';

export interface WeeklyReportData {
  periodTitle: string;
  activeCases: Case[];
  completedCommitments: Commitment[];
  pendingCommitments: Commitment[];
  waitingCommitments: Commitment[];
  criticalCases: Case[];
}

export function buildWeeklyReport(data: WeeklyReportData): string {
  const {
    periodTitle,
    activeCases,
    completedCommitments,
    pendingCommitments,
    waitingCommitments,
    criticalCases,
  } = data;

  const totalActions =
    activeCases.length +
    completedCommitments.length +
    pendingCommitments.length +
    waitingCommitments.length;

  if (totalActions === 0) {
    return `# Informe Operativo Semanal — ${periodTitle}\n\n_No se registraron movimientos ni casos activos en este período._`;
  }

  const criticalSection =
    criticalCases.length > 0
      ? `## 🚨 Casos Críticos / Atención Prioritaria\n` +
        criticalCases
          .map(
            (c) =>
              `- **[${c.client_name || 'Cliente'}]** ${c.title}\n  Estado: ${c.status} | Prioridad: ${c.priority}\n  ${c.description ? `_Resumen:_ ${c.description}` : ''}`
          )
          .join('\n\n')
      : `## 🚨 Casos Críticos\n- _No hay casos en estado crítico actualmente._`;

  const completedSection =
    completedCommitments.length > 0
      ? `## ✅ Compromisos y Entregas Completadas\n` +
        completedCommitments
          .map(
            (c) =>
              `- **[${c.client_name || 'General'}]** ${c.description} _(Completado: ${formatDate(c.done_at || c.created_at)})_`
          )
          .join('\n')
      : `## ✅ Compromisos Completados\n- _Sin compromisos marcados como completados esta semana._`;

  const pendingSection =
    pendingCommitments.length > 0
      ? `## 🎯 Próximos Compromisos (Bajo Mi Responsabilidad)\n` +
        pendingCommitments
          .map(
            (c) =>
              `- **[${c.client_name || 'General'}]** ${c.description} — _Límite: ${formatDate(c.due_date)}_`
          )
          .join('\n')
      : `## 🎯 Próximos Compromisos\n- _No hay compromisos pendientes inmediatos._`;

  const waitingSection =
    waitingCommitments.length > 0
      ? `## ⏳ Esperando Respuesta / Bloqueados por Terceros o Cliente\n` +
        waitingCommitments
          .map(
            (c) =>
              `- **[${c.client_name || 'Cliente'}]** ${c.description} _(Responsable: ${c.owner === 'client' ? 'Cliente' : 'Tercero'} | Fecha estimada: ${formatDate(c.due_date)})_`
          )
          .join('\n')
      : `## ⏳ En Espera de Terceros\n- _No hay temas pendientes de terceros._`;

  const activeCasesSection =
    activeCases.length > 0
      ? `## 📂 Cartera de Casos Activos (${activeCases.length})\n` +
        activeCases
          .map(
            (c) =>
              `- **[${c.client_name || 'Cliente'}] ${c.title}** (${c.status.toUpperCase()})`
          )
          .join('\n')
      : `## 📂 Cartera de Casos\n- _Sin casos abiertos._`;

  return `# 📊 Informe Operativo Semanal
**Período:** ${periodTitle}
**Generado:** ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

---

${criticalSection}

---

${completedSection}

---

${pendingSection}

---

${waitingSection}

---

${activeCasesSection}

---
_Generado automáticamente con WorkDesk — Centro de Operaciones Personales._`;
}
