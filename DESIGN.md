# WorkDesk Design System & Guidelines (DESIGN.md)

Este documento define las reglas de diseño visual, tipografía, paleta de colores, jerarquía y patrones de componentes de **WorkDesk**.

---

## 🎨 Principios Visuales

1. **Eficiencia y Claridad Operativa:** El usuario es un consultor/operador trabajando bajo presión. La información crítica (compromisos vencidos, clientes que deben responder, casos bloqueados) debe ser inmediatamente distinguible en menos de 2 segundos.
2. **Estética Premium Slate/Dark:** Superficies oscuras escalonadas (`#0b0f19` → `#111827` → `#1a2234`) con glassmorphism sutil (`backdrop-filter: blur(12px)`) y bordes nítidos (`#1f293d`). Cero colores genéricos o saturación excesiva.
3. **No Slop:** Prohibidos los degradados morados genéricos de plantillas de IA, las tarjetas centradas sin jerarquía o los emojis como elementos decorativos estructurales.
4. **Wayfinding Claro:** Barra lateral persistente con estados activos resaltados en azul cobalto (`#3b82f6`), etiquetas concisas y contadores badge dinámicos.

---

## 🔠 Tipografía

- **Familia tipográfica principal:** `Plus Jakarta Sans`, `-apple-system`, `sans-serif` (moderna, geométrica pero legible).
- **Código / Cifras / Markdown:** `JetBrains Mono`, `monospace`.
- **Reglas:**
  - `text-wrap: balance` en títulos `h1`-`h4`.
  - `font-variant-numeric: tabular-nums` para fechas, contadores y métricas KPI para evitar temblores en la UI.
  - Altura de línea: `1.5` para cuerpo de texto, `1.2` para encabezados.

---

## 🌈 Paleta de Colores & Tokens

| Token | Hex / Valor | Uso |
|---|---|---|
| `--bg-main` | `#0b0f19` | Fondo principal de la ventana |
| `--bg-surface` | `#111827` | Sidebar y tarjetas base |
| `--bg-surface-elevated` | `#1a2234` | Tarjetas secundarias, inputs y dropdowns |
| `--bg-surface-hover` | `#222d42` | Estado hover de navegación e items |
| `--border-subtle` | `#1f293d` | Bordes y divisores sutiles |
| `--accent-primary` | `#3b82f6` | Azul cobalto de acción primaria y selección |
| `--status-critical` | `#ef4444` | Alertas de vencimiento, prioridad crítica, cerrar caso |
| `--status-high` | `#f97316` | Casos de alta prioridad |
| `--status-medium` | `#eab308` | Casos medios, esperando a terceros |
| `--status-low` | `#10b981` | Casos completados, baja prioridad, éxito |

---

## 📐 Escala de Espaciado y Radios

- **Radios:**
  - Inputs y botones: `var(--radius-md)` = `10px`
  - Tarjetas y contenedores: `var(--radius-lg)` = `14px`
  - Badges y chips: `var(--radius-sm)` = `6px`
- **Contraste de interacción:**
  - Botones y campos con `focus-visible` ring nítido.
  - Hover states con micro-elevación suave (`translateY(-2px)` en `.card-hover`).

---

## ⚡ Patrones de Componentes

1. **Dashboard:** Cuadrícula de KPIs superiores + paneles divididos en 2 columnas para urgencias y proyectos clave.
2. **Drawers Laterales:** Para detalle de caso con pestañas dedicadas a compromisos, bitácora y notas.
3. **Generador de Correos:** Columna izquierda de configuración + columna derecha de vista previa con copia en 1 clic.
4. **Atajo Global:** `Alt+N` / `Ctrl+Alt+N` abre el modal de captura rápida sin importar en qué vista se encuentre el usuario.
