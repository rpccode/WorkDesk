# Tauri v2 Auto-Updater Kit 🚀
> Kit completo, modular y listo para copiar y pegar para implementar auto-actualizaciones seguras con firma criptográfica (Minisign) en aplicaciones de escritorio creadas con **Tauri v2** y **React / TypeScript / Web**.

---

## 📦 Contenido del Kit

Este paquete extrae y estandariza todo el mecanismo de auto-actualización implementado y probado en producción:

| Carpeta / Archivo | Descripción |
| :--- | :--- |
| **[`tauri/updater.rs`](file:///./tauri/updater.rs)** | Módulo en Rust con el comando `check_for_updates` para Tauri v2 (`download_and_install` pasivo). |
| **[`tauri/Cargo.toml.snippet`](file:///./tauri/Cargo.toml.snippet)** | Dependencias necesarias de Cargo (`tauri-plugin-updater`, `serde`, `serde_json`). |
| **[`tauri/tauri.conf.snippet.json`](file:///./tauri/tauri.conf.snippet.json)** | Fragmento de configuración para `tauri.conf.json` (`createUpdaterArtifacts` y plugin `updater`). |
| **[`frontend/UpdateChecker.tsx`](file:///./frontend/UpdateChecker.tsx)** | Componente visual en React listo para usar (Banner elegante, auto-check en arranque, botón para Ajustes). |
| **[`frontend/useUpdater.ts`](file:///./frontend/useUpdater.ts)** | Hook headless en React para quienes prefieran construir su propia interfaz personalizada. |
| **[`frontend/UpdateChecker.css`](file:///./frontend/UpdateChecker.css)** | Estilos autocontenidos y modernos (tema oscuro/claro y glassmorphism) sin dependencias externas. |
| **[`scripts/release.js`](file:///./scripts/release.js)** | Script Zero-Click multi-repositorio: bump de versión, compilación Tauri, firma criptográfica, generación de `latest.json` y subida directa a GitHub Releases. |
| **[`scripts/generate-keys.js`](file:///./scripts/generate-keys.js)** | Asistente en Node.js para generar las llaves Minisign e imprimir las instrucciones exactas. |
| **[`scripts/package-scripts.json`](file:///./scripts/package-scripts.json)** | Scripts de npm listos para pegar en tu `package.json`. |
| **[`github-workflows/release.yml`](file:///./github-workflows/release.yml)** | Workflow de GitHub Actions para compilar y publicar releases automáticamente con cada tag `v*`. |

---

## ⚡ Guía Rápida: De 0 a Auto-Update en 6 Pasos

### Paso 1: Generar el par de llaves criptográficas (Minisign)

Tauri requiere que los instaladores estén firmados criptográficamente para evitar ataques Man-in-the-Middle o archivos corruptos.

Ejecuta en la raíz de tu proyecto:
```bash
node tauri-updater-kit/scripts/generate-keys.js
```
O manualmente con el CLI de Tauri:
```bash
npx @tauri-apps/cli signer generate -w src-tauri/updater.key
```

Esto generará:
- `src-tauri/updater.key` (clave privada — **¡NUNCA LA SUBAS A GIT!** agrégala a `.gitignore`).
- `src-tauri/updater.key.pub` (clave pública en formato Base64).

---

### Paso 2: Configurar `tauri.conf.json`

En tu archivo `src-tauri/tauri.conf.json`, agrega o fusiona las siguientes propiedades:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "active": true,
      "pubkey": "<PEGA_AQUÍ_EL_CONTENIDO_DE_updater.key.pub>",
      "endpoints": [
        "https://github.com/<TU_USUARIO_O_ORG>/<TU_REPOSITORIO>/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

> **Nota:** `"dialog": false` y `"installMode": "passive"` permiten que la aplicación descargue la actualización en segundo plano e instale de forma limpia sin alertas intrusivas de Windows.

---

### Paso 3: Configurar Backend de Rust (`src-tauri`)

1. En `src-tauri/Cargo.toml`, agrega en `[dependencies]`:
   ```toml
   tauri-plugin-updater = "2"
   serde = { version = "1", features = ["derive"] }
   serde_json = "1"
   ```

2. Copia [`tauri/updater.rs`](file:///./tauri/updater.rs) dentro de tu carpeta `src-tauri/src/updater.rs`.

3. En tu `src-tauri/src/lib.rs` (o `main.rs`):
   ```rust
   mod updater; // Agregar módulo

   pub fn run() {
       tauri::Builder::default()
           .plugin(tauri_plugin_updater::Builder::new().build()) // Registrar plugin
           .invoke_handler(tauri::generate_handler![
               updater::check_for_updates // Registrar comando
           ])
           .run(tauri::generate_context!())
           .expect("error while running tauri application");
   }
   ```

---

### Paso 4: Configurar Frontend React

1. Asegúrate de tener instalado `@tauri-apps/api` y `lucide-react` (o usa los iconos SVG integrados):
   ```bash
   npm install @tauri-apps/api lucide-react
   ```

2. Copia [`frontend/UpdateChecker.tsx`](file:///./frontend/UpdateChecker.tsx) y [`frontend/UpdateChecker.css`](file:///./frontend/UpdateChecker.css) en tu carpeta de componentes (por ejemplo `src/components/`).

3. Coloca el banner en tu componente raíz (`App.tsx`):
   ```tsx
   import { UpdateChecker } from './components/UpdateChecker';

   function App() {
     return (
       <div>
         <UpdateChecker appName="MiAplicacion" autoCheckDelay={5000} />
         {/* Resto de tu aplicación */}
       </div>
     );
   }
   ```

4. *(Opcional)* Si tienes una vista de Configuración / Acerca de, agrega el botón de búsqueda manual:
   ```tsx
   import { CheckUpdatesButton } from './components/UpdateChecker';

   // En tu SettingsView:
   <CheckUpdatesButton appName="MiAplicacion" />
   ```

---

### Paso 5: Agregar Scripts de Release a tu `package.json`

Copia el script [`scripts/release.js`](file:///./scripts/release.js) a tu carpeta `scripts/release.js` y agrega esto a los scripts de tu `package.json`:

```json
"scripts": {
  "release": "node scripts/release.js",
  "release:patch": "node scripts/release.js patch",
  "release:minor": "node scripts/release.js minor",
  "release:major": "node scripts/release.js major",
  "publish": "node scripts/release.js --publish",
  "publish:patch": "node scripts/release.js patch --publish",
  "publish:minor": "node scripts/release.js minor --publish",
  "publish:major": "node scripts/release.js major --publish"
}
```

Crea un archivo `.env` en la raíz de tu proyecto con tu token de GitHub (con permisos de `repo` o `write:packages`):
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxx
```

---

### Paso 6: Compilar y Publicar

¡Listo! Para lanzar una nueva versión y que todos tus usuarios se actualicen automáticamente:

#### Opción A: En 1 Clic desde tu máquina local (Recomendada)
```bash
npm run publish:patch
```
Este único comando:
1. Incrementa la versión en `package.json` y `tauri.conf.json`.
2. Compila el frontend y el binario de Tauri firmado con tu clave privada.
3. Genera el manifiesto `latest.json` con las firmas criptográficas.
4. Crea la Release en GitHub vía API y sube todos los artefactos (`.exe`, `.sig`, `latest.json`).

#### Opción B: Mediante GitHub Actions en la nube
1. Copia [`github-workflows/release.yml`](file:///./github-workflows/release.yml) en `.github/workflows/release.yml`.
2. En GitHub ve a **Settings > Secrets and variables > Actions** y crea el Secret:
   - `TAURI_SIGNING_PRIVATE_KEY`: El contenido completo de `src-tauri/updater.key`.
3. Haz un tag y sube los cambios:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
   GitHub Actions compilará los artefactos, los firmará y creará el release automáticamente.

---

## 🔒 Buenas Prácticas de Seguridad

1. **Nunca versionar la clave privada:** Agrega `src-tauri/updater.key` a tu `.gitignore`.
2. **Respaldo de la clave privada:** Guarda una copia segura fuera de tu computadora (gestor de contraseñas de la empresa o 1Password). Si pierdes esta clave, **no podrás enviar actualizaciones a los usuarios existentes** sin obligarlos a reinstalar manualmente.
3. **Control de Versiones (SemVer):** Asegúrate de que la nueva versión siempre sea numéricamente superior (ej. `0.1.1` > `0.1.0`), de lo contrario el updater de Tauri la ignorará.
