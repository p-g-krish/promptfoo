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

// Bundle the main CLI entry point
console.log('Building CLI with esbuild...');

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// Plugin to handle package.json imports
const packageJsonPlugin = {
  name: 'package-json',
  setup(build) {
    build.onResolve({ filter: /^\.\.\/package\.json$/ }, (args) => {
      return { path: args.path, namespace: 'package-json' };
    });

    build.onLoad({ filter: /.*/, namespace: 'package-json' }, () => {
      return {
        contents: `
          export const version = ${JSON.stringify(packageJson.version)};
          export const engines = ${JSON.stringify(packageJson.engines)};
          export default ${JSON.stringify(packageJson)};
        `,
        loader: 'js',
      };
    });
  },
};

// Get all dependencies from package.json
const allDependencies = Object.keys(packageJson.dependencies || {});

const externalDependencies = [
  // External all dependencies to avoid bundling issues
  ...allDependencies,

  // Additional patterns for optional dependencies
  '@adaline/*',
  '@aws-sdk/*',
  '@azure/*',
  '@ibm-cloud/*',
  '@ibm-generative-ai/*',
  '@fal-ai/client',
  '@smithy/*',
  '@playwright/*',
  'playwright*',
  'puppeteer*',
];

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: false, // Don't bundle, just transpile
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  keepNames: true,
  loader: {
    '.html': 'text',
    '.py': 'text',
    '.go': 'text',
  },
  plugins: [packageJsonPlugin],
};

try {
  await esbuild.build(buildOptions);

  console.log('Build successful!');

  // Copy static assets
  console.log('Copying static assets...');

  // Ensure directories exist
  fs.mkdirSync('dist/src', { recursive: true });

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
