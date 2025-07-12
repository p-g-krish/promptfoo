#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Map of known problematic imports
const importFixes = {
  'semver/functions/gt': 'semver/functions/gt.js',
  'semver/functions/gte': 'semver/functions/gte.js',
  'semver/functions/lt': 'semver/functions/lt.js',
  'semver/functions/lte': 'semver/functions/lte.js',
  'semver/functions/satisfies': 'semver/functions/satisfies.js',
  'semver/functions/coerce': 'semver/functions/coerce.js',
};

// Find all .js files in dist
const jsFiles = glob.sync('dist/**/*.js', { cwd: rootDir });

console.log(`Fixing external imports in ${jsFiles.length} files...`);

for (const file of jsFiles) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix known problematic imports
  Object.entries(importFixes).forEach(([from, to]) => {
    const regex = new RegExp(`from\\s+["']${from}["']`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `from "${to}"`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed external imports in ${file}`);
  }
}

console.log('External import fixing complete!');
