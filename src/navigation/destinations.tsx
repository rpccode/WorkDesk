import type { ReactNode } from 'react';
import {
  Sun,
  Inbox,
  Clock,
  Briefcase,
  CheckSquare,
  Tag,
  Users,
  Calendar,
  TrendingUp,
  FileBarChart2,
  Mail,
  FileText,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import type { ActiveTab } from '../types';

/**
 * Registro único de destinos de la aplicación.
 *
 * Antes, el mismo destino aparecía con nombres distintos en tres capas
 * (sidebar, Command Center y título de vista), y el Command Center solo
 * cubría 8 de los 14 destinos. Este módulo es la única fuente de verdad:
 * la navegación, el Command Center y los encabezados de página leen de aquí.
 */

export type NavSection = 'Operaciones' | 'Gestión' | 'Producción' | 'Consulta';

export interface Destination {
  id: ActiveTab;
  /** Nombre canónico. Es el mismo en sidebar, Command Center y encabezado. */
  label: string;
  /** Descripción breve: útil en el Command Center y como subtítulo de página. */
  summary: string;
  icon: ReactNode;
  section: NavSection;
  /** Oculta el destino del sidebar (se conserva accesible por atajo o enlace). */
  hiddenInSidebar?: boolean;
}

const icon = (node: ReactNode) => node;

export const DESTINATIONS: Destination[] = [
  {
    id: 'my_day',
    label: 'Mi Día',
    summary: 'Tu jornada: qué vence, qué está bloqueado y qué sigue',
    icon: icon(<Sun size={17} />),
    section: 'Operaciones',
  },
  {
    id: 'inbox',
    label: 'Bandeja',
    summary: 'Captura ideas sin clasificar y conviértelas en caso, compromiso o nota',
    icon: icon(<Inbox size={17} />),
    section: 'Operaciones',
  },
  {
    id: 'waiting_on',
    label: 'Esperando de Otros',
    summary: 'Compromisos bloqueados por clientes o terceros',
    icon: icon(<Clock size={17} />),
    section: 'Operaciones',
  },
  {
    id: 'cases',
    label: 'Casos & Proyectos',
    summary: 'Directorio y seguimiento de casos',
    icon: icon(<Briefcase size={17} />),
    section: 'Gestión',
  },
  {
    id: 'commitments',
    label: 'Compromisos',
    summary: 'Tus plazos y lo que te deben responder',
    icon: icon(<CheckSquare size={17} />),
    section: 'Gestión',
  },
  {
    id: 'tickets',
    label: 'Tickets & Soporte',
    summary: 'Incidencias con SLA y carga masiva',
    icon: icon(<Tag size={17} />),
    section: 'Gestión',
  },
  {
    id: 'clients',
    label: 'Clientes',
    summary: 'Cartera, complejidad y salud de cada cuenta',
    icon: icon(<Users size={17} />),
    section: 'Gestión',
  },
  {
    id: 'emails',
    label: 'Correos',
    summary: 'Redacta y envía correo con plantillas o con IA',
    icon: icon(<Mail size={17} />),
    section: 'Producción',
  },
  {
    id: 'reports',
    label: 'Documentos & Word',
    summary: 'Plantillas, minutas y documentos generados',
    icon: icon(<FileBarChart2 size={17} />),
    section: 'Producción',
  },
  {
    id: 'notes',
    label: 'Notas & Bitácora',
    summary: 'Bitácora libre vinculada a un caso',
    icon: icon(<FileText size={17} />),
    section: 'Producción',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    summary: 'Agenda de compromisos y seguimientos',
    icon: icon(<Calendar size={17} />),
    section: 'Consulta',
  },
  {
    id: 'analytics',
    label: 'Analíticas & SLA',
    summary: 'Productividad, cuellos de botella y riesgo de abandono',
    icon: icon(<TrendingUp size={17} />),
    section: 'Consulta',
  },
  {
    id: 'dashboard',
    label: 'Resumen',
    summary: 'Visión ejecutiva de compromisos, casos y entregables',
    icon: icon(<LayoutDashboard size={17} />),
    section: 'Consulta',
  },
  {
    id: 'settings',
    label: 'Configuración',
    summary: 'Perfil, IA, notificaciones, apariencia y datos',
    icon: icon(<Settings size={17} />),
    section: 'Consulta',
  },
];

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

/** Destino por id. Lanza si el id no existe: es un error de desarrollo. */
export function destinationOf(id: ActiveTab): Destination {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Destino desconocido: ${id}`);
  return d;
}

/** Nombre canónico de un destino (para títulos de página y etiquetas). */
export function labelOf(id: ActiveTab): string {
  return destinationOf(id).label;
}

/** Descripción canónica de un destino (para subtítulos de página). */
export function summaryOf(id: ActiveTab): string {
  return destinationOf(id).summary;
}
