import { processPrompts } from '../../src/prompts';

// Mock child_process for Go compilation
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => {
    const mockProcess = {
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from(JSON.stringify({
              prompt: 'Go prompt output'
            })));
          }
        })
      },
      stderr: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      })
    };
    return mockProcess;
  }),
  exec: jest.fn((cmd, opts, callback) => {
    if (typeof opts === 'function') {
      callback = opts;
    }
    callback(null, '', '');
  })
}));

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn((path: string) => {
    if (path.includes('test/**/*.go')) {
      return true;
    }
    return jest.requireActual('fs').existsSync(path);
  }),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('api.go')) {
      return `package main

func GenerateAPI(context PromptContext) string {
    return "API generation prompt"
}

func GenerateSchema(context PromptContext) string {
    return "Schema generation prompt"
}`;
    }
    if (path.includes('validation.go')) {
      return `package main

func ValidateSecurity(context PromptContext) string {
    return "Security validation prompt"
}`;
    }
    return 'package main\n\nfunc DefaultPrompt(context PromptContext) string { return "Default"; }';
  }),
  mkdtempSync: jest.fn(() => '/tmp/test-go'),
  writeFileSync: jest.fn(),
  rmSync: jest.fn()
}));

// Mock glob results
jest.mock('glob', () => ({
  globSync: jest.fn((pattern: string) => {
    if (pattern.includes('test/**/api/*.go')) {
      return [
        'test/prompts/api/rest.go',
        'test/prompts/api/graphql.go'
      ];
    }
    if (pattern.includes('test/**/validation/*.go')) {
      return ['test/prompts/validation/security.go'];
    }
    if (pattern.includes('test/**/*.go')) {
      return [
        'test/prompts/api/rest.go',
        'test/prompts/api/graphql.go',
        'test/prompts/validation/security.go'
      ];
    }
    return [];
  })
}));

describe('Go wildcard prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expand wildcard patterns for Go files with function names', async () => {
    const prompts = await processPrompts([
      'file://test/**/api/*.go:GenerateAPI'
    ], {});

    // Should create one prompt for each matched file
    expect(prompts.length).toBe(2);
    
    // Each prompt should reference the GenerateAPI function
    prompts.forEach((prompt) => {
      expect(prompt.label).toMatch(/\.go:GenerateAPI$/);
      expect(typeof prompt.function).toBe('function');
    });
  });

  it('should handle multiple wildcard patterns with different functions', async () => {
    const prompts = await processPrompts([
      'file://test/**/api/*.go:GenerateAPI',
      'file://test/**/api/*.go:GenerateSchema',
      'file://test/**/validation/*.go:ValidateSecurity'
    ], {});

    // Should create prompts for each pattern
    expect(prompts.length).toBe(5); // 2 + 2 + 1
    
    // Check that we have the right mix of functions
    const apiPrompts = prompts.filter(p => p.label.includes('GenerateAPI'));
    const schemaPrompts = prompts.filter(p => p.label.includes('GenerateSchema'));
    const securityPrompts = prompts.filter(p => p.label.includes('ValidateSecurity'));
    
    expect(apiPrompts.length).toBe(2);
    expect(schemaPrompts.length).toBe(2);
    expect(securityPrompts.length).toBe(1);
  });

  it('should require function names for Go files', async () => {
    // Unlike JavaScript, Go files require function names
    await expect(processPrompts([
      'file://test/**/*.go' // No function name
    ], {})).rejects.toThrow();
  });

  it('should handle nested directory structures', async () => {
    const prompts = await processPrompts([
      'file://test/**/*.go:DefaultPrompt'
    ], {});

    // Check that we have prompts from different directories
    const labels = prompts.map(p => p.label);
    expect(labels.some(l => l.includes('api/'))).toBe(true);
    expect(labels.some(l => l.includes('validation/'))).toBe(true);
  });
}); 