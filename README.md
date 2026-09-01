# WorkDesk — Personal Operations Center (Centro Personal de Operaciones)

![WorkDesk](public/logo.png)

**Plataforma de escritorio integral para la operación diaria de consultores de alta demanda: gestión por Próxima Acción, bandeja de captura GTD, control de bloqueos y generación de informes ejecutivos.**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue?logo=tauri)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff?logo=vite)](https://vitejs.dev/)
[![Version: 0.3.0](https://img.shields.io/badge/Version-0.3.0-emerald.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 Filosofía: Personal Operations System

WorkDesk trasciende los gestores tradicionales bajo la premisa operativa:

> **Caso → Próxima Acción → Compromiso**
> *"¿Qué tiene que suceder ahora para que esto avance?"*

---

## ✨ Funcionalidades Principales (v0.3.0)

### ☀️ 1. Módulo "Mi Día" (Morning Brief Operativo)
- **Centro de Gravedad Diario:** Responde inmediatamente a la pregunta *"¿Qué hago ahora?"*.
- **Atención Urgente:** Casos críticos, compromisos vencidos y anomalías operativas señaladas al instante.
- **Matriz de Próximas Acciones:** Acciones priorizadas por cliente y fecha límite con marcado en 1 clic.
- **Listos para Cerrar:** Detección automática de casos con todos sus compromisos cumplidos listos para cierre.

### 🎯 2. Próxima Acción (Next Action) de Primer Nivel
- Cada caso cuenta con una próxima acción concreta obligatoria (`description`, `due_date`, `owner_type`).
- Detección de casos huérfanos sin próxima acción para garantizar que ningún proyecto quede inerte.

### ⏳ 3. Esperando de Otros & Bloqueos (Aging)
- Panel especializado en dependencias de terceros (Clientes, Desarrollo, Contabilidad, Infraestructura).
- **Contador de Días Transcurridos (Aging):** *"Llevas 6 días esperando validación"*.
- Disparo en 1 clic de correos de seguimiento contextualizados o registro de llamadas.

### 📥 4. Bandeja de Entrada Rápida (Inbox GTD)
- Captura de ideas, pendientes o notas sin fricción (`Alt + N`).
- Clasificación y procesamiento posterior hacia **Caso**, **Compromiso**, **Seguimiento** o **Nota**.

### 🔍 5. Command Center Universal (`Ctrl + K` / `Cmd + K`)
- Buscador global indexado en tiempo real en milisegundos para Clientes, Casos, Próximas Acciones, Tickets, Documentos y Comandos.

### 📊 6. Dashboard Ejecutivo y KPIs
- Métricas operativas en tiempo real, distribución de carga y clientes con bloqueos.

### 👥 7. Gestión de Clientes y Directorio
- Fichas completas de clientes con cálculo de complejidad operativa (ponderada y evaluada).
- Registro de contactos clave, departamentos, sedes y sistemas vinculados.

### 📂 8. Casos y Proyectos
- Flujo de estados: *Abierto*, *En Progreso*, *En Espera* y *Cerrado*.
- Niveles de prioridad (Crítica, Alta, Media, Baja) y Timeline automático de eventos.

### ✅ 9. Matriz de Compromisos
- Separación clara entre compromisos propios (*Me*) y de clientes/terceros (*They*).
- Fechas de vencimiento con advertencias visuales y control de cumplimiento.

### 📑 10. Centro de Documentación & Generador Word (.docx)
- **Importación Inteligente:** Soporte para subir plantillas de Word (`.docx`) preservando formato y tablas.
- **Inyección Dinámica de Marcadores:** Uso de tokens como `{{cliente_nombre}}`, `{{caso_titulo}}`, tablas y firmas.
- **Exportación en 1 Clic:** Descarga directa de archivos Word `.docx`.

### ✉️ 11. Generador de Correos Profesionales
- Redacción acelerada de minutas, solicitudes de información y seguimientos con variables automáticas.

### 📅 12. Calendario & Agenda
- Vista interactiva de entregas, hitos de proyectos y compromisos agendados.

- Atajo de teclado global (`Alt+N` / `Ctrl+Alt+N`) para registrar tareas, notas o casos desde cualquier vista sin perder el contexto.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| --- | --- |
| **Core de Escritorio** | [Tauri v2](https://tauri.app/) (Rust + WebView2 nativo) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estado & Datos** | [Zustand](https://github.com/pmndrs/zustand), Almacenamiento local seguro |
| **Procesamiento de Documentos** | [docx](https://docx.js.org/), [Mammoth.js](https://github.com/mwilliamson/mammoth.js), [SheetJS (xlsx)](https://sheetjs.com/) |
| **Iconografía & UI** | [Lucide React](https://lucide.dev/), CSS personalizado basado en Tokens (Dark/Slate Glassmorphism) |
| **Actualizaciones & Firma** | Tauri Updater v2 con firmas criptográficas [Minisign](https://jedisct1.github.io/minisign/) |

---

## 📦 Instalación y Desarrollo Local

### Prerrequisitos

- **Node.js**: v18+ (se recomienda LTS)
- **Rust**: `rustc` y `cargo` instalados ([rustup.rs](https://rustup.rs/))
- **C++ Build Tools**: En Windows, Visual Studio C++ Build Tools

### Pasos de Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/rpccode/WorkDesk.git
   cd WorkDesk
   ```

2. **Instalar dependencias de Node:**

   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo:**

   ```bash
   npm run tauri dev
   ```

4. **Ejecutar pruebas unitarias:**

   ```bash
   npx vitest run
   ```

---

## 🚀 Compilación y Publicación (Releases)

WorkDesk cuenta con un pipeline automatizado tanto local como vía **GitHub Actions** con firma criptográfica.

### Comandos de Compilación Local

| Comando | Descripción |
| --- | --- |
| `npm run build` | Compila TypeScript y empaqueta el frontend con Vite |
| `npm run build:exe:debug` | Genera un ejecutable `.exe` local en modo debug sin firma |
| `npm run release:patch` | Incrementa versión patch (ej. `0.2.1` → `0.2.2`), compila y genera instaladores firmados con `latest.json` |
| `npm run release:minor` | Incrementa versión minor (ej. `0.2.1` → `0.3.0`) |
| `npm run publish:patch` | Incrementa versión, compila, firma y **sube automáticamente** el Release a GitHub |

### Estructura de Salida (`dist-release/`)

Al ejecutar el script de release, los binarios se generan en:

```text
dist-release/vX.Y.Z/
├── workdesk_X.Y.Z_x64-setup.exe       # Instalador NSIS
├── workdesk_X.Y.Z_x64-setup.exe.sig   # Firma digital Minisign
├── workdesk_X.Y.Z_x64_en-US.msi       # Paquete MSI
├── workdesk_X.Y.Z_x64_en-US.msi.sig   # Firma MSI
└── latest.json                         # Manifiesto de actualización para Tauri Updater
```

---

## 🔄 Sistema de Auto-Actualización

La aplicación incluye soporte nativo para **Tauri Updater v2**:

1. Al iniciar o solicitar buscar actualizaciones desde *Configuración*, la app consulta el manifiesto público en GitHub Releases.
2. Si existe una versión superior, descarga el paquete firmado en segundo plano.
3. Notifica al usuario con un diálogo amigable para reiniciar e instalar de forma pasiva.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
