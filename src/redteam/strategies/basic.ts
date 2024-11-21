import type { TestCase, TestCaseWithPlugin } from '../../types';

export async function addBasicTestCases(
  testCases: TestCaseWithPlugin[],
  injectVar: string,
  config: Record<string, unknown> = { enabled: true },
): Promise<TestCase[]> {
  if (config.enabled === false) {
    return [];
  }
  return testCases;
}
