// Utilidades de fecha para WorkDesk

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const today = getTodayIso();
  return dueDate < today;
}

export function isDueToday(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const today = getTodayIso();
  return dueDate === today;
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return 'Sin fecha';
  try {
    const parts = isoString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoString;
  } catch {
    return isoString || 'Sin fecha';
  }
}

export function formatRelativeDate(dueDate?: string | null): string {
  if (!dueDate) return 'Sin fecha límite';
  const today = getTodayIso();
  if (dueDate === today) return '¡Vence hoy!';

  const todayDate = new Date(today);
  const targetDate = new Date(dueDate.split('T')[0]);
  const diffTime = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Vence mañana';
  if (diffDays === -1) return 'Venció ayer';
  if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`;
  return `Vence en ${diffDays} días`;
}
