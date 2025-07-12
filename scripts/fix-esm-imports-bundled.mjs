#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix import paths in bundled ESM output
function fixImportPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix semver imports
  content = content.replace(/from "semver\/functions\/(\w+)"/g, 'from "semver/functions/$1.js"');

  // Fix other common import issues for externalized dependencies
  const patterns = [
    // Add .js extension to relative imports
    [/from "(\.[^"]+)(?<!\.js)(?<!\.json)(?<!\.mjs)(?<!\.cjs)"/g, 'from "$1.js"'],
    // Fix directory imports
    [/from "(\.\.?\/[^"]+)\/"$/gm, 'from "$1/index.js"'],
  ];

  for (const [pattern, replacement] of patterns) {
    content = content.replace(pattern, replacement);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed import paths in ${filePath}`);
}

// Fix main entry point
fixImportPaths(path.join(__dirname, '..', 'dist', 'src', 'main.js'));

// Fix library entry point
fixImportPaths(path.join(__dirname, '..', 'dist', 'src', 'index.js'));
