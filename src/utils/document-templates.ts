import type { Client, Case, Commitment, ConsultantProfile } from '../types';

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Diagnóstico' | 'Minutas' | 'Propuestas' | 'Cierre' | 'Cartas' | 'Personalizado';
  content: string;
  htmlContent?: string;      // Original Word HTML content (from .docx upload)
  isHtmlFormat?: boolean;    // True when template was imported from Word
  isDefault?: boolean;
  createdAt?: string;
}

export interface AvailableToken {
  token: string;
  label: string;
  description: string;
  group: 'Cliente' | 'Caso' | 'Consultor' | 'Tablas' | 'General';
}

export const AVAILABLE_TOKENS: AvailableToken[] = [
  // Cliente
  { token: '{{cliente_nombre}}', label: 'Nombre Cliente', description: 'Nombre del contacto u organización', group: 'Cliente' },
  { token: '{{cliente_empresa}}', label: 'Empresa', description: 'Razón social de la empresa', group: 'Cliente' },
  { token: '{{cliente_categoria}}', label: 'Categoría/Rubro', description: 'Financiera, Cooperativa, Administrativo, etc.', group: 'Cliente' },
  { token: '{{cliente_complejidad_evaluada}}', label: 'Comp. Evaluada', description: 'Alta, Media o Baja', group: 'Cliente' },
  { token: '{{cliente_complejidad_ponderada}}', label: 'Comp. Ponderada', description: 'Alta, Media o Baja', group: 'Cliente' },
  { token: '{{cliente_ticket_promedio}}', label: 'Ticket Promedio', description: 'Casos/mes estimados', group: 'Cliente' },
  { token: '{{cliente_sucursales}}', label: 'Sucursales', description: 'Cantidad de sedes', group: 'Cliente' },
  { token: '{{cliente_empleados}}', label: 'Empleados', description: 'Dotación de personal', group: 'Cliente' },
  { token: '{{cliente_sistemas}}', label: 'Sistemas', description: 'Cantidad de plataformas', group: 'Cliente' },
  { token: '{{cliente_depto_ti}}', label: 'Depto. TI', description: 'Posee Depto de TI (Sí / No)', group: 'Cliente' },
  { token: '{{cliente_email}}', label: 'Email Cliente', description: 'Correo electrónico de contacto', group: 'Cliente' },
  { token: '{{cliente_telefono}}', label: 'Teléfono Cliente', description: 'Teléfono o WhatsApp de contacto', group: 'Cliente' },

  // Caso
  { token: '{{caso_titulo}}', label: 'Título del Caso', description: 'Asunto o nombre del proyecto', group: 'Caso' },
  { token: '{{caso_descripcion}}', label: 'Descripción Caso', description: 'Detalle del alcance del caso', group: 'Caso' },
  { token: '{{caso_prioridad}}', label: 'Prioridad', description: 'Crítica, Alta, Media o Baja', group: 'Caso' },
  { token: '{{caso_estado}}', label: 'Estado del Caso', description: 'Abierto, En Progreso, Espera o Cerrado', group: 'Caso' },
  { token: '{{caso_fecha_creacion}}', label: 'Fecha Inicio Caso', description: 'Fecha de apertura del caso', group: 'Caso' },

  // Consultor
  { token: '{{consultor_nombre}}', label: 'Nombre Consultor', description: 'Tu nombre completo', group: 'Consultor' },
  { token: '{{consultor_cargo}}', label: 'Cargo', description: 'Tu puesto o especialidad', group: 'Consultor' },
  { token: '{{consultor_empresa}}', label: 'Firma Consultora', description: 'Nombre de tu firma o empresa', group: 'Consultor' },
  { token: '{{consultor_email}}', label: 'Email Consultor', description: 'Correo del consultor', group: 'Consultor' },
  { token: '{{consultor_telefono}}', label: 'Teléfono Consultor', description: 'Teléfono del consultor', group: 'Consultor' },
  { token: '{{firma_consultor}}', label: 'Bloque de Firma', description: 'Firma formal con datos del consultor', group: 'Consultor' },

  // Tablas & Bloques
  { token: '{{tabla_compromisos}}', label: 'Tabla Compromisos', description: 'Lista formateada de compromisos y plazos', group: 'Tablas' },
  { token: '{{matriz_diagnostico}}', label: 'Ficha Diagnóstico', description: 'Resumen corporativo del cliente en tabla', group: 'Tablas' },

  // General
  { token: '{{fecha_actual}}', label: 'Fecha Actual', description: 'Fecha de emisión en formato formal', group: 'General' },
  { token: '{{ano_actual}}', label: 'Año Actual', description: 'Año de emisión (ej. 2026)', group: 'General' },
];

export const DEFAULT_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tmpl-diagnostico',
    title: 'Informe de Diagnóstico & Matriz de Complejidad',
    description: 'Dictamen técnico con evaluación de complejidad, infraestructura y recomendaciones.',
    category: 'Diagnóstico',
    isDefault: true,
    content: `# INFORME DE DIAGNÓSTICO OPERATIVO Y MATRIZ DE COMPLEJIDAD

**Cliente:** {{cliente_nombre}} ({{cliente_empresa}})
**Fecha de Emisión:** {{fecha_actual}}
**Consultor Responsable:** {{consultor_nombre}} — {{consultor_cargo}}
**Firma:** {{consultor_empresa}}

---

## 1. RESUMEN EJECUTIVO

El presente informe consolida el diagnóstico operativo y técnico realizado para la cuenta **{{cliente_nombre}}**, con el propósito de establecer los lineamientos de atención, nivel de soporte requerido y plan de optimización de sistemas.

### 1.1 Ficha de Diagnóstico Corporativo

{{matriz_diagnostico}}

---

## 2. EVALUACIÓN DE COMPLEJIDAD

- **Nivel de Complejidad Evaluada:** {{cliente_complejidad_evaluada}}
- **Nivel de Complejidad Ponderada:** {{cliente_complejidad_ponderada}}
- **Promedio de Casos/Tickets Mensuales Estimados:** {{cliente_ticket_promedio}}
- **Infraestructura de Soporte Interno:** {{cliente_depto_ti}} cuenta con Departamento de TI propio.

### 2.1 Análisis de Impacto Organizacional
Con una dotación de **{{cliente_empleados}} colaboradores** distribuidos en **{{cliente_sucursales}} sede(s)** e interactuando con **{{cliente_sistemas}} plataforma(s)**, la operación requiere un esquema de atención estructurado para asegurar la continuidad del negocio y el cumplimiento de los acuerdos de nivel de servicio (SLA).

---

## 3. PLAN DE TRABAJO & COMPROMISOS ASOCIADOS

{{tabla_compromisos}}

---

## 4. CONCLUSIONES Y RECOMENDACIONES

1. Mantener reuniones periódicas de seguimiento y revisión de tickets críticos.
2. Centralizar las solicitudes a través de los canales oficiales acordados.
3. Asegurar la contraparte técnica local para la validación oportuna de requerimientos.

---

{{firma_consultor}}
`,
  },
  {
    id: 'tmpl-minuta',
    title: 'Minuta Ejecutiva de Reunión y Acuerdos',
    description: 'Registro formal de sesión de trabajo, objetivos tratados y compromisos asignados con fecha.',
    category: 'Minutas',
    isDefault: true,
    content: `# MINUTA EJECUTIVA DE REUNIÓN Y ACUERDOS

**Proyecto / Caso:** {{caso_titulo}}
**Cliente:** {{cliente_nombre}} ({{cliente_empresa}})
**Fecha de Sesión:** {{fecha_actual}}
**Facilitador:** {{consultor_nombre}} ({{consultor_cargo}})

---

## 1. OBJETIVO DE LA SESIÓN

Revisión de avances, definición de prioridades y establecimiento de acuerdos sobre: **{{caso_titulo}}**.

**Estado del Caso:** {{caso_estado}} | **Prioridad:** {{caso_prioridad}}

---

## 2. TEMAS TRATADOS

- Revisión del estado actual del requerimiento y validación de antecedentes.
- Análisis de impacto en la operación del cliente (**{{cliente_categoria}}**).
- Asignación de responsabilidades y fechas límite de entrega.

---

## 3. TABLA DE ACUERDOS Y COMPROMISOS

{{tabla_compromisos}}

---

## 4. PRÓXIMOS PASOS

- Las partes acuerdan verificar el cumplimiento de los compromisos en las fechas indicadas.
- Cualquier modificación a los plazos deberá notificarse por escrito al consultor responsable.

---

{{firma_consultor}}
`,
  },
  {
    id: 'tmpl-propuesta',
    title: 'Propuesta Técnica & Plan de Trabajo',
    description: 'Documento de alcance, objetivos, entregables y condiciones de consultoría.',
    category: 'Propuestas',
    isDefault: true,
    content: `# PROPUESTA TÉCNICA Y PLAN DE CONSULTORÍA

**Requerimiento:** {{caso_titulo}}
**Preparado para:** {{cliente_nombre}} — {{cliente_empresa}}
**Fecha de Presentación:** {{fecha_actual}}
**Elaborado por:** {{consultor_nombre}} ({{consultor_cargo}})
**Organización:** {{consultor_empresa}}

---

## 1. ANTECEDENTES Y ALCANCE

A solicitud de **{{cliente_nombre}}**, se presenta la siguiente propuesta técnica orientada a resolver y optimizar los procesos vinculados a:

> **{{caso_titulo}}**
> {{caso_descripcion}}

---

## 2. PERFIL DE LA ORGANIZACIÓN

- **Sector / Categoría:** {{cliente_categoria}}
- **Sucursales Involucradas:** {{cliente_sucursales}}
- **Dotación Aproximada:** {{cliente_empleados}} empleados
- **Sistemas en Alcance:** {{cliente_sistemas}} plataforma(s)

---

## 3. CRONOGRAMA DE ENTREGABLES Y ACTIVIDADES

{{tabla_compromisos}}

---

## 4. CONDICIONES Y CONFORMIDAD

La aceptación de la presente propuesta da inicio a la ejecución del plan conforme al cronograma acordado.

---

{{firma_consultor}}
`,
  },
  {
    id: 'tmpl-cierre',
    title: 'Acta de Entrega & Cierre de Caso',
    description: 'Certificado formal de finalización de actividades y conformidad del cliente.',
    category: 'Cierre',
    isDefault: true,
    content: `# ACTA FORMAL DE ENTREGA Y CIERRE DE CASO

**Referencia:** {{caso_titulo}}
**Cliente:** {{cliente_nombre}} ({{cliente_empresa}})
**Fecha de Cierre:** {{fecha_actual}}
**Consultor Encargado:** {{consultor_nombre}} — {{consultor_cargo}}

---

## 1. DECLARACIÓN DE FINALIZACIÓN

Por medio de la presente se certifica que las actividades correspondientes al caso **"{{caso_titulo}}"** han sido ejecutadas en su totalidad conforme a los requerimientos pactados.

- **Prioridad Atendida:** {{caso_prioridad}}
- **Fecha de Apertura:** {{caso_fecha_creacion}}
- **Fecha de Conformidad:** {{fecha_actual}}

---

## 2. RESUMEN DE COMPROMISOS Y HITOS CUMPLIDOS

{{tabla_compromisos}}

---

## 3. CONSTANCIA DE CONFORMIDAD

El cliente **{{cliente_nombre}}** declara haber recibido a satisfacción los entregables y la documentación asociada.

---

**POR EL CLIENTE:**  
____________________________________  
{{cliente_nombre}}  
{{cliente_empresa}}  

**POR LA CONSULTORÍA:**  
____________________________________  
{{consultor_nombre}}  
{{consultor_cargo}} • {{consultor_empresa}}  
`,
  },
  {
    id: 'tmpl-carta',
    title: 'Carta Formal de Solicitud de Información',
    description: 'Comunicaciones formales solicitando accesos, datos o validaciones al cliente.',
    category: 'Cartas',
    isDefault: true,
    content: `{{fecha_actual}}

Señores
**{{cliente_nombre}}**
{{cliente_empresa}}
Presente.-

**Ref.: Solicitud de antecedentes para el caso "{{caso_titulo}}"**

Estimados señores:

Junto con saludarles cordialmente, me dirijo a ustedes en el marco de la consultoría en curso referente a **{{caso_titulo}}** (Prioridad: {{caso_prioridad}}).

Con el objetivo de avanzar oportunamente en los hitos comprometidos y dar cumplimiento a los plazos establecidos, solicitamos amablemente remitir los siguientes antecedentes técnicos a la brevedad:

1. Documentación de soporte y parámetros de configuración actual.
2. Accesos o credenciales de prueba requeridas para el análisis.
3. Validación de los puntos tratados en la última sesión.

Agradecemos de antemano su constante colaboración para el éxito de este proyecto.

Atentamente,

{{firma_consultor}}
`,
  },
];

const STORAGE_KEY = 'workdesk_custom_document_templates';

export function loadSavedDocumentTemplates(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DOCUMENT_TEMPLATES;
    const custom: DocumentTemplate[] = JSON.parse(raw);
    return [...DEFAULT_DOCUMENT_TEMPLATES, ...custom];
  } catch {
    return DEFAULT_DOCUMENT_TEMPLATES;
  }
}

export function saveCustomDocumentTemplate(tmpl: Omit<DocumentTemplate, 'id' | 'createdAt'>): DocumentTemplate {
  const newTmpl: DocumentTemplate = {
    ...tmpl,
    id: `tmpl-custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    isDefault: false,
  };

  const existingRaw = localStorage.getItem(STORAGE_KEY);
  const list: DocumentTemplate[] = existingRaw ? JSON.parse(existingRaw) : [];
  list.push(newTmpl);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return newTmpl;
}

export function deleteCustomDocumentTemplate(id: string): void {
  const existingRaw = localStorage.getItem(STORAGE_KEY);
  if (!existingRaw) return;
  const list: DocumentTemplate[] = JSON.parse(existingRaw);
  const updated = list.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateCustomDocumentTemplate(
  id: string,
  updates: Partial<Omit<DocumentTemplate, 'id' | 'createdAt'>>
): void {
  const existingRaw = localStorage.getItem(STORAGE_KEY);
  const list: DocumentTemplate[] = existingRaw ? JSON.parse(existingRaw) : [];
  const index = list.findIndex((t) => t.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } else {
    // If it was a default template, create a customized copy
    const def = DEFAULT_DOCUMENT_TEMPLATES.find((t) => t.id === id);
    if (def) {
      saveCustomDocumentTemplate({
        title: updates.title || def.title,
        description: updates.description || def.description,
        category: updates.category || def.category,
        content: updates.content !== undefined ? updates.content : def.content,
      });
    }
  }
}

/**
 * Injects dynamic data into template placeholders.
 */
export function injectTemplateTokens(
  templateContent: string,
  options: {
    client?: Client | null;
    currentCase?: Case | null;
    commitments?: Commitment[];
    consultantProfile: ConsultantProfile;
  }
): string {
  const { client, currentCase, commitments = [], consultantProfile } = options;

  const now = new Date();
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const fechaActual = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
  const anoActual = String(now.getFullYear());

  // Format commitments table in markdown
  let tablaCompromisos = '';
  if (commitments.length > 0) {
    tablaCompromisos = '| # | Descripción del Compromiso | Responsable | Vencimiento | Estado |\n| :--- | :--- | :--- | :--- | :--- |\n';
    commitments.forEach((c, idx) => {
      const ownerLabel = c.owner === 'me' ? 'Consultor' : c.owner === 'client' ? 'Cliente' : 'Tercero';
      const statusLabel = c.status === 'done' ? '✓ Completado' : c.status === 'overdue' ? '⚠ Vencido' : 'Pendiente';
      const dateLabel = c.due_date ? new Date(c.due_date).toLocaleDateString('es') : 'Sin fecha';
      tablaCompromisos += `| ${idx + 1} | ${c.description} | ${ownerLabel} | ${dateLabel} | ${statusLabel} |\n`;
    });
  } else {
    tablaCompromisos = '*No se registran compromisos pendientes para este caso.*';
  }

  // Format client diagnosis summary table
  let matrizDiagnostico = '';
  if (client) {
    matrizDiagnostico = `| Parámetro | Valor Evaluado |\n| :--- | :--- |\n` +
      `| **Cliente / Razón Social** | ${client.name} ${client.company ? `(${client.company})` : ''} |\n` +
      `| **Categoría / Rubro** | ${client.category || '—'} |\n` +
      `| **Complejidad Evaluada** | ${client.complexity_evaluated || '—'} |\n` +
      `| **Complejidad Ponderada** | ${client.complexity_weighted || '—'} |\n` +
      `| **Ticket Promedio** | ${client.ticket_avg !== undefined && client.ticket_avg !== null ? client.ticket_avg : '—'} |\n` +
      `| **Sucursales** | ${client.branches_count !== undefined && client.branches_count !== null ? client.branches_count : '—'} |\n` +
      `| **Dotación Empleados** | ${client.employees_count !== undefined && client.employees_count !== null ? client.employees_count.toLocaleString() : '—'} |\n` +
      `| **Cantidad de Sistemas** | ${client.systems_count !== undefined && client.systems_count !== null ? client.systems_count : '—'} |\n` +
      `| **Departamento de TI** | ${client.has_it_department === true ? 'Sí' : client.has_it_department === false ? 'No' : '—'} |`;
  } else {
    matrizDiagnostico = '*Selecciona un cliente para autocompletar la matriz de diagnóstico corporativo.*';
  }

  const firmaConsultor = `**${consultantProfile.name || 'Consultor Responsable'}**  \n` +
    `${consultantProfile.role_title || 'Consultor Especialista'} • ${consultantProfile.company || 'WorkDesk'}  \n` +
    `Email: ${consultantProfile.email || '—'} | Tel: ${consultantProfile.phone || '—'}`;

  // Replace map
  const replacements: Record<string, string> = {
    '{{cliente_nombre}}': client?.name || '[NOMBRE CLIENTE]',
    '{{cliente_empresa}}': client?.company || client?.name || '[EMPRESA]',
    '{{cliente_categoria}}': client?.category || 'No especificado',
    '{{cliente_complejidad_evaluada}}': client?.complexity_evaluated || 'No especificado',
    '{{cliente_complejidad_ponderada}}': client?.complexity_weighted || 'No especificado',
    '{{cliente_ticket_promedio}}': client?.ticket_avg !== undefined && client?.ticket_avg !== null ? String(client.ticket_avg) : '—',
    '{{cliente_sucursales}}': client?.branches_count !== undefined && client?.branches_count !== null ? String(client.branches_count) : '—',
    '{{cliente_empleados}}': client?.employees_count !== undefined && client?.employees_count !== null ? client.employees_count.toLocaleString() : '—',
    '{{cliente_sistemas}}': client?.systems_count !== undefined && client?.systems_count !== null ? String(client.systems_count) : '—',
    '{{cliente_depto_ti}}': client?.has_it_department === true ? 'Sí' : client?.has_it_department === false ? 'No' : 'No especificado',
    '{{cliente_email}}': client?.email || '[EMAIL CLIENTE]',
    '{{cliente_telefono}}': client?.phone || '[TELÉFONO CLIENTE]',

    '{{caso_titulo}}': currentCase?.title || '[TÍTULO DEL CASO]',
    '{{caso_descripcion}}': currentCase?.description || 'Sin descripción detallada',
    '{{caso_prioridad}}': currentCase?.priority === 'critical' ? 'Crítica' : currentCase?.priority === 'high' ? 'Alta' : currentCase?.priority === 'medium' ? 'Media' : 'Baja',
    '{{caso_estado}}': currentCase?.status === 'in_progress' ? 'En Progreso' : currentCase?.status === 'waiting' ? 'En Espera' : currentCase?.status === 'closed' ? 'Cerrado' : 'Abierto',
    '{{caso_fecha_creacion}}': currentCase?.created_at ? new Date(currentCase.created_at).toLocaleDateString('es') : fechaActual,

    '{{consultor_nombre}}': consultantProfile.name || 'Consultor Responsable',
    '{{consultor_cargo}}': consultantProfile.role_title || 'Consultor Especialista',
    '{{consultor_empresa}}': consultantProfile.company || 'WorkDesk Consulting',
    '{{consultor_email}}': consultantProfile.email || '',
    '{{consultor_telefono}}': consultantProfile.phone || '',
    '{{firma_consultor}}': firmaConsultor,

    '{{tabla_compromisos}}': tablaCompromisos,
    '{{matriz_diagnostico}}': matrizDiagnostico,

    '{{fecha_actual}}': fechaActual,
    '{{ano_actual}}': anoActual,
  };

  let rendered = templateContent;
  Object.entries(replacements).forEach(([token, val]) => {
    rendered = rendered.split(token).join(val);
  });

  return rendered;
}
