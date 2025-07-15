import type { Options as PythonShellOptions } from 'python-shell';
import { PythonShell } from 'python-shell';
import { getEnvString } from '../../envars';
import logger from '../../logger';
import { runPython } from '../../python/pythonUtils';
import type { Prompt, ApiProvider, PromptFunctionContext } from '../../types';
import invariant from '../../util/invariant';
import { safeJsonStringify } from '../../util/json';
import { BaseFileProcessor } from './base';

/**
 * Processes Python files with consistent function handling
 * - Without function name: runs the entire file (expects it to print output)
 * - With function name: calls the specific function
 */
export class PythonFileProcessor extends BaseFileProcessor {
  private transformContext(context: {
    vars: Record<string, string | object>;
    provider?: ApiProvider;
    config?: Record<string, any>;
  }): PromptFunctionContext {
    invariant(context.provider?.id, 'provider.id is required');
    return {
      vars: context.vars,
      provider: {
        id: typeof context.provider?.id === 'function' ? context.provider?.id() : context.provider?.id,
        label: context.provider?.label,
      },
      config: context.config ?? {},
    };
  }

  private async runPythonFile(
    filePath: string,
    context: any
  ): Promise<string> {
    const transformedContext = this.transformContext(context);
    const options: PythonShellOptions = {
      mode: 'text',
      pythonPath: getEnvString('PROMPTFOO_PYTHON', 'python'),
      args: [safeJsonStringify(transformedContext) as string],
    };
    
    logger.debug(`Executing python prompt script ${filePath}`);
    const results = (await PythonShell.run(filePath, options)).join('\n');
    logger.debug(`Python prompt script ${filePath} returned: ${results}`);
    return results;
  }

  private async runPythonFunction(
    filePath: string,
    functionName: string,
    context: any
  ): Promise<string> {
    const transformedContext = this.transformContext(context);
    return runPython(filePath, functionName, [transformedContext]);
  }

  process(
    filePath: string,
    prompt: Partial<Prompt>,
    functionName?: string
  ): Prompt[] {
    this.validatePath(filePath);
    this.validateFunctionName(functionName);
    
    const fileContent = this.readFileContent(filePath);
    const label = this.generateLabel(filePath, functionName, prompt.label);
    
    return [{
      raw: fileContent,
      label,
      function: functionName
        ? (context) => this.runPythonFunction(filePath, functionName, { ...context, config: prompt.config })
        : (context) => this.runPythonFile(filePath, { ...context, config: prompt.config }),
      config: prompt.config,
    }];
  }
}

// Export legacy functions for backward compatibility
export const pythonPromptFunction = async (
  filePath: string,
  functionName: string,
  context: any
) => {
  const processor = new PythonFileProcessor();
  return processor['runPythonFunction'](filePath, functionName, context);
};

export const pythonPromptFunctionLegacy = async (
  filePath: string,
  context: any
): Promise<string> => {
  const processor = new PythonFileProcessor();
  return processor['runPythonFile'](filePath, context);
};

export function processPythonFile(
  filePath: string,
  prompt: Partial<Prompt>,
  functionName?: string
): Prompt[] {
  return new PythonFileProcessor().process(filePath, prompt, functionName);
}
