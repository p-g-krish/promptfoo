import {
  addOtherEncodings,
  EncodingType,
  toCamelCase,
  toEmojiEncoding,
  toMorseCode,
  toPigLatin,
} from '../../../src/redteam/strategies/otherEncodings';

import type { TestCase } from '../../../src/types';

describe('other encodings strategy', () => {
  const testCases: TestCase[] = [
    {
      vars: {
        prompt: 'Hello World! 123',
        expected: 'normal value',
      },
      assert: [
        {
          type: 'equals',
          value: 'expected value',
          metric: 'original-metric',
        },
      ],
    },
  ];

  describe('Morse code', () => {
    it('should convert text to Morse code', () => {
      const result = addOtherEncodings(testCases, 'prompt', EncodingType.MORSE);
      expect(result[0].vars!.prompt).toBe(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -.. -.-.-- / .---- ..--- ...--',
      );
      expect(result[0].assert?.[0].metric).toBe('original-metric/Morse');

      // Check that other vars are not affected
      expect(result[0].vars!.expected).toBe('normal value');

      // Check that metadata and assertion are updated correctly
      expect(result[0].metadata?.strategyId).toBe('morse');
      expect(result[0].metadata?.encodingType).toBe(EncodingType.MORSE);
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });

    it('should handle empty string', () => {
      const emptyCase: TestCase[] = [
        {
          vars: { prompt: '' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(emptyCase, 'prompt', EncodingType.MORSE);
      expect(result[0].vars!.prompt).toBe('');
    });

    it('should handle special characters not in morse map', () => {
      const specialCase: TestCase[] = [
        {
          vars: { prompt: 'Hello % ^ #' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(specialCase, 'prompt', EncodingType.MORSE);
      expect(result[0].vars!.prompt).toBe('.... . .-.. .-.. --- / % / ^ / #');
    });
  });

  describe('Pig Latin', () => {
    it('should convert text to Pig Latin', () => {
      const result = addOtherEncodings(testCases, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('elloHay orldWay! 123');
      expect(result[0].assert?.[0].metric).toBe('original-metric/PigLatin');

      // Check that other vars are not affected
      expect(result[0].vars!.expected).toBe('normal value');

      // Check that metadata and assertion are updated correctly
      expect(result[0].metadata?.strategyId).toBe('piglatin');
      expect(result[0].metadata?.encodingType).toBe(EncodingType.PIG_LATIN);
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });

    it('should handle words with no vowels', () => {
      const noVowelCase: TestCase[] = [
        {
          vars: { prompt: 'cry shy' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(noVowelCase, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('cryay shyay');
    });

    it('should handle words starting with numbers', () => {
      const numericCase: TestCase[] = [
        {
          vars: { prompt: '123 hello 456world' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(numericCase, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('123 ellohay 456world');
    });

    it('should handle words with multiple punctuation', () => {
      const punctuationCase: TestCase[] = [
        {
          vars: { prompt: 'hello!? world...' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(punctuationCase, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('ellohay!? orldway...');
    });

    it('should handle empty string', () => {
      const emptyCase: TestCase[] = [
        {
          vars: { prompt: '' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(emptyCase, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('');
    });

    it('should handle words starting with vowels', () => {
      const vowelCase: TestCase[] = [
        {
          vars: { prompt: 'eat apple ice' },
          assert: [{ type: 'equals', value: '', metric: 'test' }],
        },
      ];
      const result = addOtherEncodings(vowelCase, 'prompt', EncodingType.PIG_LATIN);
      expect(result[0].vars!.prompt).toBe('eatway appleway iceway');
    });
  });

  describe('camelCase', () => {
    it('should convert text to camelCase', () => {
      const result = addOtherEncodings(testCases, 'prompt', EncodingType.CAMEL_CASE);
      expect(result[0].vars!.prompt).toBe('helloWorld!123');
      expect(result[0].assert?.[0].metric).toBe('original-metric/CamelCase');

      expect(result[0].metadata?.strategyId).toBe('camelcase');
      expect(result[0].metadata?.encodingType).toBe(EncodingType.CAMEL_CASE);
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });
  });

  describe('emoji encoding', () => {
    it('should encode text using variation selectors', () => {
      const result = addOtherEncodings(testCases, 'prompt', EncodingType.EMOJI);
      const encoded = result[0].vars!.prompt as string;
      const chars = Array.from(encoded);
      expect(chars[0]).toBe('😊');
      for (const ch of chars.slice(1)) {
        const code = ch.codePointAt(0)!;
        const valid = (code >= 0xfe00 && code <= 0xfe0f) || (code >= 0xe0100 && code <= 0xe01ef);
        expect(valid).toBe(true);
      }
      // decode and verify round trip
      const decodedBytes: number[] = [];
      for (const ch of chars.slice(1)) {
        const code = ch.codePointAt(0)!;
        if (code >= 0xfe00 && code <= 0xfe0f) {
          decodedBytes.push(code - 0xfe00);
        } else if (code >= 0xe0100 && code <= 0xe01ef) {
          decodedBytes.push(code - 0xe0100 + 16);
        }
      }
      const decoded = Buffer.from(decodedBytes).toString('utf8');
      expect(decoded).toBe(testCases[0].vars!.prompt);

      expect(result[0].metadata?.strategyId).toBe('emoji');
      expect(result[0].metadata?.encodingType).toBe(EncodingType.EMOJI);
    });
  });

  describe('encoding type handling', () => {
    it('should use Morse code as default encoding', () => {
      const result = addOtherEncodings(testCases, 'prompt');
      expect(result[0].vars!.prompt).toBe(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -.. -.-.-- / .---- ..--- ...--',
      );
      expect(result[0].metadata?.encodingType).toBe(EncodingType.MORSE);
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });

    it('should preserve other test case properties', () => {
      const result = addOtherEncodings(testCases, 'prompt', EncodingType.MORSE);
      expect(result[0].vars!.expected).toBe('normal value');
      expect(result[0].metadata?.strategyId).toBe('morse');
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });

    it('should handle invalid encoding type by defaulting to Morse', () => {
      const result = addOtherEncodings(testCases, 'prompt', 'invalid' as EncodingType);
      expect(result[0].vars!.prompt).toBe(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -.. -.-.-- / .---- ..--- ...--',
      );
      expect(result[0].metadata?.originalText).toBe('Hello World! 123');
    });
  });

  describe('direct encoding functions', () => {
    it('should convert to morse code directly', () => {
      expect(toMorseCode('SOS')).toBe('... --- ...');
      expect(toMorseCode('hello@world.com')).toBe(
        '.... . .-.. .-.. --- .--.-. .-- --- .-. .-.. -.. .-.-.- -.-. --- --',
      );
    });

    it('should convert to pig latin directly', () => {
      expect(toPigLatin('eat')).toBe('eatway');
      expect(toPigLatin('pig')).toBe('igpay');
      expect(toPigLatin('latin')).toBe('atinlay');
      expect(toPigLatin('')).toBe('');
      expect(toPigLatin('123')).toBe('123');
    });

    it('should convert to camelCase directly', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('Hello-World!')).toBe('hello-World!');
    });

    it('should convert to emoji encoding directly', () => {
      const encoded = toEmojiEncoding('abc');
      const chars = Array.from(encoded);
      expect(chars[0]).toBe('😊');
      const bytes: number[] = [];
      for (const ch of chars.slice(1)) {
        const code = ch.codePointAt(0)!;
        if (code >= 0xfe00 && code <= 0xfe0f) {
          bytes.push(code - 0xfe00);
        } else if (code >= 0xe0100 && code <= 0xe01ef) {
          bytes.push(code - 0xe0100 + 16);
        }
      }
      expect(Buffer.from(bytes).toString('utf8')).toBe('abc');
    });

    it('should handle leading, trailing, and multiple spaces in toCamelCase', () => {
      expect(toCamelCase('  hello world')).toBe('helloWorld');
      expect(toCamelCase('hello world   ')).toBe('helloWorld');
      expect(toCamelCase('  hello   world  ')).toBe('helloWorld');
      expect(toCamelCase('hello    world')).toBe('helloWorld');
      expect(toCamelCase('   multiple   spaces   here   ')).toBe('multipleSpacesHere');
    });
  });
});
