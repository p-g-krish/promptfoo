import type { Prompt } from '../../types';
import { BaseFileProcessor } from './base';

/**
 * Processes JSON files - each file is treated as a single prompt
 */
export class JsonFileProcessor extends BaseFileProcessor {
  process(filePath: string, prompt: Partial<Prompt>): Prompt[] {
    return this.processSimpleFile(filePath, prompt);
  }
}

// Export function for backward compatibility
export function processJsonFile(filePath: string, prompt: Partial<Prompt>): Prompt[] {
  return new JsonFileProcessor().process(filePath, prompt);
}
