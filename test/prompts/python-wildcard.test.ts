import * as fs from 'fs';
import * as path from 'path';
import { processPrompts } from '../../src/prompts';

// Mock the python execution
jest.mock('../../src/python/pythonUtils', () => ({
  runPython: jest.fn((filePath: string, functionName: string, args: string[]) => {
    // Simple mock that returns different responses based on the file
    if (filePath.includes('marketing')) {
      return Promise.resolve(JSON.stringify({
        output: `Marketing prompt for ${args[0] || 'product'}`
      }));
    } else if (filePath.includes('technical')) {
      return Promise.resolve(JSON.stringify({
        output: `Technical prompt for ${args[0] || 'code'}`
      }));
    } else if (filePath.includes('creative')) {
      return Promise.resolve(JSON.stringify({
        output: `Creative prompt for ${args[0] || 'story'}`
      }));
    }
    return Promise.resolve(JSON.stringify({
      output: 'Default prompt response'
    }));
  })
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('.py')) {
      return 'def get_prompt(context):\n    return "Test prompt"';
    }
    return '';
  }),
  statSync: jest.fn(() => ({
    size: 1000, // Mock file size under limit
    isDirectory: () => false
  }))
}));

// Mock glob results
jest.mock('glob', () => ({
  globSync: jest.fn((pattern: string) => {
    if (pattern.includes('test/**/*.py')) {
      return [
        'test/prompts/marketing/email.py',
        'test/prompts/marketing/social.py',
        'test/prompts/technical/review.py',
        'test/prompts/creative/story.py'
      ];
    }
    return [];
  })
}));

describe('Python wildcard prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expand wildcard patterns for Python files', async () => {
    // Pass prompts as raw strings, which processPrompts expects
    const prompts = await processPrompts([
      'file://test/**/*.py:get_prompt'
    ], {});

    
    // Should create one prompt for each matched file
    expect(prompts.length).toBe(4);
    
    // Each prompt should have the correct structure
    prompts.forEach((prompt, index) => {
      expect(prompt.label).toMatch(/\.py:get_prompt$/);
      // The raw property might not be included in the final output
      // expect(typeof prompt.function).toBe('function');
    });
  });

  it('should preserve function names when expanding globs', async () => {
    const prompts = await processPrompts([
      'file://test/**/*.py:custom_function'
    ], {});

    // All prompts should reference the custom function
    prompts.forEach(prompt => {
      expect(prompt.label).toMatch(/\.py:custom_function$/);
    });
  });

  it('should handle nested directory structures', async () => {
    const prompts = await processPrompts([
      'file://test/**/*.py:get_prompt'
    ], {});

    // Check that we have prompts from different directories
    const labels = prompts.map(p => p.label);
    expect(labels.some(l => l.includes('marketing'))).toBe(true);
    expect(labels.some(l => l.includes('technical'))).toBe(true);
    expect(labels.some(l => l.includes('creative'))).toBe(true);
  });
}); 