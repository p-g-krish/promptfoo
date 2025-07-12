import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'path';
import logger from './logger';
import { safeResolve } from './util/file.node.js';

// esm-specific helper that needs to get mocked out in tests
export function getDirectory(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

export async function importModule(modulePath: string, functionName?: string) {
  logger.debug(
    `Attempting to import module: ${JSON.stringify({ resolvedPath: safeResolve(modulePath), moduleId: modulePath })}`,
  );

  try {
    if (modulePath.endsWith('.ts') || modulePath.endsWith('.mjs')) {
      logger.debug('TypeScript/ESM module detected, importing tsx/cjs');
      // @ts-ignore: It actually works
      await import('tsx/cjs');
    }

    const resolvedPath = pathToFileURL(safeResolve(modulePath));
    logger.debug(`Attempting ESM import from: ${resolvedPath.toString()}`);
    const importedModule = await import(resolvedPath.toString());
    const mod = importedModule?.default?.default || importedModule?.default || importedModule;
    logger.debug(
      `Successfully imported module: ${JSON.stringify({ resolvedPath, moduleId: modulePath })}`,
    );
    if (functionName) {
      logger.debug(`Returning named export: ${functionName}`);
      return mod[functionName];
    }
    return mod;
  } catch (err) {
    logger.debug(`ESM import failed: ${err}`);
    throw err;
  }
}
