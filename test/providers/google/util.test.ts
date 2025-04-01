import { GoogleAuth } from 'google-auth-library';
import type { GeminiResponseData } from '../../../src/providers/google/util';
import {
  maybeCoerceToGeminiFormat,
  getGoogleClient,
  hasGoogleDefaultCredentials,
  stringifyCandidateContents,
} from '../../../src/providers/google/util';

jest.mock('google-auth-library');

describe('vertexUtil', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).cachedAuth = undefined;
  });

  describe('maybeCoerceToGeminiFormat', () => {
    it('should handle string input', () => {
      const input = 'test message';
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [{ parts: [{ text: 'test message' }] }],
        coerced: true,
        systemInstruction: undefined,
      });
    });

    it('should handle OpenAI chat format', () => {
      const input = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there' },
      ];
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi there' }] },
        ],
        coerced: true,
        systemInstruction: undefined,
      });
    });

    it('should handle OpenAI chat format with array content', () => {
      const input = [
        {
          role: 'user',
          content: ['Hello', { type: 'text', text: 'World' }],
        },
      ];
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }, { text: 'World' }],
          },
        ],
        coerced: true,
        systemInstruction: undefined,
      });
    });

    it('should handle OpenAI chat format with object content', () => {
      const input = [
        {
          role: 'user',
          content: { text: 'Hello' },
        },
      ];
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
        coerced: true,
        systemInstruction: undefined,
      });
    });

    it('should handle single content object', () => {
      const input = {
        parts: [{ text: 'test' }],
      };
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [{ parts: [{ text: 'test' }] }],
        coerced: true,
        systemInstruction: undefined,
      });
    });

    it('should extract system instructions', () => {
      const input = [
        { role: 'system', content: 'System instruction' },
        { role: 'user', content: 'User message' },
      ];
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: [{ role: 'user', parts: [{ text: 'User message' }] }],
        coerced: true,
        systemInstruction: {
          parts: [{ text: 'System instruction' }],
        },
      });
    });

    it('should handle malformed function calls with finishReason MALFORMED_FUNCTION_CALL', () => {
      const input = [
        {
          role: 'model',
          content: {
            functionCall: {
              name: 'test',
              args: { param: 'value' },
            },
          },
          finishReason: 'MALFORMED_FUNCTION_CALL',
        },
      ];
      const result = maybeCoerceToGeminiFormat(input);
      expect(result.coerced).toBe(true);
      expect(result.contents[0].parts[0]).toEqual({
        functionCall: { name: 'test', args: { param: 'value' } },
      });
    });

    it('should handle unknown format', () => {
      const input = { unknown: 'format' };
      const result = maybeCoerceToGeminiFormat(input);
      expect(result).toEqual({
        contents: input,
        coerced: false,
        systemInstruction: undefined,
      });
    });

    it('should handle undefined input', () => {
      const result = maybeCoerceToGeminiFormat(undefined);
      expect(result).toEqual({
        contents: undefined,
        coerced: false,
        systemInstruction: undefined,
      });
    });

    it('should handle invalid input formats gracefully', () => {
      const invalidInputs = [123, true, Symbol('test'), () => {}, new Date()];
      invalidInputs.forEach((input) => {
        const result = maybeCoerceToGeminiFormat(input);
        expect(result.coerced).toBe(false);
        expect(result.contents).toEqual(input);
      });
    });
  });

  describe('getGoogleClient', () => {
    it('should create and return Google client', async () => {
      const mockClient = { name: 'mockClient' };
      const mockProjectId = 'test-project';
      const mockAuth = {
        getClient: jest.fn().mockResolvedValue(mockClient),
        getProjectId: jest.fn().mockResolvedValue(mockProjectId),
      };

      jest.mocked(GoogleAuth).mockImplementation(() => mockAuth as any);

      const result = await getGoogleClient();
      expect(result).toEqual({
        client: mockClient,
        projectId: mockProjectId,
      });
    });

    it('should handle missing scopes gracefully', async () => {
      const mockAuth = {
        getClient: jest.fn().mockResolvedValue(undefined),
        getProjectId: jest.fn().mockResolvedValue(undefined),
      };

      jest.mocked(GoogleAuth).mockImplementation(() => mockAuth as any);

      const result = await getGoogleClient();
      expect(result).toEqual({
        client: undefined,
        projectId: undefined,
      });
    });
  });

  describe('hasGoogleDefaultCredentials', () => {
    it('should return true when credentials are available', async () => {
      const mockAuth = {
        getClient: jest.fn().mockResolvedValue({}),
        getProjectId: jest.fn().mockResolvedValue('test-project'),
      };

      jest.mocked(GoogleAuth).mockImplementation(() => mockAuth as any);

      await expect(hasGoogleDefaultCredentials()).resolves.toBe(true);
    });
  });

  describe('stringifyCandidateContents', () => {
    it('should stringify text parts', () => {
      const data: GeminiResponseData = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello' }, { text: 'World' }],
            },
            safetyRatings: [],
          },
        ],
      };

      expect(stringifyCandidateContents(data)).toBe('HelloWorld');
    });

    it('should stringify function call parts', () => {
      const data: GeminiResponseData = {
        candidates: [
          {
            content: {
              parts: [{ functionCall: { name: 'testFunc', args: { param: 'value' } } }],
            },
            safetyRatings: [],
          },
        ],
      };

      expect(stringifyCandidateContents(data)).toBe(
        JSON.stringify({ functionCall: { name: 'testFunc', args: { param: 'value' } } }),
      );
    });

    it('should handle safety ratings and blocked content', () => {
      const data: GeminiResponseData = {
        candidates: [
          {
            content: { parts: [{ text: 'Blocked content' }] },
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                probability: 'HIGH',
                blocked: true,
              },
            ],
          },
        ],
      };

      expect(stringifyCandidateContents(data)).toContain('Blocked content');
    });

    it('should handle empty content', () => {
      const data: GeminiResponseData = {
        candidates: [
          {
            content: { parts: [] },
            safetyRatings: [],
          },
        ],
      };

      expect(stringifyCandidateContents(data)).toBe('');
    });

    it('should handle undefined content', () => {
      const data: GeminiResponseData = { candidates: [] };
      expect(stringifyCandidateContents(data)).toBe('');
    });
  });
});
