#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function addShebang(filePath) {
  const fullPath = path.join(rootDir, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      console.log(`Adding shebang to ${filePath}`);
      fs.writeFileSync(fullPath, '#!/usr/bin/env node\n' + content);
    }
    fs.chmodSync(fullPath, '755');
  }
}

// Add shebangs to CLI files
addShebang('dist/main.js');
addShebang('dist/main.cjs');
