# WorkDesk — Sistema de Diseño (DESIGN.md)

Este documento describe el sistema de diseño **tal como está implementado** en `src/`. Cuando el código y este documento discrepan, el código es la fuente de verdad y este documento queda pendiente de actualizar.

Última verificación contra el código: 2026-11-11.

---

## 1. Principios

1. **Eficiencia operativa primero.** El usuario es un consultor que trabaja bajo presión. La información crítica (compromisos vencidos, clientes que deben responder, casos bloqueados) debe ser distinguible en menos de 2 segundos.
2. **Un solo sistema de estado.** La prioridad y el estado se codifican con el sistema de badges (`badge-critical`, `badge-high`, `badge-medium`, `badge-low`, `badge-neutral`) y con los tokens `--status-*`. No hay codificaciones paralelas: ni emoji como portador de estado, ni degradados morados, ni bordes de acento gruesos en el lateral de las tarjetas.
3. **Accesibilidad por defecto (WCAG 2.1 AA).** Todo texto funcional cumple 4.5:1 sobre su superficie; todo control tiene nombre accesible; los diálogos atrapan y devuelven el foco.
4. **Antiguo ruido.** El sistema es sobrio a propósito: un solo acento cromático (azul cobalto), superficies escalonadas, elevaciones neutras. El color y la jerarquía se ganan con contraste y peso, no con adornos.
5. **Sin estado invisible.** Carga, error y datos obsoletos se comunican siempre. El usuario nunca debe dudar si lo que ve es actual.

---

## 2. Arquitectura Dual de Temas

Ambos modos se prueban sobre el mismo conjunto de tokens; los componentes leen variables, nunca literales.

| Superficie | Claro (default) | Oscuro (`[data-theme="dark"]`) |
|---|---|---|
| `--bg-main` | `#f0f4f8` | `#0b0f19` |
| `--bg-surface` | `#ffffff` | `#111827` |
| `--bg-surface-elevated` | `#f8fafc` | `#1a2234` |
| `--bg-surface-hover` | `#eef2f7` | `#222d42` |
| `--bg-overlay` | `rgba(15, 23, 42, 0.45)` | `rgba(3, 7, 18, 0.72)` |
| `--border-subtle` | `#e2e8f0` | `#1f293d` |
| `--border-medium` | `#cbd5e1` | `#2d3b55` |
| `--border-focus` | `#3b82f6` | `#3b82f6` |
| `--text-primary` | `#0f172a` | `#f8fafc` |
| `--text-secondary` | `#475569` | `#a3b3c7` |
| `--text-muted` | `#5b6b80` | `#7d8ea3` |
| `--text-disabled` | `#cbd5e1` | `#475569` |

**Contrastes verificados del texto muted:** `#5b6b80` → 4.91:1 sobre `--bg-main`, 5.43:1 sobre `--bg-surface`. `#7d8ea3` → 5.30:1 sobre `--bg-surface` oscuro.

### Acento

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--accent-primary` | `#2563eb` | igual | Acción principal, enlaces, foco |
| `--accent-primary-hover` | `#1d4ed8` | igual | Hover del botón primario |
| `--accent-glow` | `rgba(37, 99, 235, 0.12)` | igual | Tintes de fondo, resplandor |
| `--accent-glow-strong` | `rgba(37, 99, 235, 0.22)` | igual | Resplandor reforzado |
| `--accent-border` | `rgba(37, 99, 235, 0.30)` | igual | Bordes de acento |
| `--accent-primary-text` | `#1d4ed8` | `#60a5fa` | **Texto** de acento (6.70:1 / 6.98:1 sobre superficie) |
| `--accent-primary-strong` | `#1e40af` | `#93c5fd` | Acento sobre tinte compuesto (5.50:1 / 7.86:1) |

**No hay segundo color de acento.** El violeta (`#92400e`/`rgba(147,51,234,…)`) se eliminó del código: era el patrón visual más reconocible de interfaz generada por IA y competía con el azul por atención.

### Estados

| Estado | Claro | Oscuro | Fondo |
|---|---|---|---|
| Critical | `#dc2626` | `#ef4444` | `--status-critical-bg` |
| High | `#ea580c` | `#fb923c` | `--status-high-bg` |
| Medium | `#b45309` | `#fbbf24` | `--status-medium-bg` |
| Low / Success | `#047857` | `#34d399` | `--status-low-bg` |

`--status-medium` usa `#b45309` (5.02:1 sobre superficie clara) porque `#d97706` se quedaba en 3.19:1 y no cumplía AA.

### Tokens de texto por estado

Los tokens base (`--status-critical`, `--accent-primary`, …) se usan para **bordes, iconos y superficies**. Para **texto** existen variantes propias, porque el mismo tinte que sirve de fondo degrada el color cuando se usa como tinta:

| Token | Claro | Oscuro | Contraste verificado |
|---|---|---|---|
| `--status-critical-text` | `#b91c1c` | `#f87171` | 6.47:1 / 5.66:1 sobre tinte |
| `--status-high-text` | `#9a3412` | `#fb923c` | 7.31:1 / 6.44:1 sobre tinte |
| `--status-medium-text` | `#92400e` | `#fbbf24` | 7.09:1 / 6.28:1 sobre tinte |
| `--status-low-text` | `#065f46` | `#34d399` | 7.68:1 / 6.77:1 sobre tinte |
| `--accent-primary-text` | `#1d4ed8` | `#60a5fa` | 6.70:1 / 5.93:1 sobre tinte |

Regla: **si un color de estado o acento se aplica como `color:` de texto, se usa la variante `-text`;** la base queda para `border`, `background` y trazo de icono. Sobre superficies oscuras fijas (widget de escritorio, fila de totales de Clientes) existen `--status-critical-on-dark`, `--accent-primary-on-dark` y `--status-critical-strong-on-dark`, que no cambian con el tema.

---

## 3. Tipografía

- **Familia principal:** `Plus Jakarta Sans` (Google Fonts), con `system-ui` como respaldo.
- **Cifras y código:** `JetBrains Mono` (`var(--font-mono)`), aplicado a folios de ticket, identificadores y logs.
- **Cifras tabulares:** `.tabular-nums` en métricas, contadores y fechas.
- `text-wrap: balance` en encabezados; altura de línea 1.5 en cuerpo, 1.25 en encabezados.

### Piso tipográfico

**Ningún texto funcional baja de 11 px.** Los estilos inline del código están normalizados a `0.69rem` / `0.7rem` como mínimo. Los micro-texto por debajo de ese umbral (9.6–10.5 px) ilegibles en pantallas de alta densidad y en zoom son un fallo de calidad, no una elección de estilo.

---

## 4. Espaciado, Radios y Elevación

- **Radios:** `--radius-xs` 4px · `--radius-sm` 6px · `--radius-md` 10px · `--radius-lg` 14px · `--radius-xl` 20px · `--radius-full` 9999px.
- **Elevación neutra:** `--shadow-xs` → `--shadow-lg` son sombras grises, sin tinte cromático.
- **Elevación con acento:** `--shadow-glow` y `--shadow-glow-strong` son `0 2px 12px` / `0 4px 18px` — **desplazadas, nunca un halo de 0 px**. Un halo cromático de desplazamiento cero es el tell visual de interfaz generada por IA.
- Transiciones: `--transition-fast` 0.12s · `--transition-base` 0.2s · `--transition-slow` 0.35s, con `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion: reduce` anula animaciones, transiciones y scroll.

---

## 5. Patrones y Estructura

### Estructura de vista

Toda vista sigue esta jerarquía:

```
.page-container            → flex column, gap 1.25rem, width 100%
  .page-header              → título + subtitle | .page-actions
    .page-title-group       → .page-title + .page-subtitle
  .toolbar                  → búsqueda + filtros + contador
  contenido                 → .table-wrapper, .kpi-grid o rejillas de .glass-card
```

### Componentes base

| Clase | Rol |
|---|---|
| `.glass-card` | Contenedor base de tarjeta, con `backdrop-filter` y borde sutil |
| `.card-hover` | Elevación al pasar el cursor (`translateY(-2px)`) |
| `.kpi-card` / `.kpi-grid` | Métricas; el acento cromático va en el número, no en una franja |
| `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` / `.btn-success` | Jerarquía de acciones |
| `.badge` + `.badge-{critical,high,medium,low,neutral}` | **Único** sistema de codificación de estado |
| `.table-wrapper` / `table.data-table` | Tablas de datos con cabecera en superficie elevada |
| `.empty-state` (+ `-icon`, `-title`, `-desc`) | Estado sin datos |
| `.skeleton` (+ `-text`, `-circle`) | Estado de carga |
| `.form-group` / `.form-label` / `.form-hint` / `.form-error` | Campos de formulario |
| `.nav-item` / `.nav-badge` | Navegación lateral |
| `.modal-overlay` / `.modal-panel` | Diálogos |
| `.text-ellipsis` | Truncado de una línea |

### Estados obligatorios

| Estado | Implementación |
|---|---|
| **Loading** | `.skeleton` (`SkeletonRows`, `SkeletonKpiGrid` en `src/components/LoadingSkeletons.tsx`), accionado por los flags `isLoading*` del store |
| **Vacío** | `.empty-state` con icono al 35 % de opacidad, título explicativo y acción principal |
| **Error** | `ErrorBoundary` con reintento, descarga del log y copia; mensajes de formulario traducidos a lenguaje accionable (`src/utils/error-messages.ts`) |
| **Datos obsoletos** | `StaleDataBanner`: avisa que se está mostrando la caché local e ofrece reintentar |

### Diálogos

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (o `aria-label`).
- **Focus trap real** mediante `src/hooks/useFocusTrap.ts`: el foco no sale del diálogo y se restaura al elemento que lo abrió al cerrar.
- `Escape` cierra. `tabIndex={-1}` en el contenedor.
- Etiquetas de formulario asociadas por `id`/`htmlFor`; los campos obligatorios llevan `required` + `aria-required="true"`; los que fallan la validación llevan `aria-invalid="true"` + `aria-describedby` apuntando al mensaje de error.

### Controles de filtro

Las barras de filtro de las 12 vistas (búsqueda, selects de estado/prioridad/categoría/responsable, fechas) tienen **nombre accesible propio**:

- Selects con rótulo visible → el rótulo es `<label htmlFor>` y el control lleva `id`.
- Selects sin rótulo visible → `aria-label` descriptivo.
- Búsquedas → `aria-label` con el criterio de búsqueda.

Regla: **ningún control de entrada queda sin nombre accesible**, incluidos los selects de tabla y los campos de formularios internos.

### Notificaciones

`LiveToastContainer` apila como máximo **2 toasts visibles** en una **banda reservada** al pie del área de contenido (`variant="inline"`); el excedente se resume en un contador que abre el Centro de Alertas. El mini-widget, que ocupa toda la ventana, usa `variant="overlay"`.

La banda vive **en el flujo del layout**, no como `position: fixed` flotante:

- **Nunca** se superpone a tablas, cabeceras ni acciones primarias.
- **Nunca** tapa un modal: el overlay del diálogo va por encima y el toast permanece legible detrás.
- El límite de 2 visibles evita que el stack crezca hacia el centro de la pantalla.

---

## 6. Reglas de prohibición (no hacer)

- ❌ **Emoji como portador de estado.** La prioridad se codifica con badges y tokens, no con 🔴🟠🟡🟢.
- ❌ **Degradados morados o violeta.** Un solo acento cromático: azul cobalto.
- ❌ **Borde de acento grueso en el lateral de una tarjeta** (`border-left: 3-4px`). El estado se marca con fondo tintado + borde completo de 1 px.
- ❌ **Halo cromático de desplazamiento cero** (`0 0 20px rgba(...)`). La elevación con acento va desplazada.
- ❌ **Texto funcional por debajo de 11 px.**
- ❌ **Color como único canal de estado** en contenido crítico: siempre acompaña texto o icono.
- ❌ **Timestamps ISO crudos** (`2026-11-04T17:47:23.991Z`) en pantalla. Usar `formatDate` / `formatDateTime` / `formatRelativeDate` de `src/utils/date.ts`.
- ❌ **Errores técnicos crudos** al usuario. Traducir con `toUserMessage`; el detalle va al log.
- ❌ **`aria-modal="true"` sin focus trap.** Es peor que no declararlo.
- ❌ **Token de estado o acento aplicado como `color:` de texto.** Usar la variante `-text`; la base es para bordes y superficies.
- ❌ **Toast flotante sobre el contenido** (`position: fixed` en la esquina). Va en su banda reservada.
- ❌ **Elemento de navegación que desborda su contenedor** y queda cortado bajo el CTA. El nav lateral es `flex: 1` con `min-height: 0` y un degradado de desvanecido que hace legible el corte como scroll.

---

## 7. Tokens y convenciones de código

- Todo color, espaciado y radio sale de `src/index.css`. **No usar literales `rgba()`/`#hex` en TSX** salvo dentro de `src/index.css`.
- Toda llamada nativa pasa por `src/api/tauri.ts`.
- El estado vive en `src/store/index.ts` (Zustand) y cachea en `localStorage`.
- Tipos centrales en `src/types/index.ts`.
- Pruebas unitarias en `tests/unit/*.test.ts` (`npx vitest run`).

---

## 8. Verificación

```bash
npm run build       # tsc + vite build
npx vitest run      # suite unitaria
npx impeccable detect --json src public   # detección de antipatrones
```

### Medición de contraste

La detección por composición de CSS produce **falsos positivos sistemáticos** en superficies con `backdrop-filter` o gradiente (lee el gradiente como color plano). La cifra fiable es el **muestreo de píxeles renderizados**: se calcula el color de texto compuesto con su opacidad sobre el color de fondo realmente pintado en el DOM.

Verificación de la ronda 2026-11-11 (14 vistas × 2 temas, 667 textos por tema): **0 fallos AA** con muestreo de píxeles. El detector estático reporta 12 `low-contrast` residuales, todos confirmados como falsos positivos por gradiente/blur.

---
