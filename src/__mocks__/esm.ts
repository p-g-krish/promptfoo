import * as path from 'path';

export function getDirectory() {
  return '/test/dir';
}

export function importModule(filePath: string, functionName?: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.resolve(filePath));

  // Handle ES module default exports
  const resolvedMod = mod?.default?.default || mod?.default || mod;

  if (functionName) {
    return resolvedMod[functionName];
  }
  return resolvedMod;
}
