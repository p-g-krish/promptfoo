// Helpers for parsing CSV eval files, shared by frontend and backend. Cannot import native modules.
import logger from './logger';
import { BaseAssertionTypesSchema } from './types';
import { isJavascriptFile } from './util/fileExtensions';
import invariant from './util/invariant';

import type { Assertion, AssertionType, BaseAssertionTypes, CsvRow, TestCase } from './types';

const DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD = 0.8;

let _assertionRegex: RegExp | null = null;
function getAssertionRegex(): RegExp {
  if (!_assertionRegex) {
    const assertionTypesRegex = BaseAssertionTypesSchema.options.join('|');
    _assertionRegex = new RegExp(
      `^(not-)?(${assertionTypesRegex})(?:\\((\\d+(?:\\.\\d+)?)\\))?(?::([\\s\\S]*))?$`,
    );
  }
  return _assertionRegex;
}

export function assertionFromString(expected: string): Assertion {
  // Legacy options
  if (
    expected.startsWith('javascript:') ||
    expected.startsWith('fn:') ||
    expected.startsWith('eval:') ||
    (expected.startsWith('file://') && isJavascriptFile(expected.slice('file://'.length)))
  ) {
    // TODO(1.0): delete eval: legacy option
    let sliceLength = 0;
    if (expected.startsWith('javascript:')) {
      sliceLength = 'javascript:'.length;
    }
    if (expected.startsWith('fn:')) {
      sliceLength = 'fn:'.length;
    }
    if (expected.startsWith('eval:')) {
      sliceLength = 'eval:'.length;
    }

    const functionBody = expected.slice(sliceLength).trim();
    return {
      type: 'javascript',
      value: functionBody,
    };
  }
  if (expected.startsWith('grade:') || expected.startsWith('llm-rubric:')) {
    return {
      type: 'llm-rubric',
      value: expected.slice(expected.startsWith('grade:') ? 6 : 11),
    };
  }
  if (
    expected.startsWith('python:') ||
    (expected.startsWith('file://') && (expected.endsWith('.py') || expected.includes('.py:')))
  ) {
    const sliceLength = expected.startsWith('python:') ? 'python:'.length : 'file://'.length;
    const functionBody = expected.slice(sliceLength).trim();
    return {
      type: 'python',
      value: functionBody,
    };
  }

  const regexMatch = expected.match(getAssertionRegex());

  if (regexMatch) {
    const [_, notPrefix, type, thresholdStr, value] = regexMatch as [
      string,
      string,
      BaseAssertionTypes,
      string,
      // Note: whether value is defined depends on the type of assertion.
      string?,
    ];
    const fullType: AssertionType = notPrefix ? `not-${type}` : type;
    const parsedThreshold = thresholdStr ? Number.parseFloat(thresholdStr) : Number.NaN;
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : undefined;

    if (
      type === 'contains-all' ||
      type === 'contains-any' ||
      type === 'icontains-all' ||
      type === 'icontains-any'
    ) {
      return {
        type: fullType as AssertionType,
        value: value ? value.split(',').map((s) => s.trim()) : value,
      };
    } else if (type === 'contains-json' || type === 'is-json') {
      return {
        type: fullType as AssertionType,
        value,
      };
    } else if (
      type === 'answer-relevance' ||
      type === 'classifier' ||
      type === 'context-faithfulness' ||
      type === 'context-recall' ||
      type === 'context-relevance' ||
      type === 'cost' ||
      type === 'latency' ||
      type === 'levenshtein' ||
      type === 'perplexity-score' ||
      type === 'perplexity' ||
      type === 'rouge-n' ||
      type === 'similar' ||
      type === 'starts-with'
    ) {
      const defaultThreshold = type === 'similar' ? DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD : 0.75;
      return {
        type: fullType as AssertionType,
        value: value?.trim?.(),
        threshold: threshold ?? defaultThreshold,
      };
    } else {
      return {
        type: fullType as AssertionType,
        value: value?.trim?.(),
      };
    }
  }

  // Default to equality
  return {
    type: 'equals',
    value: expected,
  };
}

const uniqueErrorMessages = new Set<string>();

export function testCaseFromCsvRow(row: CsvRow): TestCase {
  const vars: Record<string, string> = {};
  const asserts: Assertion[] = [];
  const options: TestCase['options'] = {};
  const metadata: Record<string, any> = {};
  let providerOutput: string | object | undefined;
  let description: string | undefined;
  let metric: string | undefined;
  let threshold: number | undefined;

  const specialKeys = [
    'expected',
    'prefix',
    'suffix',
    'description',
    'providerOutput',
    'metric',
    'threshold',
    'metadata',
  ].map((k) => `_${k}`);

  // Remove leading and trailing whitespace from keys, as leading/trailing whitespace interferes with
  // meta key parsing.
  const sanitizedRows = Object.entries(row).map(([key, value]) => [key.trim(), value]);

  for (const [key, value] of sanitizedRows) {
    // Check for single underscore usage with reserved keys
    if (
      !key.startsWith('__') &&
      specialKeys.some((k) => key.startsWith(k)) &&
      !uniqueErrorMessages.has(key)
    ) {
      const error = `You used a single underscore for the key "${key}". Did you mean to use "${key.replace('_', '__')}" instead?`;
      uniqueErrorMessages.add(key);
      logger.warn(error);
    }
    if (key.startsWith('__expected')) {
      if (value.trim() !== '') {
        asserts.push(assertionFromString(value.trim()));
      }
    } else if (key === '__prefix') {
      options.prefix = value;
    } else if (key === '__suffix') {
      options.suffix = value;
    } else if (key === '__description') {
      description = value;
    } else if (key === '__providerOutput') {
      providerOutput = value;
    } else if (key === '__metric') {
      metric = value;
    } else if (key === '__threshold') {
      threshold = Number.parseFloat(value);
    } else if (key.startsWith('__metadata:')) {
      const metadataKey = key.slice('__metadata:'.length);
      if (metadataKey.endsWith('[]')) {
        // Handle array metadata with comma splitting and escape support
        const arrayKey = metadataKey.slice(0, -2);
        if (value.trim() !== '') {
          // Split by commas, but respect escaped commas (\,)
          const values = value
            .split(/(?<!\\),/)
            .map((v) => v.trim())
            .map((v) => v.replace('\\,', ','));
          metadata[arrayKey] = values;
        }
      } else {
        // Handle single value metadata
        if (value.trim() !== '') {
          metadata[metadataKey] = value;
        }
      }
    } else if (key === '__metadata' && !uniqueErrorMessages.has(key)) {
      uniqueErrorMessages.add(key);
      logger.warn(
        'The "__metadata" column requires a key, e.g. "__metadata:category". This column will be ignored.',
      );
    } else {
      vars[key] = value;
    }
  }

  for (const assert of asserts) {
    assert.metric = metric;
  }

  return {
    vars,
    assert: asserts,
    options,
    ...(description ? { description } : {}),
    ...(providerOutput ? { providerOutput } : {}),
    ...(threshold ? { threshold } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

/**
 * Serialize a list of VarMapping objects as a CSV string.
 * @param vars - The list of VarMapping objects to serialize.
 * @returns A CSV string.
 */
export function serializeObjectArrayAsCSV(vars: object[]): string {
  invariant(vars.length > 0, 'No variables to serialize');
  const columnNames = Object.keys(vars[0]).join(',');
  const rows = vars
    .map(
      (result) =>
        `"${Object.values(result)
          .map((value) => value.toString().replace(/"/g, '""'))
          .join('","')}"`,
    )
    .join('\n');
  return [columnNames, rows].join('\n') + '\n';
}
