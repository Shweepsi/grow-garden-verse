#!/usr/bin/env node

/**
 * Script de synchronisation des versions
 * Lit la version depuis package.json et met à jour tous les fichiers nécessaires
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Lire la version depuis package.json
function getPackageVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

// Calculer le versionCode Android depuis le semantic version
function calculateVersionCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return (major * 10000) + (minor * 100) + patch;
}

// Mettre à jour android/app/build.gradle
function updateAndroidBuildGradle(version, versionCode) {
  const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  
  if (!fs.existsSync(buildGradlePath)) {
    log('⚠️  android/app/build.gradle non trouvé', 'yellow');
    return false;
  }

  let content = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Remplacer versionCode
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${versionCode}`
  );
  
  // Remplacer versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${version}"`
  );
  
  fs.writeFileSync(buildGradlePath, content, 'utf8');
  log(`✓ android/app/build.gradle mis à jour`, 'green');
  return true;
}

// Mettre à jour capacitor.config.ts (optionnel - ajoute version si besoin)
function updateCapacitorConfig(version) {
  const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
  
  if (!fs.existsSync(configPath)) {
    log('⚠️  capacitor.config.ts non trouvé', 'yellow');
    return false;
  }

  let content = fs.readFileSync(configPath, 'utf8');
  
  // Vérifier si la version existe déjà dans le config
  if (content.includes('version:')) {
    content = content.replace(
      /version:\s*['"][^'"]+['"]/,
      `version: '${version}'`
    );
  } else {
    // Ajouter la version avant la fermeture de l'objet config
    content = content.replace(
      /(const config: CapacitorConfig = \{[^}]*)(}\s*;)/,
      `$1  version: '${version}',\n$2`
    );
  }
  
  fs.writeFileSync(configPath, content, 'utf8');
  log(`✓ capacitor.config.ts mis à jour`, 'green');
  return true;
}

// Fonction principale
function syncVersions() {
  try {
    log('\n🔄 Synchronisation des versions...', 'blue');
    
    const version = getPackageVersion();
    const versionCode = calculateVersionCode(version);
    
    log(`\n📦 Version détectée: ${version}`, 'blue');
    log(`🔢 Version Code calculé: ${versionCode}`, 'blue');
    
    log('\n📝 Mise à jour des fichiers:', 'blue');
    
    // Mettre à jour Android
    updateAndroidBuildGradle(version, versionCode);
    
    // Mettre à jour Capacitor (optionnel)
    updateCapacitorConfig(version);
    
    log('\n✅ Synchronisation terminée!', 'green');
    log(`\nVersion: ${version} (code: ${versionCode})\n`, 'green');
    
  } catch (error) {
    log(`\n❌ Erreur lors de la synchronisation: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Exécuter si appelé directement (ESM)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncVersions();
}

export { syncVersions, getPackageVersion, calculateVersionCode };
