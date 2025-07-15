import * as fs from 'fs';
import * as path from 'path';
import type { Prompt } from '../../types';
import logger from '../../logger';

/**
 * Base class for all file processors to eliminate code duplication
 */
export abstract class BaseFileProcessor {
  /**
   * Validates that a file path doesn't escape the base directory
   */
  protected validatePath(filePath: string, basePath?: string): void {
    const base = basePath || process.cwd();
    const resolved = path.resolve(base, filePath);
    const normalizedBase = path.resolve(base);
    
    if (!resolved.startsWith(normalizedBase)) {
      throw new Error(`Path traversal attempt detected: ${filePath}`);
    }
  }

  /**
   * Validates function names to prevent code injection
   */
  protected validateFunctionName(functionName?: string): void {
    if (functionName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
      throw new Error(`Invalid function name: ${functionName}`);
    }
  }

  /**
   * Reads file content with size validation
   */
  protected readFileContent(filePath: string): string {
    this.validatePath(filePath);
    
    const stats = fs.statSync(filePath);
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${filePath} (${stats.size} bytes)`);
    }
    
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Generates a consistent label for prompts
   */
  protected generateLabel(
    filePath: string, 
    functionName?: string,
    customLabel?: string,
    contentPreview?: string
  ): string {
    if (customLabel) {
      return customLabel;
    }
    
    if (functionName) {
      return `${filePath}:${functionName}`;
    }
    
    if (contentPreview) {
      const preview = contentPreview.slice(0, 50).replace(/\n/g, ' ');
      return `${filePath}: ${preview}...`;
    }
    
    return filePath;
  }

  /**
   * Common processing logic for simple file types
   */
  protected processSimpleFile(
    filePath: string,
    prompt: Partial<Prompt>,
    includeContentInLabel: boolean = true
  ): Prompt[] {
    const content = this.readFileContent(filePath);
    
    return [{
      raw: content,
      label: this.generateLabel(
        filePath,
        undefined,
        prompt.label,
        includeContentInLabel ? content : undefined
      ),
      config: prompt.config,
    }];
  }

  /**
   * Abstract method for processing files with function support
   */
  abstract process(
    filePath: string,
    prompt: Partial<Prompt>,
    functionName?: string
  ): Prompt[] | Promise<Prompt[]>;
} 