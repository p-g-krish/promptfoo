import type { Prompt } from '../../types';
import { PROMPT_DELIMITER } from '../constants';
import { BaseFileProcessor } from './base';

/**
 * Processes text files, splitting by delimiter if present
 */
export class TextFileProcessor extends BaseFileProcessor {
  process(filePath: string, prompt: Partial<Prompt>): Prompt[] {
    const fileContent = this.readFileContent(filePath);
    const lines = fileContent.split(/\r?\n/);
    const prompts: Prompt[] = [];
    let buffer: string[] = [];

    const flush = () => {
      const raw = buffer.join('\n').trim();
      if (raw.length > 0) {
        prompts.push({
          raw,
          label: this.generateLabel(filePath, undefined, prompt.label, raw),
          config: prompt.config,
        });
      }
      buffer = [];
    };

    for (const line of lines) {
      if (line.trim() === PROMPT_DELIMITER) {
        flush();
      } else {
        buffer.push(line);
      }
    }
    flush();

    return prompts;
  }
}

// Export function for backward compatibility
export function processTxtFile(filePath: string, prompt: Partial<Prompt>): Prompt[] {
  return new TextFileProcessor().process(filePath, prompt);
}
