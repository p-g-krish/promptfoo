import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import logger from '../../logger';
import type { Prompt, ApiProvider, PromptFunctionContext } from '../../types';
import invariant from '../../util/invariant';
import { safeJsonStringify } from '../../util/json';
import { BaseFileProcessor } from './base';

const execAsync = promisify(exec);

interface GoPromptResult {
  prompt: string;
  error?: string;
}

/**
 * Processes Go files with consistent function handling
 * - Without function name: looks for GetPrompt function (default)
 * - With function name: calls the specific function
 */
export class GoFileProcessor extends BaseFileProcessor {
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

  private async compileAndRun(
    filePath: string,
    functionName: string,
    context: any
  ): Promise<string> {
    const transformedContext = this.transformContext(context);
    
    // Create a temporary directory for compilation
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptfoo-go-'));
    
    try {
      // Read the Go file
      const goCode = this.readFileContent(filePath);

      // Create a main.go file that calls the specified function
      const mainGoContent = `package main

import (
  "encoding/json"
  "fmt"
  "os"
)

// PromptContext represents the context passed to prompt functions
type PromptContext struct {
  Vars     map[string]interface{} ` + '`json:"vars"`' + `
  Provider struct {
    ID     string                 ` + '`json:"id"`' + `
    Label  string                 ` + '`json:"label"`' + `
  } ` + '`json:"provider"`' + `
  Config   map[string]interface{} ` + '`json:"config"`' + `
}

${goCode}

func main() {
  // Read context from stdin
  var context PromptContext
  decoder := json.NewDecoder(os.Stdin)
  if err := decoder.Decode(&context); err != nil {
    result := map[string]interface{}{
      "error": fmt.Sprintf("Failed to decode context: %v", err),
    }
    json.NewEncoder(os.Stdout).Encode(result)
    os.Exit(1)
  }

  // Call the specified function
  prompt := ${functionName}(context)
  
  // Return the result as JSON
  result := map[string]interface{}{
    "prompt": prompt,
  }
  json.NewEncoder(os.Stdout).Encode(result)
}`;

      const mainGoPath = path.join(tempDir, 'main.go');
      fs.writeFileSync(mainGoPath, mainGoContent);

      // Compile the Go program
      logger.debug(`Compiling Go prompt file: ${filePath}`);
      const { stderr: compileError } = await execAsync(
        `go build -o prompt_wrapper main.go`,
        { cwd: tempDir }
      );

      if (compileError) {
        logger.warn(`Go compilation warnings: ${compileError}`);
      }

      // Execute the compiled program with context as input
      const contextJson = safeJsonStringify(transformedContext);
      
      // Use spawn to execute with stdin
      const result = await new Promise<GoPromptResult>((resolve, reject) => {
        const child = spawn('./prompt_wrapper', [], { cwd: tempDir });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('error', reject);

        child.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Go process exited with code ${code}: ${stderr}`));
          } else {
            if (stderr) {
              logger.warn(`Go execution warnings: ${stderr}`);
            }
            try {
              const parsedResult: GoPromptResult = JSON.parse(stdout);
              resolve(parsedResult);
            } catch (e) {
              reject(new Error(`Failed to parse Go output: ${stdout}`));
            }
          }
        });

        // Write context to stdin
        child.stdin.write(contextJson);
        child.stdin.end();
      });
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.prompt;
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn(`Failed to clean up temp directory ${tempDir}: ${e}`);
      }
    }
  }

  process(
    filePath: string,
    prompt: Partial<Prompt>,
    functionName?: string
  ): Prompt[] {
    this.validatePath(filePath);
    this.validateFunctionName(functionName);
    
    // Default to 'GetPrompt' function if no function name specified
    const targetFunction = functionName || 'GetPrompt';
    
    const fileContent = this.readFileContent(filePath);
    const label = this.generateLabel(filePath, targetFunction, prompt.label);
    
    return [{
      raw: fileContent,
      label,
      function: (context) => this.compileAndRun(filePath, targetFunction, { ...context, config: prompt.config }),
      config: prompt.config,
    }];
  }
}

// Export legacy function for backward compatibility
export const goPromptFunction = async (
  filePath: string,
  functionName: string,
  context: any
): Promise<string> => {
  const processor = new GoFileProcessor();
  return processor['compileAndRun'](filePath, functionName, context);
};

export function processGolangFile(
  filePath: string,
  prompt: Partial<Prompt>,
  functionName?: string
): Prompt[] {
  return new GoFileProcessor().process(filePath, prompt, functionName);
}