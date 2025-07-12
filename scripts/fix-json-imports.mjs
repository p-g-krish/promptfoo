#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Find all .js files in dist
const jsFiles = glob.sync('dist/**/*.js', { cwd: rootDir });

console.log(`Fixing JSON imports in ${jsFiles.length} files...`);

for (const file of jsFiles) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix JSON imports to add 'with { type: "json" }'
  content = content.replace(
    /import\s+(\w+)\s+from\s+["']([^"']+\.json)["'];?/g,
    (match, varName, jsonPath) => {
      if (match.includes('with') || match.includes('assert')) {
        return match;
      }
      modified = true;
      return `import ${varName} from "${jsonPath}" with { type: "json" };`;
    },
  );

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed JSON imports in ${file}`);
  }
}

console.log('JSON import fixing complete!');
