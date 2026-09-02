// WorkDesk 0.5 — AI Copilot Service Layer
import type {
  AIConfig,
  Case,
  Commitment,
  Client,
  Ticket,
  Note,
  InboxItem,
  ExtractedCommitmentDraft,
  CopilotMessage,
} from '../types';

export interface WorkDeskContextData {
  cases: Case[];
  commitments: Commitment[];
  clients: Client[];
  tickets: Ticket[];
  notes?: Note[];
  inboxItems?: InboxItem[];
  userName?: string;
  userRole?: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-flash',
  ollamaBaseUrl: 'http://localhost:11434',
  isConfigured: false,
};

/**
 * Serializes WorkDesk operational state into a structured markdown prompt context.
 */
export function buildWorkDeskContext(data: WorkDeskContextData): string {
  const today = new Date().toISOString().split('T')[0];
  const activeCases = data.cases.filter((c) => c.status !== 'closed');
  const criticalCases = activeCases.filter((c) => c.priority === 'critical' || c.priority === 'high');
  const pendingCommitments = data.commitments.filter((c) => c.status !== 'done');
  const overdueCommitments = pendingCommitments.filter((c) => c.due_date && c.due_date.split('T')[0] < today);
  const waitingCommitments = pendingCommitments.filter((c) => c.owner !== 'me');
  const openTickets = data.tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const unprocessedInbox = (data.inboxItems || []).filter((i) => i.status === 'inbox');

  let ctx = `# CONTEXTO OPERACIONAL WORKDESK (Fecha Hoy: ${today})\n`;
  if (data.userName) {
    ctx += `Consultor: ${data.userName} (${data.userRole || 'Consultor / Gestor de Operaciones'})\n\n`;
  }

  ctx += `## RESUMEN DE SALUD GLOBAL:\n`;
  ctx += `- Casos Activos: ${activeCases.length} (${criticalCases.length} alta/crítica prioridad)\n`;
  ctx += `- Compromisos Pendientes: ${pendingCommitments.length}\n`;
  ctx += `- Compromisos Vencidos: ${overdueCommitments.length}\n`;
  ctx += `- Esperando de Clientes/Terceros: ${waitingCommitments.length}\n`;
  ctx += `- Tickets Abiertos: ${openTickets.length}\n`;
  ctx += `- Elementos en Bandeja (Inbox): ${unprocessedInbox.length}\n\n`;

  // Casos Críticos
  if (criticalCases.length > 0) {
    ctx += `## CASOS CRÍTICOS Y DE ALTA PRIORIDAD:\n`;
    criticalCases.slice(0, 8).forEach((c) => {
      const client = data.clients.find((cl) => cl.id === c.client_id)?.name || c.client_name || 'Sin cliente';
      const nextAct = c.next_action ? `[Próx Acción: ${c.next_action.description} (${c.next_action.owner_type})]` : '[Sin próx acción]';
      ctx += `- [${c.priority.toUpperCase()}] "${c.title}" | Cliente: ${client} | Estado: ${c.status} ${nextAct}\n`;
    });
    ctx += `\n`;
  }

  // Compromisos Vencidos
  if (overdueCommitments.length > 0) {
    ctx += `## COMPROMISOS VENCIDOS URGENTES:\n`;
    overdueCommitments.slice(0, 8).forEach((comm) => {
      const resp = comm.owner === 'me' ? 'MÍO' : comm.owner === 'client' ? 'DEL CLIENTE' : 'TERCERO';
      ctx += `- "${comm.description}" (Venció: ${comm.due_date?.split('T')[0]}) [Resp: ${resp}]\n`;
    });
    ctx += `\n`;
  }

  // Esperando de otros (bloqueos)
  if (waitingCommitments.length > 0) {
    ctx += `## BLOQUEOS / ESPERANDO DE CLIENTES O TERCEROS:\n`;
    waitingCommitments.slice(0, 8).forEach((comm) => {
      const client = comm.client_name || 'Cliente';
      ctx += `- ${client}: "${comm.description}" (Fecha límite: ${comm.due_date?.split('T')[0] || 'Sin fecha'})\n`;
    });
    ctx += `\n`;
  }

  // Clientes con casos activos
  ctx += `## CLIENTES CON ACTIVIDAD RECIENTE:\n`;
  data.clients.slice(0, 10).forEach((cl) => {
    const clCases = activeCases.filter((c) => c.client_id === cl.id);
    if (clCases.length > 0) {
      ctx += `- ${cl.name} (${cl.company || 'Empresa'}): ${clCases.length} casos activos\n`;
    }
  });

  return ctx;
}

/**
 * Universal AI Caller dispatching to Gemini, OpenAI, Anthropic, or Ollama.
 */
export async function callAI(
  prompt: string,
  systemContext: string,
  config: AIConfig,
  temperature = 0.3
): Promise<string> {
  if (!config.apiKey && config.provider !== 'ollama') {
    throw new Error(`No has configurado la API Key para ${config.provider.toUpperCase()}. Ve a Ajustes -> AI Copilot.`);
  }

  switch (config.provider) {
    case 'gemini':
      return callGemini(prompt, systemContext, config, temperature);
    case 'openai':
      return callOpenAI(prompt, systemContext, config, temperature);
    case 'anthropic':
      return callAnthropic(prompt, systemContext, config, temperature);
    case 'ollama':
      return callOllama(prompt, systemContext, config, temperature);
    default:
      throw new Error(`Proveedor no soportado: ${config.provider}`);
  }
}

export async function callAIGenerate(
  config: AIConfig,
  prompt: string,
  systemContext: string = 'Eres un asistente inteligente para WorkDesk.',
  temperature = 0.4
): Promise<string> {
  return callAI(prompt, systemContext, config, temperature);
}

// ── Provider Adapters ─────────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  systemContext: string,
  config: AIConfig,
  temperature: number
): Promise<string> {
  // Normalize deprecated model names to active stable ones
  const DEPRECATED: Record<string, string> = {
    'gemini-2.0-flash': 'gemini-1.5-flash',
    'models/gemini-2.0-flash': 'gemini-1.5-flash',
    'gemini-2.0-flash-001': 'gemini-1.5-flash',
    'gemini-2.0-flash-thinking-exp': 'gemini-1.5-flash',
    'gemini-pro': 'gemini-1.5-flash',
    'gemini-1.0-pro': 'gemini-1.5-flash',
  };

  let model = config.model?.trim() || 'gemini-1.5-flash';
  model = DEPRECATED[model] ?? model;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemContext}\n\n---\n\nINSTRUCCIÓN / PREGUNTA:\n${prompt}` }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 2048,
    },
  };

  const makeRequest = (m: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

  let res = await makeRequest(model);

  // Cascade fallback order when model is unavailable (404)
  if (!res.ok && res.status === 404) {
    const fallbackChain = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash-8b'];
    for (const fb of fallbackChain) {
      if (fb === model) continue;
      const fbRes = await makeRequest(fb);
      if (fbRes.ok) { res = fbRes; break; }
    }
  }

  if (!res.ok) {
    let errBody = '';
    try { errBody = await res.text(); } catch { /* ignore */ }
    // Provide a friendlier error message for model-not-found
    if (res.status === 404) {
      throw new Error(
        `El modelo de Gemini "${model}" no está activo en tu cuenta. Ve a Configuración → Motor de IA y selecciona "Gemini 1.5 Flash".`
      );
    }
    throw new Error(`Error Gemini (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini no retornó contenido en la respuesta.');
  }
  return text.trim();
}

async function callOpenAI(
  prompt: string,
  systemContext: string,
  config: AIConfig,
  temperature: number
): Promise<string> {
  const model = config.model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemContext },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: 2048,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Error OpenAI (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI no retornó texto.');
  return text.trim();
}

async function callAnthropic(
  prompt: string,
  systemContext: string,
  config: AIConfig,
  temperature: number
): Promise<string> {
  const model = config.model || 'claude-3-5-haiku-20241022';
  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model,
    max_tokens: 2048,
    temperature,
    system: systemContext,
    messages: [{ role: 'user', content: prompt }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Error Anthropic (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Anthropic no retornó texto.');
  return text.trim();
}

async function callOllama(
  prompt: string,
  systemContext: string,
  config: AIConfig,
  temperature: number
): Promise<string> {
  const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
  const model = config.model || 'llama3';
  const url = `${baseUrl}/api/generate`;

  const payload = {
    model,
    prompt: `${systemContext}\n\n${prompt}`,
    stream: false,
    options: { temperature },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Error Ollama (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.response ? data.response.trim() : '';
}

// ── 8 Features Especializadas ────────────────────────────────────────────────

/**
 * 1. Morning Brief IA — Párrafo de dirección de jornada diario
 */
export async function generateMorningBriefAI(
  data: WorkDeskContextData,
  config: AIConfig
): Promise<string> {
  if (!config.isConfigured || !config.apiKey) {
    // Fallback heurístico inteligente si no hay IA configurada
    const active = data.cases.filter((c) => c.status !== 'closed');
    const overdue = data.commitments.filter((c) => c.status !== 'done' && c.due_date && c.due_date < new Date().toISOString());
    const waiting = data.commitments.filter((c) => c.status !== 'done' && c.owner !== 'me');
    return `🌅 **Brief Matutino (Modo Heurístico):**\nTienes ${active.length} casos activos hoy. Prioridad inmediata en ${overdue.length} compromisos vencidos y seguimiento activo a ${waiting.length} bloqueos de clientes. *(Configura tu API Key en Ajustes para el análisis ejecutivo profundo con IA)*.`;
  }

  const systemContext = `Eres el Asesor Senior de Operaciones y Estrategia de WorkDesk. Tu rol es darle al consultor un resumen ejecutivo, directo, asertivo y de alto impacto al inicio de su jornada.
Responde en español con formato Markdown limpio (negritas, viñetas cortas). Sé conciso (máximo 150-200 palabras). Estructura:
1. 🎯 Foco Principal del Día (la prioridad número 1 insoslayable).
2. 🚨 Riesgos Inmediatos / Bloqueos Críticos (compromisos o clientes que requieren acción urgente hoy).
3. ⚡ Recomendación Táctica para la mañana.`;

  const workDeskCtx = buildWorkDeskContext(data);
  const prompt = `Analiza mi contexto operacional de hoy y genera mi Morning Brief Ejecutivo:\n\n${workDeskCtx}`;

  return callAI(prompt, systemContext, config, 0.4);
}

/**
 * 2. Extracción Automática de Compromisos a partir de texto libre
 */
export async function extractCommitmentsFromText(
  text: string,
  config: AIConfig
): Promise<ExtractedCommitmentDraft[]> {
  if (!config.isConfigured || !config.apiKey) {
    // Fallback con regex local básico
    const lines = text.split('\n').filter((l) => l.trim().length > 5);
    return lines.slice(0, 3).map((l) => ({
      description: l.replace(/^[-*•\d.]+\s*/, '').trim(),
      owner: 'me',
      confidence: 0.5,
    }));
  }

  const systemContext = `Eres un extractor experto de compromisos y tareas para consultores de operaciones.
Tu misión es leer notas de reunión, correos o minutas y extraer compromisos claros con responsable ('me' | 'client' | 'third_party'), nombre del responsable si aplica, fecha límite tentativa (YYYY-MM-DD) y prioridad ('normal' | 'urgent').
DEBES responder ÚNICAMENTE con un arreglo JSON válido sin bloques de código markdown adicionales o con \`\`\`json ... \`\`\`.
Estructura JSON:
[
  {
    "description": "Enviar informe de arquitectura",
    "owner": "me",
    "ownerName": "Consultor",
    "dueDate": "2026-09-05",
    "priority": "urgent",
    "confidence": 0.95
  }
]`;

  const prompt = `Extrae todos los compromisos del siguiente texto:\n\n"""\n${text}\n"""`;
  const rawResponse = await callAI(prompt, systemContext, config, 0.1);

  try {
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        description: item.description || 'Compromiso sin descripción',
        owner: item.owner === 'client' || item.owner === 'third_party' ? item.owner : 'me',
        ownerName: item.ownerName,
        dueDate: item.dueDate,
        priority: item.priority === 'urgent' ? 'urgent' : 'normal',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
      }));
    }
  } catch (e) {
    console.warn('Error parsing AI extracted commitments:', e, rawResponse);
  }

  return [];
}

/**
 * 3. Resumen Ejecutivo de un Caso
 */
export async function generateCaseSummaryAI(
  caseItem: Case,
  commitments: Commitment[],
  notes: Note[],
  tickets: Ticket[],
  config: AIConfig
): Promise<string> {
  const caseComms = commitments.filter((c) => c.case_id === caseItem.id);
  const caseNotes = notes.filter((n) => n.case_id === caseItem.id);
  const caseTickets = tickets.filter((t) => t.case_id === caseItem.id);

  if (!config.isConfigured || !config.apiKey) {
    return `### Resumen de Caso: ${caseItem.title}\n- **Estado:** ${caseItem.status} | **Prioridad:** ${caseItem.priority}\n- **Compromisos:** ${caseComms.filter((c) => c.status === 'done').length}/${caseComms.length} completados.\n- **Próxima Acción:** ${caseItem.next_action?.description || 'No asignada'}.`;
  }

  const systemContext = `Eres un consultor senior sintetizando el estado de un proyecto para la dirección.
Genera un resumen conciso en Markdown con:
1. **Diagnóstico Actual** (1 párrafo de qué ocurre y avance).
2. **Hitos y Bloqueos Clave** (viñetas).
3. **Próximo Paso Inmediato**.`;

  const caseContext = `
Caso: ${caseItem.title}
Descripción: ${caseItem.description || 'Sin descripción'}
Estado: ${caseItem.status} | Prioridad: ${caseItem.priority}
Cliente: ${caseItem.client_name || 'No especificado'}
Próxima Acción: ${caseItem.next_action?.description || 'Ninguna'} (${caseItem.next_action?.owner_type})

Compromisos (${caseComms.length}):
${caseComms.map((c) => `- [${c.status}] ${c.description} (Resp: ${c.owner})`).join('\n')}

Notas y Bitácora (${caseNotes.length}):
${caseNotes.slice(0, 5).map((n) => `- ${n.created_at.split('T')[0]}: ${n.content}`).join('\n')}

Tickets Relacionados (${caseTickets.length}):
${caseTickets.map((t) => `- ${t.title} [${t.status}]`).join('\n')}
`;

  return callAI(`Sintetiza este caso:\n${caseContext}`, systemContext, config, 0.3);
}

/**
 * 4. Preparación de Reunión para un Caso
 */
export async function generateMeetingPrepAI(
  caseItem: Case,
  client: Client | undefined,
  commitments: Commitment[],
  notes: Note[],
  config: AIConfig
): Promise<string> {
  const caseComms = commitments.filter((c) => c.case_id === caseItem.id);
  const pendingComms = caseComms.filter((c) => c.status !== 'done');
  const waitingComms = pendingComms.filter((c) => c.owner !== 'me');

  const systemContext = `Eres un asesor estratégico de negocios preparando a un consultor antes de entrar a una reunión con su cliente.
Genera una **Guía de Preparación de Reunión (Briefing)** con:
1. 🎯 **Objetivo de la Reunión** (1 frase contundente).
2. 📋 **Agenda Sugerida** (3-4 puntos clave).
3. 🚨 **Puntos Críticos a Exigir / Destrabar** (enfocado en lo que el cliente tiene pendiente de entregar).
4. ❓ **Preguntas Incisivas a Formular**.
5. 🛡️ **Postura Recomendada** (Estratégica / Firme / Colaborativa).`;

  const prompt = `Prepara mi reunión para el caso "${caseItem.title}" con el cliente "${client?.name || caseItem.client_name || 'Cliente'}".
Datos del caso:
- Descripción: ${caseItem.description || 'N/A'}
- Compromisos pendientes totales: ${pendingComms.length}
- Pendientes por parte del cliente: ${waitingComms.map((c) => c.description).join(', ') || 'Ninguno registrado'}
- Últimas notas: ${notes.filter((n) => n.case_id === caseItem.id).slice(0, 3).map((n) => n.content).join(' | ')}
`;

  return callAI(prompt, systemContext, config, 0.3);
}

/**
 * 5. Generación Contextual de Correos
 */
export async function generateContextualEmailAI(
  instruction: string,
  caseItem: Case | null,
  client: Client | null,
  tone: 'formal' | 'assertive' | 'technical' | 'urgent',
  config: AIConfig,
  consultantName?: string
): Promise<{ subject: string; body: string }> {
  if (!config.isConfigured || !config.apiKey) {
    return {
      subject: `Seguimiento: ${caseItem?.title || 'Caso Operativo'}`,
      body: `Estimado(a) ${client?.name || 'Cliente'},\n\nEscribo en relación con ${caseItem?.title || 'el servicio'}.\n\n${instruction}\n\nAtentamente,\n${consultantName || 'Consultoría'}`,
    };
  }

  const systemContext = `Eres un redactor ejecutivo de correspondencia corporativa de alto nivel.
Genera un correo en español adaptado al tono solicitado:
- formal: Diplomático, corporativo, impecable.
- assertive: Directo, enfocado en plazos, amable pero sin rodeos.
- technical: Con terminología de arquitectura, pasos y verificaciones.
- urgent: Sentido de urgencia alto, impacto en el negocio por demoras.

DEBES responder con un formato estructurado exacto:
ASUNTO: [Aquí el asunto]
CUERPO:
[Aquí el cuerpo del correo]`;

  const prompt = `Redacta un correo con la siguiente instrucción:
Instrucción: "${instruction}"
Tono: ${tone}
Destinatario: ${client?.name || 'Cliente'} (${client?.company || 'Empresa'})
Caso de Referencia: ${caseItem ? `"${caseItem.title}" (Estado: ${caseItem.status})` : 'General'}
Consultor que firma: ${consultantName || 'Equipo de Consultoría'}
`;

  const raw = await callAI(prompt, systemContext, config, 0.4);
  const matchAsunto = raw.match(/ASUNTO:\s*(.+)/i);
  const matchCuerpo = raw.split(/CUERPO:\s*/i)[1];

  const subject = matchAsunto ? matchAsunto[1].trim() : `Seguimiento Operativo: ${caseItem?.title || client?.name || ''}`;
  const body = matchCuerpo ? matchCuerpo.trim() : raw.replace(/ASUNTO:.+/i, '').trim();

  return { subject, body };
}

/**
 * 6. Detección de Riesgos y Casos Abandonados
 */
export interface CaseRiskAssessment {
  caseId: string;
  caseTitle: string;
  clientName: string;
  riskLevel: 'critical' | 'high' | 'medium';
  reasons: string[];
  suggestedAction: string;
  daysWithoutActivity: number;
}

export function detectAbandonedAndRiskCases(
  cases: Case[],
  commitments: Commitment[],
  tickets: Ticket[],
  clients: Client[]
): CaseRiskAssessment[] {
  const today = new Date().getTime();
  const activeCases = cases.filter((c) => c.status !== 'closed');
  const assessments: CaseRiskAssessment[] = [];

  for (const c of activeCases) {
    const reasons: string[] = [];
    let riskScore = 0;

    // Calcular días sin actividad basados en updated_at o created_at
    const lastActive = c.updated_at ? new Date(c.updated_at).getTime() : new Date(c.created_at).getTime();
    const daysIdle = Math.max(0, Math.floor((today - lastActive) / (1000 * 60 * 60 * 24)));

    if (daysIdle > 14) {
      reasons.push(`Inactivo por ${daysIdle} días sin actualizaciones.`);
      riskScore += 3;
    } else if (daysIdle > 7) {
      reasons.push(`Sin movimientos en los últimos ${daysIdle} días.`);
      riskScore += 1;
    }

    // Revisar compromisos vencidos
    const caseComms = commitments.filter((comm) => comm.case_id === c.id && comm.status !== 'done');
    const overdueComms = caseComms.filter((comm) => comm.due_date && new Date(comm.due_date).getTime() < today);
    if (overdueComms.length > 0) {
      reasons.push(`${overdueComms.length} compromiso(s) vencido(s) sin cerrar.`);
      riskScore += overdueComms.length * 2;
    }

    // Sin próxima acción
    if (!c.next_action?.description) {
      reasons.push('No tiene Próxima Acción definida (caso a la deriva).');
      riskScore += 2;
    }

    // Tickets críticos abiertos en el caso
    const critTickets = tickets.filter((t) => t.case_id === c.id && (t.priority === 'critical' || t.priority === 'high') && t.status !== 'closed' && t.status !== 'resolved');
    if (critTickets.length > 0) {
      reasons.push(`${critTickets.length} ticket(s) crítico(s) de soporte no resueltos.`);
      riskScore += 3;
    }

    if (riskScore >= 2) {
      const client = clients.find((cl) => cl.id === c.client_id)?.name || c.client_name || 'Cliente sin asignar';
      const riskLevel: 'critical' | 'high' | 'medium' = riskScore >= 5 ? 'critical' : riskScore >= 3 ? 'high' : 'medium';

      let suggestedAction = 'Revisar estado con el cliente y definir Próxima Acción.';
      if (overdueComms.length > 0) {
        suggestedAction = 'Exigir validación o reprogramar compromisos vencidos.';
      } else if (daysIdle > 14) {
        suggestedAction = 'Reactivar contacto formal o evaluar cierre de caso.';
      }

      assessments.push({
        caseId: c.id,
        caseTitle: c.title,
        clientName: client,
        riskLevel,
        reasons,
        suggestedAction,
        daysWithoutActivity: daysIdle,
      });
    }
  }

  return assessments.sort((a, b) => {
    const rank = { critical: 3, high: 2, medium: 1 };
    return rank[b.riskLevel] - rank[a.riskLevel];
  });
}

/**
 * 7. Casos Similares (TF-IDF y similitud semántica de palabras clave)
 */
export interface SimilarCaseResult {
  caseItem: Case;
  score: number; // 0 to 1
  matchingPoints: string[];
}

export function findSimilarCases(
  targetCase: Case,
  allCases: Case[],
  notes: Note[] = []
): SimilarCaseResult[] {
  const tokenize = (text: string) => {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
  };

  const targetWords = new Set([
    ...tokenize(targetCase.title),
    ...tokenize(targetCase.description || ''),
    ...(targetCase.client_name ? tokenize(targetCase.client_name) : []),
  ]);

  if (targetWords.size === 0) return [];

  const results: SimilarCaseResult[] = [];

  for (const c of allCases) {
    if (c.id === targetCase.id) continue;

    const cNotes = notes.filter((n) => n.case_id === c.id);
    const notesText = cNotes.map((n) => n.content).join(' ');

    const cWords = new Set([
      ...tokenize(c.title),
      ...tokenize(c.description || ''),
      ...(c.client_name ? tokenize(c.client_name) : []),
      ...tokenize(notesText),
    ]);

    const matching: string[] = [];
    let matchCount = 0;

    targetWords.forEach((word) => {
      if (cWords.has(word)) {
        matchCount++;
        if (matching.length < 4) matching.push(word);
      }
    });

    // Client match gives strong boost
    if (c.client_id === targetCase.client_id && targetCase.client_id) {
      matchCount += 3;
      matching.unshift('Mismo cliente');
    }

    if (matchCount > 0) {
      const score = Math.min(1, matchCount / (targetWords.size + 1));
      if (score >= 0.15) {
        results.push({
          caseItem: c,
          score: Math.round(score * 100) / 100,
          matchingPoints: matching,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * 8. Q&A sobre tu información operacional
 */
export async function askCopilotQnA(
  question: string,
  history: CopilotMessage[],
  data: WorkDeskContextData,
  config: AIConfig
): Promise<string> {
  const workDeskCtx = buildWorkDeskContext(data);

  const systemContext = `Eres WorkDesk AI Copilot, el asistente personal inteligente del consultor. Tienes acceso completo a toda la base de datos viva de WorkDesk (casos, compromisos, clientes, tickets, inbox).
Tu labor es responder con máxima precisión sobre los datos, hacer análisis cruzados, identificar riesgos y proponer acciones concretas.
Sé asertivo, profesional y utiliza Markdown para dar respuestas fáciles de leer (viñetas, negritas, tablas si aplica). Si te piden algo que no está en el contexto, dilo claramente.

CONTEXTO VIVO DE WORKDESK:
${workDeskCtx}
`;

  let prompt = '';
  if (history.length > 0) {
    prompt += `HISTORIAL RECIENTE DE LA CONVERSACIÓN:\n`;
    history.slice(-4).forEach((m) => {
      prompt += `${m.sender.toUpperCase()}: ${m.content}\n`;
    });
    prompt += `\n`;
  }
  prompt += `USUARIO: ${question}\nCOPILOT:`;

  return callAI(prompt, systemContext, config, 0.3);
}
