#!/usr/bin/env node

/**
 * Tauri Signer Key Generator
 *
 * Genera el par de claves Minisign para firmar artefactos de actualización en Tauri v2.
 * Salidas:
 *   - src-tauri/updater.key     (Clave privada - NUNCA subir a Git)
 *   - src-tauri/updater.key.pub (Clave pública - Va en tauri.conf.json)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..'); // Si se ejecuta dentro de su proyecto
const tauriDir = path.join(rootDir, 'src-tauri');
const privateKeyPath = path.join(tauriDir, 'updater.key');
const publicKeyPath = path.join(tauriDir, 'updater.key.pub');

console.log('\n======================================================');
console.log('🔑 GENERADOR DE CLAVES CRIPTOGRÁFICAS TAURI v2');
console.log('======================================================\n');

if (!fs.existsSync(tauriDir)) {
  console.error(`\x1b[31m[ERROR]\x1b[0m No se encontró la carpeta 'src-tauri' en ${rootDir}.`);
  console.error('Asegúrate de ejecutar este script en la raíz de un proyecto Tauri.');
  process.exit(1);
}

if (fs.existsSync(privateKeyPath)) {
  console.log(`\x1b[33m[AVISO]\x1b[0m Ya existe una clave en ${privateKeyPath}.`);
  console.log('Si generas una nueva clave, los usuarios que tengan una versión firmada con la clave anterior');
  console.log('NO podrán actualizar automáticamente hasta que reinstalen.\n');
  
  if (fs.existsSync(publicKeyPath)) {
    const pubKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
    console.log(`\x1b[32m[CLAVE PÚBLICA ACTUAL]\x1b[0m:`);
    console.log(`\x1b[36m${pubKey}\x1b[0m\n`);
  }
  process.exit(0);
}

try {
  console.log('⚙️  Generando par de claves con @tauri-apps/cli...');
  // Genera la clave sin contraseña para entornos automatizados de CI/CD
  execSync(`npx @tauri-apps/cli signer generate --ci -f -w src-tauri/updater.key`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (fs.existsSync(publicKeyPath)) {
    const pubKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
    console.log('\n======================================================');
    console.log('✅ ¡CLAVES GENERADAS CON ÉXITO!');
    console.log('======================================================\n');
    console.log('1️⃣  COPIA ESTA CLAVE PÚBLICA EN TU `src-tauri/tauri.conf.json`:');
    console.log(`\x1b[32m"pubkey": "${pubKey}"\x1b[0m\n`);
    console.log('2️⃣  COPIA LA CLAVE PRIVADA EN TUS GITHUB REPOSITORY SECRETS:');
    console.log('   Nombre del Secret: \x1b[33mTAURI_SIGNING_PRIVATE_KEY\x1b[0m');
    console.log(`   Ruta del archivo:  \x1b[34m${privateKeyPath}\x1b[0m\n`);
    console.log('⚠️  ¡IMPORTANTE! Agrega esto a tu .gitignore:');
    console.log('   src-tauri/updater.key\n');
  }
} catch (err) {
  console.error('\n\x1b[31m[ERROR]\x1b[0m Falló la generación de claves:', err.message);
}
