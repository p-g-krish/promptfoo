import { getEnvBool } from '../../src/envars';
import {
  calculateCost,
  isPromptfooSampleTarget,
  parseChatPrompt,
  toTitleCase,
} from '../../src/providers/shared';

jest.mock('../../src/envars');

describe('Shared Provider Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.mocked(getEnvBool).mockReturnValue(false);
  });

  describe('parseChatPrompt', () => {
    it('should parse YAML prompt', () => {
      const yamlPrompt = `
        - role: user
          content: Hello
        - role: assistant
          content: Hi there!
      `;
      const result = parseChatPrompt(yamlPrompt, []);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
    });

    it('should parse JSON prompt', () => {
      const jsonPrompt = JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
      const result = parseChatPrompt(jsonPrompt, []);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
    });

    it('should return default value for non-YAML, non-JSON prompt', () => {
      const defaultValue = [{ role: 'user', content: 'Default' }];
      const result = parseChatPrompt('Just a regular string', defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = '- role: user\n  content: :\n';
      expect(() => parseChatPrompt(invalidYaml, [])).toThrow(
        'Chat Completion prompt is not a valid YAML string',
      );
    });

    it('should throw error for invalid JSON when PROMPTFOO_REQUIRE_JSON_PROMPTS is true', () => {
      jest.mocked(getEnvBool).mockClear();
      jest.mocked(getEnvBool).mockReturnValue(true);

      const invalidJson = '"role": "user", "content": "Hello" }';
      expect(() => parseChatPrompt(invalidJson, [])).toThrow(
        'Chat Completion prompt is not a valid JSON string',
      );
    });

    it('should throw error for invalid JSON when prompt starts with { or [', () => {
      jest.mocked(getEnvBool).mockClear();
      jest.mocked(getEnvBool).mockReturnValue(false);

      const invalidJson = '{ "invalid: "json" }';
      expect(() => parseChatPrompt(invalidJson, [])).toThrow(
        'Chat Completion prompt is not a valid JSON string',
      );
    });
  });

  describe('toTitleCase', () => {
    it('should convert string to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('UPPERCASE STRING')).toBe('Uppercase String');
      expect(toTitleCase('mixed CASE string')).toBe('Mixed Case String');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should handle single word', () => {
      expect(toTitleCase('word')).toBe('Word');
    });
  });

  describe('calculateCost', () => {
    const models = [
      { id: 'model1', cost: { input: 0.001, output: 0.002 } },
      { id: 'model2', cost: { input: 0.003, output: 0.004 } },
    ];

    it('should calculate cost correctly', () => {
      const cost = calculateCost('model1', {}, 1000, 500, models);
      expect(cost).toBe(2);
    });

    it('should use config cost if provided', () => {
      const cost = calculateCost('model1', { cost: 0.005 }, 1000, 500, models);
      expect(cost).toBe(7.5);
    });

    it('should return undefined if model not found', () => {
      const cost = calculateCost('nonexistent', {}, 1000, 500, models);
      expect(cost).toBeUndefined();
    });

    it('should return undefined if tokens are not finite', () => {
      expect(calculateCost('model1', {}, Number.NaN, 500, models)).toBeUndefined();
      expect(calculateCost('model1', {}, 1000, Infinity, models)).toBeUndefined();
    });

    it('should return undefined if tokens are undefined', () => {
      expect(calculateCost('model1', {}, undefined, 500, models)).toBeUndefined();
      expect(calculateCost('model1', {}, 1000, undefined, models)).toBeUndefined();
    });
  });

  describe('isPromptfooSampleTarget', () => {
    it('should return true when url includes promptfoo.app', () => {
      const provider = {
        id: () => 'test',
        callApi: jest.fn(),
        config: {
          url: 'https://api.promptfoo.app/v1',
        },
      };
      expect(isPromptfooSampleTarget(provider)).toBe(true);
    });

    it('should return true when url includes promptfoo.dev', () => {
      const provider = {
        id: () => 'test',
        callApi: jest.fn(),
        config: {
          url: 'https://api.promptfoo.dev/v1',
        },
      };
      expect(isPromptfooSampleTarget(provider)).toBe(true);
    });

    it('should return false when url does not include promptfoo domains', () => {
      const provider = {
        id: () => 'test',
        callApi: jest.fn(),
        config: {
          url: 'https://api.other-domain.com/v1',
        },
      };
      expect(isPromptfooSampleTarget(provider)).toBe(false);
    });

    it('should return false when provider.config is undefined', () => {
      const provider = {
        id: () => 'test',
        callApi: jest.fn(),
      };
      expect(isPromptfooSampleTarget(provider) ?? false).toBe(false);
    });

    it('should return false when provider.config.url is undefined', () => {
      const provider = {
        id: () => 'test',
        callApi: jest.fn(),
        config: {},
      };
      expect(isPromptfooSampleTarget(provider) ?? false).toBe(false);
    });
  });
});
