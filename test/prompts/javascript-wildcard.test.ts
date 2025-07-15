import { processPrompts } from '../../src/prompts';

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn((path: string) => {
    if (path.includes('test/**/*.js')) {
      return true;
    }
    return jest.requireActual('fs').existsSync(path);
  }),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('customer.js')) {
      return 'module.exports = function({ vars }) { return `Customer service prompt for ${vars.issue || "general"}`; };';
    }
    if (path.includes('analysis.js')) {
      return 'module.exports = (context) => { return `Analysis prompt for ${context.vars.data || "data"}`; };';
    }
    return 'module.exports = () => "Default prompt";';
  })
}));

// Mock glob results
jest.mock('glob', () => ({
  globSync: jest.fn((pattern: string) => {
    if (pattern.includes('test/**/*.js')) {
      return [
        'test/prompts/customer.js',
        'test/prompts/analysis.js',
        'test/prompts/helper.js'
      ];
    }
    return [];
  })
}));

// Mock require for JavaScript files
jest.mock('../../src/esm', () => ({
  importModule: jest.fn((filePath: string) => {
    if (filePath.includes('customer.js')) {
      return Promise.resolve({
        default: function({ vars }: any) { 
          return `Customer service prompt for ${vars?.issue || "general"}`; 
        }
      });
    }
    if (filePath.includes('analysis.js')) {
      return Promise.resolve({
        default: (context: any) => { 
          return `Analysis prompt for ${context.vars?.data || "data"}`; 
        }
      });
    }
    return Promise.resolve({
      default: () => "Default prompt"
    });
  })
}));

describe('JavaScript wildcard prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expand wildcard patterns for JavaScript files without function names', async () => {
    const prompts = await processPrompts([
      'file://test/**/*.js'
    ], {});

    // Should create one prompt for each matched file
    expect(prompts.length).toBe(3);
    
    // Each prompt should have the correct structure
    prompts.forEach((prompt) => {
      expect(prompt.label).toMatch(/\.js$/);
    });
  });

  it('should handle wildcards with function names by attempting to load from all files', async () => {
    // This demonstrates the behavior where specifying a function name
    // with wildcards tries to load that function from ALL matched files
    const prompts = await processPrompts([
      'file://test/**/*.js:myFunction'
    ], {});

    // Still creates prompts for each file, but tries to call myFunction
    expect(prompts.length).toBe(3);
    
    prompts.forEach(prompt => {
      expect(prompt.label).toMatch(/\.js:myFunction$/);
    });
  });

  it('should work correctly when JavaScript files export different function signatures', async () => {
    const prompts = await processPrompts([
      'file://test/**/*.js'
    ], {});

    // Should expand to multiple files
    expect(prompts.length).toBe(3);
    
    // All should have labels
    prompts.forEach(prompt => {
      expect(prompt.label).toBeTruthy();
    });
  });
}); 