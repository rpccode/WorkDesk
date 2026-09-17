#!/usr/bin/env node

/**
 * Universal Zero-Click Release & Auto-Publisher para Tauri v2
 * 
 * Modos de uso:
 *   node scripts/release.js                  (Compila la versión actual y genera latest.json)
 *   node scripts/release.js patch            (Incrementa versión patch, compila y firma)
 *   node scripts/release.js minor            (Incrementa versión minor, compila y firma)
 *   node scripts/release.js major            (Incrementa versión major, compila y firma)
 *   node scripts/release.js patch --publish  (1 CLIC: Bump + Build + Firma + Sube a GitHub Releases)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Localizar la raíz del proyecto (donde esté package.json y src-tauri)
let rootDir = process.cwd();
if (!fs.existsSync(path.join(rootDir, 'src-tauri'))) {
  rootDir = path.resolve(__dirname, '..');
  if (!fs.existsSync(path.join(rootDir, 'src-tauri'))) {
    rootDir = path.resolve(__dirname, '..', '..');
  }
}

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
  console.error('Genera una clave con: node scripts/generate-keys.js o npx @tauri-apps/cli signer generate -w src-tauri/updater.key');
  process.exit(1);
}

// 2. Leer configuración y metadatos del proyecto
if (!fs.existsSync(tauriConfPath)) {
  console.error(`\x1b[31m[ERROR]\x1b[0m No se encontró src-tauri/tauri.conf.json en ${rootDir}`);
  process.exit(1);
}

const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const pkgJson = fs.existsSync(pkgJsonPath) ? JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) : {};

const appName = tauriConf.productName || pkgJson.name || 'app';
let currentVersion = tauriConf.version || pkgJson.version || '0.1.0';

// Detectar automáticamente GitHub Owner y Repo
function detectGitHubRepo() {
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    return { owner, repo };
  }
  if (process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    return { owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO };
  }

  // Desde el endpoint configurado en tauri.conf.json
  const endpoints = tauriConf.plugins?.updater?.endpoints || [];
  for (const ep of endpoints) {
    const match = ep.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (match) return { owner: match[1], repo: match[2] };
  }

  // Desde git remote origin
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: rootDir }).toString().trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/i);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  } catch (_) {}

  return { owner: '', repo: '' };
}

const { owner: repoOwner, repo: repoName } = detectGitHubRepo();

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
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  if (pkgJson.version) {
    pkgJson.version = targetVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  }
}

console.log(`\n======================================================`);
console.log(`🚀 COMPILANDO ${appName.toUpperCase()} v${targetVersion} [FIRMA AUTOMÁTICA]`);
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
const nsisExe = collectedFiles.find(f => f.name.endsWith('-setup.exe') || f.name.endsWith('.exe'));
const nsisSig = collectedFiles.find(f => f.name.endsWith('.sig'));

const latestJsonPath = path.join(targetVersionDir, 'latest.json');
let latestManifest = null;

if (nsisExe && nsisSig) {
  const signatureContent = fs.readFileSync(nsisSig.path, 'utf8').trim();
  const downloadUrl = (repoOwner && repoName)
    ? `https://github.com/${repoOwner}/${repoName}/releases/download/v${targetVersion}/${nsisExe.name}`
    : nsisExe.name;
  
  latestManifest = {
    version: targetVersion,
    notes: `Actualización automática a ${appName} v${targetVersion}`,
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
  const tag = `v${targetVersion}`;

  if (!repoOwner || !repoName) {
    console.warn('\x1b[33m[AVISO]\x1b[0m No se pudo determinar el repositorio de GitHub (owner/repo). Configura GITHUB_REPOSITORY=owner/repo en tu .env.');
    return;
  }

  if (!token) {
    console.log(`\n\x1b[33m[AVISO]\x1b[0m Para publicación 100% automática sin abrir navegador, agrega GITHUB_TOKEN en tu archivo .env`);
    console.log(`👉 Enlace para crear release manual: \x1b[36mhttps://github.com/${repoOwner}/${repoName}/releases/new?tag=${tag}&title=${tag}\x1b[0m\n`);
    return;
  }

  console.log(`\n\x1b[35m[GITHUB API]\x1b[0m Publicando versión ${tag} directamente en ${repoOwner}/${repoName}...`);

  // Crear Release en GitHub
  const releaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': `${appName}-Release-Tool`,
    },
    body: JSON.stringify({
      tag_name: tag,
      name: `${appName} ${tag}`,
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
        'User-Agent': `${appName}-Release-Tool`,
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
  console.log(`   \x1b[32mnode scripts/release.js patch --publish\x1b[0m\n`);
}
