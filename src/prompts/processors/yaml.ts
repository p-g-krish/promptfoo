import yaml from 'js-yaml';
import logger from '../../logger';
import type { Prompt } from '../../types';
import { BaseFileProcessor } from './base';

/**
 * Processes YAML files with optional parsing attempt
 */
export class YamlFileProcessor extends BaseFileProcessor {
  process(filePath: string, prompt: Partial<Prompt>): Prompt[] {
    const content = this.readFileContent(filePath);
    
    // Try to parse YAML to validate it, but still return raw content
    try {
      yaml.load(content);
    } catch (e) {
      logger.debug(`YAML parsing warning for ${filePath}: ${e}`);
    }
    
    return [{
      raw: content,
      label: this.generateLabel(filePath, undefined, prompt.label, content),
      config: prompt.config,
    }];
  }
}

// Export function for backward compatibility
export function processYamlFile(filePath: string, prompt: Partial<Prompt>): Prompt[] {
  return new YamlFileProcessor().process(filePath, prompt);
}
