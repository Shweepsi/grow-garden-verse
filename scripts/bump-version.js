#!/usr/bin/env node

/**
 * Script de bump de version
 * Incrémente la version dans package.json et synchronise tous les fichiers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { syncVersions } = require('./sync-versions');

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Lire package.json
function readPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
}

// Écrire package.json
function writePackageJson(packageJson) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

// Incrémenter la version
function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Type de bump invalide: ${type}. Utilisez: major, minor, ou patch`);
  }
}

// Créer un commit Git
function gitCommit(version) {
  try {
    // Vérifier si Git est disponible
    execSync('git --version', { stdio: 'ignore' });
    
    // Ajouter les fichiers modifiés
    execSync('git add package.json android/app/build.gradle capacitor.config.ts', { stdio: 'inherit' });
    
    // Créer le commit
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    
    log(`✓ Commit Git créé pour la version ${version}`, 'green');
    return true;
  } catch (error) {
    log('⚠️  Git non disponible ou pas de changements à commiter', 'yellow');
    return false;
  }
}

// Créer un tag Git
function gitTag(version) {
  try {
    execSync(`git tag v${version}`, { stdio: 'inherit' });
    log(`✓ Tag Git créé: v${version}`, 'green');
    log(`\n💡 Pour pousser le tag: git push origin v${version}`, 'blue');
    return true;
  } catch (error) {
    log('⚠️  Impossible de créer le tag Git', 'yellow');
    return false;
  }
}

// Fonction principale
function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0];
  
  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    log('❌ Usage: npm run version:[patch|minor|major]', 'red');
    log('   Exemples:', 'blue');
    log('   - npm run version:patch  (1.0.0 → 1.0.1)', 'blue');
    log('   - npm run version:minor  (1.0.0 → 1.1.0)', 'blue');
    log('   - npm run version:major  (1.0.0 → 2.0.0)', 'blue');
    process.exit(1);
  }
  
  try {
    log(`\n🚀 Bump de version (${bumpType})...`, 'blue');
    
    // Lire la version actuelle
    const packageJson = readPackageJson();
    const oldVersion = packageJson.version;
    const newVersion = bumpVersion(oldVersion, bumpType);
    
    log(`\n📦 ${oldVersion} → ${newVersion}`, 'yellow');
    
    // Mettre à jour package.json
    packageJson.version = newVersion;
    writePackageJson(packageJson);
    log(`✓ package.json mis à jour`, 'green');
    
    // Synchroniser tous les fichiers
    log('');
    syncVersions();
    
    // Créer le commit et le tag Git
    log('\n📝 Git:', 'blue');
    const committed = gitCommit(newVersion);
    if (committed) {
      gitTag(newVersion);
    }
    
    log(`\n✅ Version bumpée avec succès: ${newVersion}`, 'green');
    log(`\n💡 Prochaines étapes:`, 'blue');
    log(`   1. Vérifier les changements: git diff`, 'blue');
    log(`   2. Pousser les changements: git push`, 'blue');
    if (committed) {
      log(`   3. Pousser le tag: git push origin v${newVersion}`, 'blue');
    }
    log('');
    
  } catch (error) {
    log(`\n❌ Erreur: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Exécuter
main();
