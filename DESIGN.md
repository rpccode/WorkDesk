# WorkDesk Design System & Guidelines (DESIGN.md)

Este documento define el sistema de diseño, directrices de experiencia de usuario (UX), tokens visuales, tipografía, paletas de color y patrones de componentes de **WorkDesk**.

---

## 🎨 Principios Visuales y Experiencia

1. **Eficiencia y Claridad Operativa:** El usuario es un consultor/operador trabajando bajo presión. La información crítica (compromisos vencidos, clientes que deben responder, casos bloqueados) debe ser inmediatamente distinguible en menos de 2 segundos.
2. **Arquitectura Dual de Temas (Light / Dark):**
   - **Modo Claro (Default):** Superficies limpias y nítidas (`#f0f4f8` → `#ffffff` → `#f8fafc`) con contraste AA/AAA para trabajo prolongado bajo luz natural.
   - **Modo Oscuro (Slate Pro):** Superficies escalonadas de pizarra (`#0b0f19` → `#111827` → `#1a2234`) con glassmorphism sutil y bordes nítidos (`#1f293d`).
3. **No Slop:** Prohibidos los degradados morados genéricos de plantillas de IA, las tarjetas centradas sin jerarquía o los emojis como elementos decorativos estructurales.
4. **Wayfinding Claro:** Barra lateral persistente con estados activos resaltados mediante `--accent-primary` (por defecto Azul Cobalto `#2563eb`), etiquetas concisas y contadores badge dinámicos con soporte tabular.
5. **Respeto a la Accesibilidad:** Indicadores de foco inequívocos (`focus-visible`), navegación por teclado, soporte de `prefers-reduced-motion` y targets interactivos ergonómicos.

---

## 🔠 Tipografía

- **Familia tipográfica principal:** `Plus Jakarta Sans`, system-ui, `-apple-system`, `sans-serif` (geométrica, moderna, altamente legible).
- **Código / Cifras / Fechas:** `JetBrains Mono`, `monospace`.
- **Reglas:**
  - `text-wrap: balance` en títulos `h1`-`h4`.
  - `font-variant-numeric: tabular-nums` (clase `.tabular-nums`) para fechas, contadores y métricas KPI para evitar temblores en la UI.
  - Altura de línea: `1.5` para cuerpo de texto, `1.25` para encabezados.

---

## 🌈 Paleta de Colores & Tokens

### Tokens de Superficie y Texto

| Token | Modo Claro (Default) | Modo Oscuro (`[data-theme="dark"]`) | Uso |
|---|---|---|---|
| `--bg-main` | `#f0f4f8` | `#0b0f19` | Fondo principal de la ventana de la aplicación |
| `--bg-surface` | `#ffffff` | `#111827` | Sidebar, modales y tarjetas base |
| `--bg-surface-elevated` | `#f8fafc` | `#1a2234` | Inputs, dropdowns, tablas header y tarjetas secundarias |
| `--bg-surface-hover` | `#eef2f7` | `#222d42` | Estado hover de navegación, filas de tabla e items |
| `--bg-overlay` | `rgba(15, 23, 42, 0.45)` | `rgba(3, 7, 18, 0.72)` | Fondo atenuado de modales y drawers |
| `--border-subtle` | `#e2e8f0` | `#1f293d` | Bordes divisorios sutiles |
| `--border-medium` | `#cbd5e1` | `#2d3b55` | Bordes de control e inputs en reposo |
| `--border-focus` | `#3b82f6` | `#3b82f6` | Anillo de foco de accesibilidad |
| `--text-primary` | `#0f172a` | `#f8fafc` | Títulos, encabezados y texto principal |
| `--text-secondary` | `#475569` | `#94a3b8` | Subtítulos, metadatos y descripciones |
| `--text-muted` | `#94a3b8` | `#64748b` | Placeholders, timestamps e indicadores |

### Tokens Semánticos de Estado

| Estado | Token Color | Fondo Semántico | Uso |
|---|---|---|---|
| **Critical** | `--status-critical` (`#dc2626` / `#ef4444`) | `--status-critical-bg` | Vencidos, bloqueos, prioridad alta/crítica |
| **High** | `--status-high` (`#ea580c` / `#f97316`) | `--status-high-bg` | Casos de alta prioridad |
| **Medium** | `--status-medium` (`#d97706` / `#eab308`) | `--status-medium-bg` | Esperando respuesta de cliente o terceros |
| **Low / Success** | `--status-low` (`#059669` / `#10b981`) | `--status-low-bg` | Éxito, completados, baja urgencia |

---

## 📐 Escala de Espaciado y Radios

- **Radios:**
  - Badges y chips: `var(--radius-xs)` = `4px`, `var(--radius-sm)` = `6px`
  - Inputs y botones: `var(--radius-md)` = `10px`
  - Tarjetas y contenedores: `var(--radius-lg)` = `14px`
  - Modales y paneles: `var(--radius-xl)` = `20px`
- **Contraste de interacción:**
  - Botones y campos con `focus-visible` ring de 2px nítido.
  - Hover states con micro-elevación suave (`translateY(-1px)` en `.btn-*`, `translateY(-2px)` en `.card-hover`).
  - Animaciones no bloqueantes con curva cúbica suave `cubic-bezier(0.16, 1, 0.3, 1)`.

---

## ⚡ Patrones y Estructuras Estandarizadas

1. **Estructura de Vistas:** Toda vista debe usar `.page-container` > `.page-header` > `.toolbar` > cuerpo principal (tablas `.table-wrapper` o grids `.kpi-grid`).
2. **Estados Obligatorios:** Implementar explícitamente estados:
   - **Loading:** `.skeleton` con animación de brillo suave.
   - **Empty:** `.empty-state` con ícono al 35% de opacidad, texto explicativo y botón de acción principal.
   - **Error:** Tarjeta de error con opción de reintentar.
3. **Modales y Drawers:** Foco accesible, tecla `Escape` para cerrar, títulos claros y botón de cierre en esquina superior derecha.
4. **Atajo Global:** `Alt+N` / `Ctrl+Alt+N` abre el modal de captura rápida en cualquier vista.
