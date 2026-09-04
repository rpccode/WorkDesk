# Guía de Buenas Prácticas de Ingeniería — WorkDesk

Este documento recopila los estándares arquitectónicos, patrones de diseño, lineamientos de seguridad, rendimiento y calidad de código implementados en el proyecto **WorkDesk**. Su propósito es servir como referencia técnica y asegurar la consistencia y mantenibilidad del sistema a lo largo de su ciclo de vida.

---

## 🏛️ 1. Arquitectura y Estructura del Software

### 1.1 Arquitectura en Capas y Desacoplamiento (Hybrid Native / Web Architecture)
WorkDesk adopta una arquitectura híbrida de alto rendimiento combinando **Tauri v2 (Rust)** en la capa nativa y **React 19 con TypeScript y Vite** en la capa de presentación.

```
┌────────────────────────────────────────────────────────┐
│               React 19 / TypeScript UI                 │
│  (Views, Components, Design Tokens, Client Utilities)  │
└───────────────────────────┬────────────────────────────┘
                            │
              Zustand Store (`src/store/`)
                            │
             IPC Bridge (`src/api/tauri.ts`)
                            │
  ══════════════════════════╪═════════════════════════════  [Límite de Aislamiento Tauri IPC]
                            │
             Rust Commands (`src-tauri/src/commands/`)
                            │
       Database & Storage Layer (`src-tauri/src/db/`)
               (SQLite + WAL + Migraciones)
```

- **Aislamiento de la Interfaz con Tauri IPC (`src/api/tauri.ts`)**: Ningún componente React invoca directamente `invoke()` con cadenas arbitrarias. Todas las llamadas al backend de Rust están encapsuladas en un módulo tipado `api.*`, lo que facilita mocks, pruebas y mantenimiento.
- **Separación de Responsabilidades en el Frontend**:
  - `src/views/`: Vistas de nivel superior que representan dominios operativos (Mi Día, Clientes, Casos, Tickets, Agenda, Informes).
  - `src/components/`: Componentes UI reutilizables y sin acoplamiento a llamadas de datos directas.
  - `src/store/`: Orquestador de estado global reactivo mediante **Zustand**.
  - `src/services/`: Servicios especializados asíncronos (Copiloto de IA, sincronizadores en segundo plano).
  - `src/utils/`: Funciones puras e independientes (formateadores, generadores `.docx`, parsers de Excel y correo).

---

## 💾 2. Persistencia, Resiliencia y Base de Datos

### 2.1 Configuración de Alto Rendimiento en SQLite
La base de datos embebida en Rust (`src-tauri/src/db/connection.rs`) implementa PRAGMAs de grado de producción:
- **`PRAGMA journal_mode = WAL;` (Write-Ahead Logging)**: Permite concurrencia real entre múltiples hilos de lectura y escritura sin bloqueos de tabla.
- **`PRAGMA foreign_keys = ON;`**: Garantiza la integridad referencial en cascada a nivel de motor de base de datos.
- **`PRAGMA synchronous = NORMAL;`**: Optimiza la latencia de I/O en disco manteniendo la durabilidad ante caídas de la aplicación.

### 2.2 Migraciones Transaccionales e Idempotentes
- El sistema de base de datos gestiona el versionado mediante una tabla de control `_migrations`.
- Cada script de migración SQL se ejecuta dentro de una transacción atómica (`conn.transaction()?`). Si ocurre algún fallo de sintaxis o conflicto, la transacción efectúa un *rollback* completo sin corromper el archivo de datos.

### 2.3 Blindaje contra Inyección SQL
- Todas las consultas SQL en Rust emplean parámetros enlazados (`rusqlite::params!`), eliminando por completo cualquier vulnerabilidad de inyección SQL por concatenación de cadenas.

### 2.4 Resiliencia Offline-First y Fallback Local
- Los datos residen de forma predeterminada en el directorio local de usuario (`%APPDATA%/workdesk.db`).
- El estado en el frontend (`src/store/index.ts`) implementa una capa de persistencia en `localStorage` con fallbacks defensivos para permitir arranques inmediatos y tolerancia ante inicializaciones en frío.

---

## 🔐 3. Seguridad, Privacidad y Criptografía

### 3.1 Principio "Local-First" y Privacidad Cero Fugas
- Toda la información sensible (clientes, métricas, contactos, tickets, minutas) se almacena y procesa exclusivamente en la máquina del consultor.
- No existe telemetría invasiva ni envío de datos a servidores externos sin autorización explícita del usuario (como al configurar un proveedor de IA o correo).

### 3.2 Implementación Segura de OAuth 2.0 para Apps Nativas (RFC 8252)
En `src-tauri/src/commands/oauth.rs`:
- **Servidor Loopback Temporal**: En lugar de exponer puertos públicos o incrustar navegadores vulnerables, se abre un `TcpListener` local en `127.0.0.1:8989` con un timeout estricto de 120 segundos.
- **Uso del Navegador del Sistema**: El proceso de login se abre en el navegador predeterminado del sistema operativo (`open::that`), garantizando que la app de escritorio nunca intercepte credenciales ni contraseñas maestras.
- **Parámetro `state`**: Se incluye validación de estado anti-CSRF para mitigar ataques de inyección de código de autorización.

### 3.3 Firmas Criptográficas Asimétricas en el Pipeline de Distribución
- Los paquetes ejecutables (`.exe`, `.msi`) generados para distribución se firman digitalmente con **Minisign** (`updater.key` / `updater.key.pub`).
- El auto-actualizador de Tauri Updater v2 verifica la firma criptográfica contenida en `latest.json` antes de aplicar cualquier actualización en el equipo del usuario, previniendo ataques de tipo Man-in-the-Middle o manipulación de binarios.

---

## 🎨 4. Sistema de Diseño, Accesibilidad y Rendimiento Visual

Siguiendo las directrices documentadas en `DESIGN.md`:

### 4.1 Arquitectura Basada en Tokens CSS
- Centralización de valores en variables CSS (`--bg-main`, `--bg-surface`, `--accent-primary`, `--border-subtle`, `--radius-md`).
- Se evitan "magic numbers" o estilos en línea diseminados en el código.

### 4.2 Prevención de Inestabilidad Visual (CLS - Cumulative Layout Shift)
- **`font-variant-numeric: tabular-nums`**: Aplicado en todas las métricas de KPIs, contadores, fechas y cronómetros. Esto garantiza que las cifras tengan anchos fijos y los números no generen temblores en la pantalla al cambiar.
- **`text-wrap: balance`**: Aplicado en encabezados y títulos para evitar líneas huérfanas y mejorar la legibilidad.

### 4.3 Diseño Orientado a la Eficiencia ("Wayfinding" y Teclado Primero)
- **Universal Command Center (`Ctrl+K` / `Cmd+K`)**: Búsqueda global instantánea e indexada para clientes, casos, tickets y comandos.
- **Captura Rápida Global (`Alt+N`)**: Modal de captura rápida accesible sin perder el contexto de la vista actual.
- **Navegación Accesible**: Estados `focus-visible` con anillos de contraste nítidos para operadores que prefieren navegar 100% mediante teclado.

---

## 🧪 5. Calidad de Código, Tipado y Estrategia de Pruebas

### 5.1 Tipado Estricto de Extremo a Extremo
- TypeScript configurado con comprobaciones estrictas.
- Interfaces y tipos centralizados en `src/types/index.ts`, cubriendo modelos de datos (`Client`, `Case`, `Commitment`, `Ticket`), entradas de mutación (`CreateCaseInput`, etc.) y respuestas de API.

### 5.2 Manejo Centralizado y Observabilidad de Errores (`error-logger.ts`)
- Módulo `src/utils/error-logger.ts` que captura excepciones no controladas tanto de React como de la ventana global.
- Registro circular con límite de memoria (máximo 50 entradas) que almacena trazas de pila (`stack traces`), timestamps y origen del error para facilitar el diagnóstico.

### 5.3 Cobertura de Pruebas Unitarias Exhaustiva
El proyecto cuenta con más de **20 suites de pruebas unitarias** implementadas con **Vitest** en `tests/unit/`:
- Pruebas de integración del Copiloto de IA (`ai-copilot.test.ts`).
- Cálculo de salud y complejidad de clientes (`client-health.ts`, `consulting-intelligence.test.ts`).
- Generación y parsing de documentos Word y plantillas (`docx-generator.test.ts`, `docx-parser.test.ts`).
- Importación y validación de hojas de cálculo Excel (`excel-importer.test.ts`, `excel-ticket-importer.test.ts`).
- Sincronización y lógica de fechas/calendario (`calendar-sync.test.ts`, `date-utils.test.ts`).
- Registro y rotación de errores (`error-logger.test.ts`).

---

## 🚀 6. Automatización, DevOps y Releases (CI/CD)

### 6.1 Automatización de Releases en 1 Clic (`scripts/release.js`)
- Script modular en Node.js que sincroniza automáticamente las versiones en `package.json` y `tauri.conf.json`.
- Compilación cruzada, firma criptográfica automática mediante Minisign y empaquetado de artefactos (`.exe`, `.msi`, `.sig`).
- Generación automática del manifiesto `latest.json` con metadatos de plataforma y firmas.
- Soporte para publicación directa en GitHub Releases mediante API REST con un solo comando (`npm run publish:patch`).

### 6.2 Integración Continua con GitHub Actions (`.github/workflows/release.yml`)
- Flujo automatizado de empaquetado que se dispara al publicar etiquetas (`v*`).
- Inyección segura de secretos para la firma de binarios (`TAURI_SIGNING_PRIVATE_KEY`).
- Creación de releases verificables y reproducibles en entornos limpios de integración continua.

---

## 📋 Resumen de Cumplimiento

| Pilar | Buena Práctica Clave | Archivo / Componente de Referencia |
|---|---|---|
| **Arquitectura** | Desacoplamiento IPC y tipado estricto | `src/api/tauri.ts` |
| **Base de Datos** | SQLite WAL, claves foráneas y migraciones transaccionales | `src-tauri/src/db/connection.rs` |
| **Seguridad** | OAuth 2.0 Loopback nativo (RFC 8252) y Local-First | `src-tauri/src/commands/oauth.rs` |
| **Integridad** | Firma asimétrica con Minisign para actualizaciones | `src-tauri/updater.key`, `scripts/release.js` |
| **UI/UX** | Design Tokens, `tabular-nums`, prevención de CLS | `DESIGN.md`, `src/index.css` |
| **Calidad** | 20 suites de pruebas unitarias automatizadas | `tests/unit/*.test.ts` |
| **Observabilidad** | Logger persistente con rotación de excepciones | `src/utils/error-logger.ts` |
| **DevOps** | Script de versionado, firma y publicación automatizada | `scripts/release.js`, `.github/workflows/` |
