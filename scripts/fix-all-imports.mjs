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

console.log(`Fixing all imports in ${jsFiles.length} files...`);

let totalFixed = 0;

for (const file of jsFiles) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix bare "." imports
  content = content.replace(/from\s+["']\.["']/g, 'from "./index.js"');
  if (content.includes('from "./index.js"')) {
    modified = true;
  }

  // Fix relative imports to add .js extension
  content = content.replace(/from\s+["'](\.[^"']+)["']/g, (match, importPath) => {
    // Skip if already has extension or is a .node.js file
    if (
      importPath.endsWith('.js') ||
      importPath.endsWith('.json') ||
      importPath.endsWith('.mjs') ||
      importPath.endsWith('.cjs') ||
      importPath.endsWith('.node') ||
      importPath.includes('.node.js') ||
      importPath === '.'
    ) {
      return match;
    }

    // Check if it's a directory by seeing if index.js exists
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const indexPath = path.join(resolvedPath, 'index.js');

    if (fs.existsSync(indexPath)) {
      modified = true;
      return `from "${importPath}/index.js"`;
    } else if (fs.existsSync(resolvedPath + '.js')) {
      modified = true;
      return `from "${importPath}.js"`;
    }

    return match;
  });

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

  // Fix known external imports
  const externalFixes = {
    'semver/functions/gt': 'semver/functions/gt.js',
    'semver/functions/gte': 'semver/functions/gte.js',
    'semver/functions/lt': 'semver/functions/lt.js',
    'semver/functions/lte': 'semver/functions/lte.js',
    'semver/functions/satisfies': 'semver/functions/satisfies.js',
    'semver/functions/coerce': 'semver/functions/coerce.js',
  };

  Object.entries(externalFixes).forEach(([from, to]) => {
    const regex = new RegExp(`from\\s+["']${from}["']`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `from "${to}"`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${file}`);
    totalFixed++;
  }
}

console.log(`Import fixing complete! Fixed ${totalFixed} files.`);
