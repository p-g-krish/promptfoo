import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of module names that should resolve to index.js
const INDEX_MODULES = new Set(['util', 'providers', 'assertions', 'prompts', 'redteam', 'types']);

// Special cases that should NOT resolve to index.js
const NON_INDEX_MODULES = new Set(['fetch']);

// Fix ESM imports in the built files
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileDir = path.dirname(filePath);

  // Fix imports
  let fixedContent = content.replace(
    /from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.scss)(?<!\.html)['"]/g,
    (match, importPath) => {
      // Calculate the actual file path
      const resolvedPath = path.resolve(fileDir, importPath);

      // Check if it's a directory
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        // Check if index.js exists in the directory
        if (fs.existsSync(path.join(resolvedPath, 'index.js'))) {
          return `from '${importPath}/index.js'`;
        }
      }

      // Check if .js file exists
      if (fs.existsSync(resolvedPath + '.js')) {
        return `from '${importPath}.js'`;
      }

      // Check if this is a known directory module
      const pathParts = importPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      if (INDEX_MODULES.has(lastPart) && !NON_INDEX_MODULES.has(lastPart)) {
        return `from '${importPath}/index.js'`;
      }

      // Otherwise, just add .js extension
      return `from '${importPath}.js'`;
    },
  );

  // Fix dynamic imports
  fixedContent = fixedContent.replace(
    /import\s*\((['"])(\.[^'"]+)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.scss)(?<!\.html)\1\)/g,
    (match, quote, importPath) => {
      // Calculate the actual file path
      const resolvedPath = path.resolve(fileDir, importPath);

      // Check if it's a directory
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        // Check if index.js exists in the directory
        if (fs.existsSync(path.join(resolvedPath, 'index.js'))) {
          return `import(${quote}${importPath}/index.js${quote})`;
        }
      }

      // Check if .js file exists
      if (fs.existsSync(resolvedPath + '.js')) {
        return `import(${quote}${importPath}.js${quote})`;
      }

      // Check if this is a known directory module
      const pathParts = importPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      if (INDEX_MODULES.has(lastPart) && !NON_INDEX_MODULES.has(lastPart)) {
        return `import(${quote}${importPath}/index.js${quote})`;
      }

      // Otherwise, just add .js extension
      return `import(${quote}${importPath}.js${quote})`;
    },
  );

  // Fix any incorrect /index.js for special files
  fixedContent = fixedContent.replace(
    /from\s+['"](\.[^'"]+)\/assertions\/index\.js['"]/g,
    (match, basePath) => {
      // Check if assertions.js exists at this path
      const assertionsPath = path.resolve(fileDir, basePath, 'assertions.js');
      if (fs.existsSync(assertionsPath)) {
        return `from '${basePath}/assertions.js'`;
      }
      return match;
    },
  );

  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed imports in ${path.relative(process.cwd(), filePath)}`);
  }
}

// Process all .js files in dist
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log('Fixing ESM imports in dist directory...');
  processDirectory(distPath);
  console.log('Done fixing ESM imports.');
} else {
  console.error('dist directory not found. Run build first.');
  process.exit(1);
}
