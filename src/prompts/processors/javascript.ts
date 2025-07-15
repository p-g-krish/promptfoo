import type { Prompt, ApiProvider, PromptFunctionContext } from '../../types';
import { importModule } from '../../esm';
import invariant from '../../util/invariant';
import { BaseFileProcessor } from './base';

const transformContext = (context: {
  vars: Record<string, string | object>;
  provider?: ApiProvider;
  config?: Record<string, any>;
}): PromptFunctionContext => {
  invariant(context.provider, 'Provider is required');
  return {
    vars: context.vars,
    provider: { id: context.provider.id(), label: context.provider.label },
    config: context.config ?? {},
  };
};

/**
 * Processes JavaScript/TypeScript files with consistent function handling
 * - Without function name: imports default export or module.exports
 * - With function name: imports specific named export
 */
export class JavaScriptFileProcessor extends BaseFileProcessor {
  async process(
    filePath: string,
    prompt: Partial<Prompt>,
    functionName?: string
  ): Promise<Prompt[]> {
    this.validatePath(filePath);
    this.validateFunctionName(functionName);
    
    const promptFunction = await importModule(filePath, functionName);
    
    return [{
      raw: String(promptFunction),
      label: this.generateLabel(filePath, functionName, prompt.label),
      function: (context) =>
        promptFunction(
          transformContext({
            ...context,
            config: prompt.config ?? {},
          }),
        ),
      config: prompt.config ?? {},
    }];
  }
}

// Export function for backward compatibility
export async function processJsFile(
  filePath: string,
  prompt: Partial<Prompt>,
  functionName?: string
): Promise<Prompt[]> {
  return new JavaScriptFileProcessor().process(filePath, prompt, functionName);
}
