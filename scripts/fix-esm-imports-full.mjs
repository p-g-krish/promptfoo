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

console.log(`Fixing ESM imports in ${jsFiles.length} files...`);

for (const file of jsFiles) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix relative imports to add .js extension
  content = content.replace(/from\s+["'](\.[^"']+)["']/g, (match, importPath) => {
    // Skip if already has extension or is a .node.js file
    if (
      importPath.endsWith('.js') ||
      importPath.endsWith('.json') ||
      importPath.endsWith('.mjs') ||
      importPath.endsWith('.cjs') ||
      importPath.endsWith('.node') ||
      importPath.includes('.node.js')
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

  // Fix import statements (same logic)
  content = content.replace(
    /import\s+(.+?)\s+from\s+["'](\.[^"']+)["']/g,
    (match, imports, importPath) => {
      if (
        importPath.endsWith('.js') ||
        importPath.endsWith('.json') ||
        importPath.endsWith('.mjs') ||
        importPath.endsWith('.cjs') ||
        importPath.endsWith('.node') ||
        importPath.includes('.node.js')
      ) {
        return match;
      }

      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const indexPath = path.join(resolvedPath, 'index.js');

      if (fs.existsSync(indexPath)) {
        modified = true;
        return `import ${imports} from "${importPath}/index.js"`;
      } else if (fs.existsSync(resolvedPath + '.js')) {
        modified = true;
        return `import ${imports} from "${importPath}.js"`;
      }

      return match;
    },
  );

  // Fix dynamic imports
  content = content.replace(/import\(["'](\.[^"']+)["']\)/g, (match, importPath) => {
    if (
      importPath.endsWith('.js') ||
      importPath.endsWith('.json') ||
      importPath.endsWith('.mjs') ||
      importPath.endsWith('.cjs') ||
      importPath.endsWith('.node') ||
      importPath.includes('.node.js')
    ) {
      return match;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const indexPath = path.join(resolvedPath, 'index.js');

    if (fs.existsSync(indexPath)) {
      modified = true;
      return `import("${importPath}/index.js")`;
    } else if (fs.existsSync(resolvedPath + '.js')) {
      modified = true;
      return `import("${importPath}.js")`;
    }

    return match;
  });

  // Fix export from statements
  content = content.replace(/export\s+\*\s+from\s+["'](\.[^"']+)["']/g, (match, importPath) => {
    if (
      importPath.endsWith('.js') ||
      importPath.endsWith('.json') ||
      importPath.endsWith('.mjs') ||
      importPath.endsWith('.cjs') ||
      importPath.endsWith('.node') ||
      importPath.includes('.node.js')
    ) {
      return match;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const indexPath = path.join(resolvedPath, 'index.js');

    if (fs.existsSync(indexPath)) {
      modified = true;
      return `export * from "${importPath}/index.js"`;
    } else if (fs.existsSync(resolvedPath + '.js')) {
      modified = true;
      return `export * from "${importPath}.js"`;
    }

    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${file}`);
  }
}

console.log('ESM import fixing complete!');
