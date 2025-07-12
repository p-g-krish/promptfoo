import * as path from 'path';
import logger from '../logger';

export function getDirectory() {
  return '/test/dir';
}

export function importModule(filePath: string, functionName?: string) {
  const resolvedPath = path.resolve(filePath);
  
  logger.debug(
    `Attempting to import module: ${JSON.stringify({ resolvedPath, moduleId: filePath })}`,
  );
  
  if (filePath.endsWith('.ts') || filePath.endsWith('.mjs')) {
    logger.debug('TypeScript/ESM module detected, importing tsx/cjs');
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(resolvedPath);

  // Handle ES module default exports
  const resolvedMod = mod?.default?.default || mod?.default || mod;
  
  logger.debug(
    `Successfully required module: ${JSON.stringify({ resolvedPath, moduleId: filePath })}`,
  );

  if (functionName) {
    logger.debug(`Returning named export: ${functionName}`);
    return resolvedMod[functionName];
  }
  return resolvedMod;
}
