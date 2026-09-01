import type { Case, Commitment, Client, ConsultantAnalytics } from '../types';

export function calculateConsultantAnalytics(
  clients: Client[],
  cases: Case[],
  commitments: Commitment[]
): ConsultantAnalytics {
  const myCompletedComms = commitments.filter(
    (c) => c.owner === 'me' && c.status === 'done'
  );

  // 1. On-Time SLA Rate
  let onTimeCount = 0;
  myCompletedComms.forEach((c) => {
    if (!c.due_date || !c.done_at) {
      onTimeCount++; // If no due date, consider fulfilled
    } else {
      const dueDate = c.due_date.split('T')[0];
      const doneDate = c.done_at.split('T')[0];
      if (doneDate <= dueDate) {
        onTimeCount++;
      }
    }
  });

  const onTimeSlaRate =
    myCompletedComms.length > 0
      ? Math.round((onTimeCount / myCompletedComms.length) * 100)
      : 100;

  // 2. Average Case Resolution Days
  const closedCases = cases.filter((c) => c.status === 'closed' && c.closed_at);
  let totalCaseDays = 0;
  closedCases.forEach((c) => {
    const created = new Date(c.created_at).getTime();
    const closed = new Date(c.closed_at!).getTime();
    const days = Math.max(1, Math.round((closed - created) / (1000 * 60 * 60 * 24)));
    totalCaseDays += days;
  });
  const avgCaseResolutionDays =
    closedCases.length > 0 ? Math.round(totalCaseDays / closedCases.length) : 0;

  // 3. Average Client Response Days (for active waiting commitments)
  const waitingComms = commitments.filter((c) => c.status !== 'done' && c.owner !== 'me');
  let totalWaitingDays = 0;
  waitingComms.forEach((c) => {
    const created = new Date(c.created_at).getTime();
    const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    totalWaitingDays += days;
  });
  const avgClientResponseDays =
    waitingComms.length > 0 ? Math.round(totalWaitingDays / waitingComms.length) : 0;

  // 4. Bottleneck Radar by Client
  const clientMap = new Map<string, { count: number; daysSum: number; name: string }>();
  clients.forEach((cli) => {
    clientMap.set(cli.id, { count: 0, daysSum: 0, name: cli.name });
  });

  waitingComms.forEach((comm) => {
    const relatedCase = cases.find((item) => item.id === comm.case_id);
    const clientId = relatedCase?.client_id;
    if (clientId && clientMap.has(clientId)) {
      const entry = clientMap.get(clientId)!;
      const days = Math.floor((Date.now() - new Date(comm.created_at).getTime()) / (1000 * 60 * 60 * 24));
      entry.count += 1;
      entry.daysSum += days;
    }
  });

  const bottlenecks = Array.from(clientMap.entries())
    .map(([clientId, data]) => ({
      client_id: clientId,
      client_name: data.name,
      waiting_items_count: data.count,
      avg_waiting_days: data.count > 0 ? Math.round(data.daysSum / data.count) : 0,
    }))
    .filter((b) => b.waiting_items_count > 0)
    .sort((a, b) => b.avg_waiting_days - a.avg_waiting_days);

  return {
    on_time_sla_rate: onTimeSlaRate,
    total_commitments_completed: myCompletedComms.length,
    avg_case_resolution_days: avgCaseResolutionDays,
    avg_client_response_days: avgClientResponseDays,
    bottlenecks_by_client: bottlenecks,
  };
}
