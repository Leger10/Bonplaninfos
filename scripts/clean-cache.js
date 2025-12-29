import { rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

console.log('🧹 Nettoyage simple des caches...\n');

// Dossiers à supprimer
const dirs = [
  'dist',
  'build', 
  'node_modules/.cache',
  'node_modules/.vite',
  '.eslintcache'
];

dirs.forEach(dir => {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`✅ ${dir} supprimé`);
    }
  } catch (err) {
    console.log(`⚠️  ${dir}: ${err.message}`);
  }
});

console.log('\n✅ Nettoyage terminé!');
console.log('\nExécutez: npm install && npm run dev');