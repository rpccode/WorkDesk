import type { Client, Case, Commitment, Ticket, ClientHealthReport, ClientHealthLevel } from '../types';

export function calculateClientHealth(
  client: Client,
  cases: Case[],
  commitments: Commitment[],
  tickets: Ticket[]
): ClientHealthReport {
  const clientCases = cases.filter((c) => c.client_id === client.id && c.status !== 'closed');
  const clientCaseIds = new Set(clientCases.map((c) => c.id));
  
  const clientCommitments = commitments.filter(
    (comm) => clientCaseIds.has(comm.case_id) && comm.status !== 'done'
  );
  
  const clientTickets = tickets.filter(
    (t) => t.client_id === client.id && t.status !== 'resolved' && t.status !== 'closed'
  );

  const today = new Date().toISOString().split('T')[0];

  // 1. Factores de Riesgo
  // Compromisos vencidos
  const overdueCount = clientCommitments.filter(
    (c) => c.due_date && c.due_date.split('T')[0] < today
  ).length;

  // Días máximos en espera de cliente / terceros
  let waitingDaysMax = 0;
  const waitingComms = clientCommitments.filter((c) => c.owner !== 'me');
  waitingComms.forEach((comm) => {
    const createdDate = new Date(comm.created_at);
    const diff = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > waitingDaysMax) waitingDaysMax = diff;
  });

  // Tickets críticos / altos sin resolver
  const criticalTicketsCount = clientTickets.filter(
    (t) => t.priority === 'critical' || t.priority === 'high'
  ).length;

  // Penalización por complejidad y falta de TI
  let complexityPenalty = 0;
  if (client.complexity_evaluated === 'Alta' || client.complexity_weighted === 'Alta') {
    complexityPenalty += 10;
    if (client.has_it_department === false) {
      complexityPenalty += 15; // Alta complejidad sin TI es un riesgo operativo alto
    }
  }

  // 2. Score Calculation (0 - 100)
  // Cada compromiso vencido suma 15 pts
  // Esperas largas suman: >5 días (+15 pts), >10 días (+30 pts)
  // Cada ticket crítico suma 10 pts
  let score = (overdueCount * 15) + (criticalTicketsCount * 10) + complexityPenalty;
  if (waitingDaysMax >= 10) {
    score += 30;
  } else if (waitingDaysMax >= 5) {
    score += 15;
  } else if (waitingDaysMax >= 3) {
    score += 8;
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  // 3. Health Level
  let level: ClientHealthLevel = 'healthy';
  if (score >= 56) {
    level = 'critical';
  } else if (score >= 26) {
    level = 'warning';
  }

  // 4. Recomendaciones Inteligentes de Consultoría
  const recommendations: string[] = [];

  if (overdueCount > 0) {
    recommendations.push(`Regularizar ${overdueCount} compromiso(s) vencido(s) de inmediato para no comprometer el SLA.`);
  }

  if (waitingDaysMax >= 5) {
    recommendations.push(`Llevas ${waitingDaysMax} días esperando validación del cliente. Disparar correo de seguimiento firme o agendar llamada de destrabe.`);
  }

  if (criticalTicketsCount > 0) {
    recommendations.push(`Hay ${criticalTicketsCount} ticket(s) crítico(s) pendientes. Priorizar resolución técnica.`);
  }

  if (client.complexity_evaluated === 'Alta' && client.has_it_department === false) {
    recommendations.push(`Al ser una cuenta de Complejidad Alta sin Depto. TI, se recomienda establecer un único interlocutor técnico o comité quincenal.`);
  }

  if (clientCases.some((c) => !c.next_action?.description)) {
    recommendations.push(`Definir Próxima Acción en los casos activos sin siguiente paso.`);
  }

  if (recommendations.length === 0) {
    recommendations.push(`Cuenta saludable con flujo de entregables al día y sin bloqueos.`);
  }

  return {
    client_id: client.id,
    score,
    level,
    factors: {
      overdue_count: overdueCount,
      waiting_days_max: waitingDaysMax,
      critical_tickets_count: criticalTicketsCount,
      complexity_penalty: complexityPenalty,
    },
    recommendations,
  };
}
