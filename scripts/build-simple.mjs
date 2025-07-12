#!/usr/bin/env node
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// First, generate constants
console.log('Generating constants...');
execSync('node scripts/generate-constants.mjs', { stdio: 'inherit' });

// Build TypeScript types
console.log('Building TypeScript declarations...');
execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' });

// Copy all source files maintaining structure
console.log('Copying source files...');
execSync('shx rm -rf dist/src && shx mkdir -p dist/src', { stdio: 'inherit' });

// Use esbuild to transpile TypeScript to JavaScript
console.log('Transpiling TypeScript to JavaScript...');

const buildOptions = {
  entryPoints: ['src/**/*.ts', 'src/**/*.tsx'],
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  keepNames: true,
  loader: {
    '.html': 'text',
    '.py': 'text',
    '.go': 'text',
  },
};

try {
  await esbuild.build(buildOptions);

  console.log('Build successful!');

  // Copy static assets
  console.log('Copying static assets...');

  // Copy HTML files
  const htmlFiles = fs.readdirSync('src').filter((f) => f.endsWith('.html'));
  for (const file of htmlFiles) {
    fs.copyFileSync(path.join('src', file), path.join('dist/src', file));
  }

  // Copy Python wrapper
  fs.mkdirSync('dist/src/python', { recursive: true });
  fs.copyFileSync('src/python/wrapper.py', 'dist/src/python/wrapper.py');

  // Copy Go wrapper
  fs.mkdirSync('dist/src/golang', { recursive: true });
  fs.copyFileSync('src/golang/wrapper.go', 'dist/src/golang/wrapper.go');

  // Copy drizzle migrations
  execSync('shx rm -rf dist/drizzle && shx cp -r drizzle dist/drizzle', { stdio: 'inherit' });

  // Build the app
  console.log('Building React app...');
  execSync('npm run build:app', { stdio: 'inherit' });

  // Add shebang to main.js
  const mainPath = 'dist/src/main.js';
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (!mainContent.startsWith('#!/usr/bin/env node')) {
    fs.writeFileSync(mainPath, '#!/usr/bin/env node\n' + mainContent);
  }

  // Make the CLI executable
  fs.chmodSync(mainPath, '755');

  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
