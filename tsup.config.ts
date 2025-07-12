import { execSync } from 'child_process';
import fs from 'fs';
import { defineConfig } from 'tsup';

const commonConfig = {
  entry: {
    main: 'src/main.ts',
    index: 'src/index.ts',
  },
  target: 'node18',
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    // Native modules
    'better-sqlite3',
    'sharp',
    'fluent-ffmpeg',
    '@swc/core',
    'natural',

    // Optional dependencies that might not be installed
    '@adaline/provider',
    '@aws-sdk/client-bedrock-runtime',
    '@azure/openai',
    '@ibm-cloud/watsonx-ai',
    '@ibm-generative-ai/node-sdk',
    '@fal-ai/client',
    '@smithy/types',
    '@playwright/test',
    'playwright',
    'playwright-extra',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'node-sql-parser',
    'pdf-parse',
    'langfuse',
    'google-auth-library',
    'ibm-cloud-sdk-core',
  ],
};

export default defineConfig([
  // CJS build - bundle dependencies for better compatibility
  {
    ...commonConfig,
    format: ['cjs'],
    shims: true,
    splitting: false,
    esbuildOptions(options) {
      // Add shebang to main entry
      if (options.entryPoints?.[0]?.includes('main')) {
        options.banner = {
          js: '#!/usr/bin/env node',
        };
      }
    },
  },
  // ESM build - transpile only to avoid CJS/ESM interop issues
  {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
    outDir: 'dist',
    format: ['esm'],
    target: 'node18',
    bundle: false,
    dts: false, // DTS is handled by CJS build
    clean: false, // Don't clean, CJS build already did
    sourcemap: true,
    shims: false, // Don't add __dirname/__filename shims - we handle this ourselves
    external: [...commonConfig.external],
    esbuildOptions(options) {
      // Add shebang to main entry
      if (options.entryPoints?.[0]?.includes('main')) {
        options.banner = {
          js: '#!/usr/bin/env node',
        };
      }
    },
    async onSuccess() {
      // Only run post-build tasks once (after ESM build)

      // Fix ESM imports first
      console.log('Fixing ESM imports...');
      execSync('node scripts/fix-all-imports.mjs', { stdio: 'inherit' });

      // Generate constants
      console.log('Generating constants...');
      execSync('node scripts/generate-constants.mjs', { stdio: 'inherit' });

      // Copy static assets
      console.log('Copying static assets...');

      // Ensure directories exist
      fs.mkdirSync('dist/src', { recursive: true });

      // Copy HTML files
      const htmlFiles = fs.readdirSync('src').filter((f) => f.endsWith('.html'));
      for (const file of htmlFiles) {
        fs.copyFileSync(`src/${file}`, `dist/src/${file}`);
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

      // Add shebang to CLI files if not present
      const addShebang = (filePath: string) => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (!content.startsWith('#!/usr/bin/env node')) {
            fs.writeFileSync(filePath, '#!/usr/bin/env node\n' + content);
          }
          fs.chmodSync(filePath, '755');
        }
      };

      addShebang('dist/main.js');
      addShebang('dist/main.cjs');

      console.log('Build complete!');
    },
  },
]);
