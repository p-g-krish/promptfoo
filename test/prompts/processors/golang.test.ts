import * as fs from 'fs';
import { processGolangFile, goPromptFunction } from '../../../src/prompts/processors/golang';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => {
    const mockProcess = {
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate Go program output
            callback(Buffer.from(JSON.stringify({
              prompt: 'Test prompt output'
            })));
          }
        })
      },
      stderr: {
        on: jest.fn()
      },
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Exit code 0
        }
      })
    };
    return mockProcess;
  }),
  exec: jest.fn((cmd, opts, callback) => {
    // Mock successful compilation
    if (typeof opts === 'function') {
      callback = opts;
    }
    callback(null, '', '');
  })
}));

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdtempSync: jest.fn(() => '/tmp/test-go-dir'),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('.go')) {
      return `package main

func TestPrompt(context PromptContext) string {
    return "Test prompt from Go"
}`;
    }
    return '';
  }),
  writeFileSync: jest.fn(),
  rmSync: jest.fn()
}));

describe('processGolangFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require a function name', () => {
    expect(() => {
      processGolangFile('/path/to/file.go', {}, undefined);
    }).toThrow('Go prompt files require a function name');
  });

  it('should process a Go file with a function name', () => {
    const result = processGolangFile('/path/to/file.go', {}, 'TestPrompt');
    
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('/path/to/file.go:TestPrompt');
    expect(result[0].raw).toContain('func TestPrompt');
    expect(typeof result[0].function).toBe('function');
  });

  it('should include config in the prompt', () => {
    const config = { temperature: 0.7 };
    const result = processGolangFile('/path/to/file.go', { config }, 'TestPrompt');
    
    expect(result[0].config).toEqual(config);
  });

  it('should use custom label if provided', () => {
    const result = processGolangFile('/path/to/file.go', { label: 'Custom Label' }, 'TestPrompt');
    
    expect(result[0].label).toBe('Custom Label');
  });
});

describe('goPromptFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compile and execute a Go prompt function', async () => {
    const context = {
      vars: { test: 'value' },
      provider: { id: 'test-provider' }
    };

    const result = await goPromptFunction('/path/to/file.go', 'TestPrompt', context);
    
    expect(result).toBe('Test prompt output');
    expect(fs.mkdtempSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should clean up temporary directory after execution', async () => {
    const context = {
      vars: {},
      provider: { id: 'test-provider' }
    };

    await goPromptFunction('/path/to/file.go', 'TestPrompt', context);
    
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/test-go-dir', { recursive: true, force: true });
  });

  it('should handle compilation errors', async () => {
    // Mock compilation failure
    const { exec } = require('child_process');
    exec.mockImplementationOnce((cmd: string, opts: any, callback: any) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(new Error('Compilation failed'));
    });

    const context = {
      vars: {},
      provider: { id: 'test-provider' }
    };

    await expect(goPromptFunction('/path/to/file.go', 'TestPrompt', context))
      .rejects.toThrow('Compilation failed');
  });

  it('should handle execution errors', async () => {
    // Mock execution failure
    const { spawn } = require('child_process');
    spawn.mockImplementationOnce(() => ({
      stdout: { on: jest.fn() },
      stderr: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Error message'));
          }
        })
      },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(1); // Non-zero exit code
        }
      })
    }));

    const context = {
      vars: {},
      provider: { id: 'test-provider' }
    };

    await expect(goPromptFunction('/path/to/file.go', 'TestPrompt', context))
      .rejects.toThrow('Go process exited with code 1');
  });
}); 