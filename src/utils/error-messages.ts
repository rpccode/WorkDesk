/**
 * Traduce un error técnico a un mensaje accionable para el usuario.
 *
 * El detalle técnico se conserva en el log (el usuario no puede actuar sobre
 * un stack trace), pero el mensaje mostrado dice qué pasó y qué hacer.
 */
export function toUserMessage(
  err: unknown,
  fallback: string,
  hint?: string,
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : (err as { message?: string })?.message || '';

  console.error('[WorkDesk] Error original:', err);

  // Mensajes ya accionables: se respetan tal cual.
  if (!raw) return hint ? `${fallback} ${hint}` : fallback;

  const looksTechnical =
    /TypeError|ReferenceError|SyntaxError|is not a function|is not defined|Cannot read|Cannot access|undefined|null|stack|at \w+ \(|panic|unwrap|Exception|\.rs:\d+|\.tsx:\d+|\.ts:\d+/i.test(
      raw,
    );

  if (!looksTechnical) return raw;

  return hint ? `${fallback} ${hint}` : fallback;
}
