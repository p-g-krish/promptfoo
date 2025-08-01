import cliState from '../cliState';
import { importModule } from '../esm';
import logger from '../logger';
import { runPython } from '../python/pythonUtils';
import { safeJoin } from './file.node';
import { isJavascriptFile } from './fileExtensions';

import type { Vars } from '../types';

export type TransformContext = object;

export enum TransformInputType {
  OUTPUT = 'output',
  VARS = 'vars',
}

/**
 * Parses a file path string to extract the file path and function name.
 * @param filePath - The file path string, potentially including a function name.
 * @returns A tuple containing the file path and function name (if present).
 */
function parseFilePathAndFunctionName(filePath: string): [string, string | undefined] {
  const parts = filePath.split(':');
  return parts.length === 2 ? [parts[0], parts[1]] : [filePath, undefined];
}

/**
 * Retrieves a JavaScript transform function from a file.
 * @param filePath - The path to the JavaScript file.
 * @param functionName - Optional name of the function to retrieve.
 * @returns A Promise resolving to the requested function.
 * @throws Error if the file doesn't export a valid function.
 */
async function getJavascriptTransformFunction(
  filePath: string,
  functionName?: string,
): Promise<Function> {
  const requiredModule = await importModule(filePath);

  if (functionName && typeof requiredModule[functionName] === 'function') {
    return requiredModule[functionName];
  } else if (typeof requiredModule === 'function') {
    return requiredModule;
  } else if (requiredModule.default && typeof requiredModule.default === 'function') {
    return requiredModule.default;
  }
  throw new Error(
    `Transform ${filePath} must export a function, have a default export as a function, or export the specified function "${functionName}"`,
  );
}

/**
 * Creates a function that runs a Python transform function.
 * @param filePath - The path to the Python file.
 * @param functionName - The name of the function to run (defaults to 'get_transform').
 * @returns A function that executes the Python transform.
 */
function getPythonTransformFunction(
  filePath: string,
  functionName: string = 'get_transform',
): Function {
  return async (output: string, context: { vars: Vars }) => {
    return runPython(filePath, functionName, [output, context]);
  };
}

/**
 * Retrieves a transform function from a file, supporting both JavaScript and Python.
 * @param filePath - The path to the file, including the 'file://' prefix.
 * @returns A Promise resolving to the requested function.
 * @throws Error if the file format is unsupported.
 */
async function getFileTransformFunction(filePath: string): Promise<Function> {
  const [actualFilePath, functionName] = parseFilePathAndFunctionName(
    filePath.slice('file://'.length),
  );

  const fullPath = safeJoin(cliState.basePath || '', actualFilePath);

  if (isJavascriptFile(fullPath)) {
    return getJavascriptTransformFunction(fullPath, functionName);
  } else if (fullPath.endsWith('.py')) {
    return getPythonTransformFunction(fullPath, functionName);
  }
  throw new Error(`Unsupported transform file format: file://${actualFilePath}`);
}

/**
 * Creates a function from inline JavaScript code.
 * @param code - The JavaScript code to convert into a function.
 * @returns A Function created from the provided code.
 */
function getInlineTransformFunction(code: string, inputType: TransformInputType): Function {
  return new Function(inputType, 'context', code.includes('\n') ? code : `return ${code}`);
}

/**
 * Determines and retrieves the appropriate transform function based on the input.
 * @param codeOrFilepath - Either inline code or a file path starting with 'file://'.
 * @returns A Promise resolving to the appropriate transform function.
 */
async function getTransformFunction(
  codeOrFilepath: string,
  inputType: TransformInputType,
): Promise<Function | null> {
  let transformFn: Function | null = null;
  if (codeOrFilepath.startsWith('file://')) {
    try {
      transformFn = await getFileTransformFunction(codeOrFilepath);
    } catch (error) {
      logger.error(
        `Error loading transform function from file: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  } else {
    try {
      transformFn = getInlineTransformFunction(codeOrFilepath, inputType);
    } catch (error) {
      logger.error(
        `Error creating inline transform function: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
  return transformFn;
}

/**
 * Transforms the output using a specified function or file.
 *
 * @param codeOrFilepath - The transformation function code or file path.
 * If it starts with 'file://', it's treated as a file path. The file path can
 * optionally include a function name (e.g., 'file://transform.js:myFunction').
 * If no function name is provided for Python files, it defaults to 'get_transform'.
 * For inline code, it's treated as JavaScript.
 * @param transformInput - The output to be transformed. Can be a string or an object.
 * @param context - A context object that will be passed to the transform function.
 * @param validateReturn - Optional. If true, throws an error if the transform function doesn't return a value.
 * @returns A promise that resolves to the transformed output.
 * @throws Error if the file format is unsupported or if the transform function
 * doesn't return a value (unless validateReturn is false).
 */
export async function transform(
  codeOrFilepath: string,
  transformInput: string | object | undefined,
  context: TransformContext,
  validateReturn: boolean = true,
  inputType: TransformInputType = TransformInputType.OUTPUT,
): Promise<any> {
  const postprocessFn = await getTransformFunction(codeOrFilepath, inputType);
  if (!postprocessFn) {
    throw new Error(`Invalid transform function for ${codeOrFilepath}`);
  }

  const ret = await Promise.resolve(postprocessFn(transformInput, context));

  if (validateReturn && (ret === null || ret === undefined)) {
    throw new Error(`Transform function did not return a value\n\n${codeOrFilepath}`);
  }

  return ret;
}
