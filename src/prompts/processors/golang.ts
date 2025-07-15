import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import logger from '../../logger';
import type { Prompt, ApiProvider, PromptFunctionContext } from '../../types';
import invariant from '../../util/invariant';
import { safeJsonStringify } from '../../util/json';

const execAsync = promisify(exec);

interface GoPromptResult {
  prompt: string;
  error?: string;
}

/**
 * Go prompt function. Runs a specific function from the Go file.
 * @param filePath - Path to the Go file.
 * @param functionName - Function name to execute.
 * @param context - Context for the prompt.
 * @returns The prompt string
 */
export const goPromptFunction = async (
  filePath: string,
  functionName: string,
  context: {
    vars: Record<string, string | object>;
    provider?: ApiProvider;
    config?: Record<string, any>;
  },
): Promise<string> => {
  invariant(context.provider?.id, 'provider.id is required');
  
  const transformedContext: PromptFunctionContext = {
    vars: context.vars,
    provider: {
      id: typeof context.provider?.id === 'function' ? context.provider?.id() : context.provider?.id,
      label: context.provider?.label,
    },
    config: context.config ?? {},
  };

  // Create a temporary directory for compilation
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptfoo-go-'));
  
  try {
    // Read the Go file
    const goCode = fs.readFileSync(filePath, 'utf8');

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
};

/**
 * Processes a Go file to execute a function as a prompt.
 * @param filePath - Path to the Go file.
 * @param prompt - The raw prompt data.
 * @param functionName - Function name to execute (required for Go files).
 * @returns Array of prompts extracted or executed from the file.
 */
export function processGolangFile(
  filePath: string,
  prompt: Partial<Prompt>,
  functionName: string | undefined,
): Prompt[] {
  if (!functionName) {
    throw new Error(`Go prompt files require a function name. Please specify the function to call, e.g., file://${filePath}:FunctionName`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const label = prompt.label ?? `${filePath}:${functionName}`;
  
  return [
    {
      raw: fileContent,
      label,
      function: (context) => goPromptFunction(filePath, functionName, { ...context, config: prompt.config }),
      config: prompt.config,
    },
  ];
}