# Ejemplo Completo de Integración Paso a Paso

Este documento muestra exactamente cómo luce el código antes y después de integrar el **Tauri v2 Auto-Updater Kit** en cualquier proyecto existente.

---

### 1. `src-tauri/Cargo.toml`

```diff
 [dependencies]
 tauri = { version = "2", features = [] }
+tauri-plugin-updater = "2"
+serde = { version = "1", features = ["derive"] }
+serde_json = "1"
```

---

### 2. `src-tauri/src/lib.rs` (o `main.rs`)

```diff
+mod updater;

 #[cfg_attr(mobile, tauri::mobile_entry_point)]
 pub fn run() {
     tauri::Builder::default()
+        .plugin(tauri_plugin_updater::Builder::new().build())
         .invoke_handler(tauri::generate_handler![
+            updater::check_for_updates,
         ])
         .run(tauri::generate_context!())
         .expect("error while running tauri application");
 }
```

---

### 3. `src-tauri/tauri.conf.json`

```diff
   "bundle": {
     "active": true,
     "targets": "all",
     "icon": [...],
+    "createUpdaterArtifacts": true
   },
+  "plugins": {
+    "updater": {
+      "active": true,
+      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDQwNjIxNj...",
+      "endpoints": [
+        "https://github.com/mi-organizacion/mi-app/releases/latest/download/latest.json"
+      ],
+      "dialog": false,
+      "windows": {
+        "installMode": "passive"
+      }
+    }
+  }
```

---

### 4. `src/App.tsx`

```diff
 import React from 'react';
+import { UpdateChecker } from './components/UpdateChecker';

 export function App() {
   return (
     <div className="container">
+      {/* Banner discreto que buscará actualizaciones tras 4 segundos */}
+      <UpdateChecker appName="MiAplicación" autoCheckDelay={4000} />
       
       <header>
         <h1>Bienvenido a Mi Aplicación</h1>
       </header>
       <main>
         {/* Tu contenido principal */}
       </main>
     </div>
   );
 }
```

---

### 5. `src/views/Settings.tsx` (Botón manual opcional)

```diff
 import React from 'react';
+import { CheckUpdatesButton } from '../components/UpdateChecker';

 export function Settings() {
   return (
     <div className="settings-page">
       <h2>Configuración</h2>
       
+      <section className="settings-section">
+        <h3>Actualizaciones de software</h3>
+        <p>Comprueba si hay una nueva versión disponible.</p>
+        <CheckUpdatesButton appName="MiAplicación" />
+      </section>
     </div>
   );
 }
```

---

### 6. Estructura final recomendada de archivos

```text
mi-proyecto/
├── .github/
│   └── workflows/
│       └── release.yml              <-- Copiado de tauri-updater-kit/github-workflows/release.yml
├── scripts/
│   └── release.js                   <-- Copiado de tauri-updater-kit/scripts/release.js
├── src/
│   └── components/
│       ├── UpdateChecker.tsx        <-- Copiado de tauri-updater-kit/frontend/UpdateChecker.tsx
│       ├── UpdateChecker.css        <-- Copiado de tauri-updater-kit/frontend/UpdateChecker.css
│       └── useUpdater.ts            <-- Copiado de tauri-updater-kit/frontend/useUpdater.ts
├── src-tauri/
│   ├── src/
│   │   ├── updater.rs               <-- Copiado de tauri-updater-kit/tauri/updater.rs
│   │   └── lib.rs                   <-- Actualizado con el módulo y plugin
│   ├── Cargo.toml                   <-- Actualizado con tauri-plugin-updater
│   ├── tauri.conf.json              <-- Actualizado con pubkey y endpoints
│   ├── updater.key                  <-- Clave privada generada (en .gitignore)
│   └── updater.key.pub              <-- Clave pública
├── .env                             <-- GITHUB_TOKEN=...
├── .gitignore                       <-- Contiene: src-tauri/updater.key
└── package.json                     <-- Scripts: npm run publish:patch
```
