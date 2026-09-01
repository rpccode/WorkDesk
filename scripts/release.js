#!/usr/bin/env node

/**
 * WorkDesk Zero-Click Release & Auto-Publisher
 * 
 * Modos de uso:
 *   npm run release:patch          (Compila, firma y prepara archivos localmente)
 *   npm run publish:patch          (TODO EN 1 CLIC: Bump + Build + Firma + Sube a GitHub Releases)
 *   npm run publish:minor
 *   npm run publish:major
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const pkgJsonPath = path.join(rootDir, 'package.json');
const keyPath = path.join(rootDir, 'src-tauri', 'updater.key');
const distReleaseDir = path.join(rootDir, 'dist-release');
const envPath = path.join(rootDir, '.env');

// Cargar variables de entorno desde .env si existe
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const shouldPublish = process.argv.includes('--publish') || process.env.AUTO_PUBLISH === 'true';

// 1. Validar clave de firma
if (!fs.existsSync(keyPath)) {
  console.error('\x1b[31m[ERROR]\x1b[0m No se encontró la clave privada en src-tauri/updater.key');
  console.error('Genera una clave con: npx @tauri-apps/cli signer generate --ci -f -w src-tauri/updater.key');
  process.exit(1);
}

// 2. Leer configuración actual
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
let currentVersion = tauriConf.version || '0.1.0';

// 3. Manejo de versión (argumentos)
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const argVersion = args[0];
let targetVersion = currentVersion;

if (argVersion) {
  const parts = currentVersion.split('.').map(Number);
  if (argVersion === 'patch') {
    parts[2] = (parts[2] || 0) + 1;
    targetVersion = parts.join('.');
  } else if (argVersion === 'minor') {
    parts[1] = (parts[1] || 0) + 1;
    parts[2] = 0;
    targetVersion = parts.join('.');
  } else if (argVersion === 'major') {
    parts[0] = (parts[0] || 0) + 1;
    parts[1] = 0;
    parts[2] = 0;
    targetVersion = parts.join('.');
  } else if (/^\d+\.\d+\.\d+/.test(argVersion)) {
    targetVersion = argVersion;
  }
}

// 4. Actualizar archivos de versión
if (targetVersion !== currentVersion) {
  console.log(`\x1b[36m[VERSIÓN]\x1b[0m Incrementando de v${currentVersion} a v${targetVersion}...`);
  tauriConf.version = targetVersion;
  pkgJson.version = targetVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
}

console.log(`\n======================================================`);
console.log(`🚀 COMPILANDO WORKDESK v${targetVersion} [FIRMA AUTOMÁTICA]`);
console.log(`======================================================\n`);

// 5. Configurar variables de entorno para firma
process.env.TAURI_SIGNING_PRIVATE_KEY = keyPath;
process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = keyPath;
process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '';

// 6. Ejecutar Build con Tauri
try {
  console.log('\x1b[34m[BUILD]\x1b[0m Compilando frontend y empaquetando binarios de Rust...\n');
  execSync('npx tauri build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY: keyPath,
      TAURI_SIGNING_PRIVATE_KEY_PATH: keyPath,
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '',
    },
  });
} catch (err) {
  console.error('\n\x1b[31m[ERROR]\x1b[0m Falló la compilación de Tauri.');
  process.exit(1);
}

// 7. Recolectar archivos generados de la versión actual
const targetBundleDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle');
const targetVersionDir = path.join(distReleaseDir, `v${targetVersion}`);

if (!fs.existsSync(distReleaseDir)) fs.mkdirSync(distReleaseDir, { recursive: true });
if (!fs.existsSync(targetVersionDir)) fs.mkdirSync(targetVersionDir, { recursive: true });

function copyIfExists(sourceDir, filterFn, destDir) {
  if (!fs.existsSync(sourceDir)) return [];
  const files = fs.readdirSync(sourceDir);
  const matched = [];
  for (const f of files) {
    if (filterFn(f)) {
      const src = path.join(sourceDir, f);
      const dest = path.join(destDir, f);
      fs.copyFileSync(src, dest);
      matched.push({ name: f, path: dest });
    }
  }
  return matched;
}

const collectedFiles = [
  ...copyIfExists(path.join(targetBundleDir, 'nsis'), (f) => f.includes(targetVersion) && (f.endsWith('.exe') || f.endsWith('.sig') || f.endsWith('.zip')), targetVersionDir),
  ...copyIfExists(path.join(targetBundleDir, 'msi'), (f) => f.includes(targetVersion) && (f.endsWith('.msi') || f.endsWith('.sig')), targetVersionDir),
];

// Generar o copiar latest.json para el Updater de Tauri v2
const nsisExe = collectedFiles.find(f => f.name.endsWith('-setup.exe'));
const nsisSig = collectedFiles.find(f => f.name.endsWith('-setup.exe.sig'));

const latestJsonPath = path.join(targetVersionDir, 'latest.json');
let latestManifest = null;

if (nsisExe && nsisSig) {
  const signatureContent = fs.readFileSync(nsisSig.path, 'utf8').trim();
  const downloadUrl = `https://github.com/rpccode/WorkDesk/releases/download/v${targetVersion}/${nsisExe.name}`;
  
  latestManifest = {
    version: targetVersion,
    notes: `Actualización automática a WorkDesk v${targetVersion}`,
    pub_date: new Date().toISOString(),
    platforms: {
      'windows-x86_64': {
        signature: signatureContent,
        url: downloadUrl,
      },
    },
  };
  fs.writeFileSync(latestJsonPath, JSON.stringify(latestManifest, null, 2) + '\n');
  collectedFiles.push({ name: 'latest.json', path: latestJsonPath });
}

console.log(`\n======================================================`);
console.log(`✅ COMPILACIÓN Y FIRMA v${targetVersion} COMPLETADA`);
console.log(`======================================================\n`);
console.log(`📁 Artefactos listos en: \x1b[32m${targetVersionDir}\x1b[0m\n`);
collectedFiles.forEach((f) => console.log(`  ✓ ${f.name}`));

// 8. Publicación Automática a GitHub (Zero-Click)
async function publishToGitHub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const owner = 'rpccode';
  const repo = 'WorkDesk';
  const tag = `v${targetVersion}`;

  if (!token) {
    console.log(`\n\x1b[33m[AVISO]\x1b[0m Para publicación 100% automática sin abrir navegador, agrega GITHUB_TOKEN en tu archivo .env`);
    console.log(`👉 Enlace manual: \x1b[36mhttps://github.com/${owner}/${repo}/releases/new?tag=${tag}&title=${tag}\x1b[0m\n`);
    return;
  }

  console.log(`\n\x1b[35m[GITHUB API]\x1b[0m Publicando versión ${tag} directamente en GitHub Releases...`);

  // Crear Release en GitHub
  const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'WorkDesk-Release-Tool',
    },
    body: JSON.stringify({
      tag_name: tag,
      name: `WorkDesk ${tag}`,
      body: `### Actualización Automática ${tag}\n\n- Build firmado y listo para auto-actualización.\n- Correcciones y mejoras operativas.`,
      draft: false,
      prerelease: false,
    }),
  });

  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    console.error('\x1b[31m[ERROR]\x1b[0m Error al crear release en GitHub:', releaseData.message);
    return;
  }

  const uploadUrl = releaseData.upload_url.replace(/\{(\?.*)?\}$/, '');
  console.log(`✓ Release creado en GitHub: ${releaseData.html_url}`);

  // Subir cada artefacto
  for (const file of collectedFiles) {
    console.log(`  ↑ Subiendo ${file.name}...`);
    const fileBuffer = fs.readFileSync(file.path);
    const contentType = file.name.endsWith('.json')
      ? 'application/json'
      : file.name.endsWith('.exe') || file.name.endsWith('.msi')
      ? 'application/octet-stream'
      : 'text/plain';

    const uploadRes = await fetch(`${uploadUrl}?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'User-Agent': 'WorkDesk-Release-Tool',
      },
      body: fileBuffer,
    });

    if (uploadRes.ok) {
      console.log(`    \x1b[32m✓ ${file.name} subido con éxito\x1b[0m`);
    } else {
      const err = await uploadRes.text();
      console.warn(`    \x1b[33m⚠ Error al subir ${file.name}: ${err}\x1b[0m`);
    }
  }

  console.log(`\n🎉 \x1b[32m¡ACTUALIZACIÓN PUBLICADA EXITOSAMENTE EN GITHUB!\x1b[0m`);
  console.log(`🔗 Ver release: \x1b[36m${releaseData.html_url}\x1b[0m`);
  console.log(`Todos los usuarios recibirán la versión ${tag} automáticamente al abrir la app.\n`);
}

if (shouldPublish) {
  publishToGitHub().catch(console.error);
} else {
  console.log(`\n💡 TIP: Para compilar y publicar en GitHub en 1 solo comando ejecuta:`);
  console.log(`   \x1b[32mnpm run publish:patch\x1b[0m\n`);
}
