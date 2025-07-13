import { n as rougeN, l as rougeL, s as rougeS } from 'js-rouge';
import type { AssertionParams, GradingResult } from '../types';
import invariant from '../util/invariant';

export function handleRougeScore({
  baseType,
  assertion,
  renderedValue,
  outputString,
  inverse,
}: AssertionParams): GradingResult {
  invariant(typeof renderedValue === 'string', '"rouge" assertion type must be a string value');
  const fnName = baseType[baseType.length - 1] as 'n' | 'l' | 's';
  const rougeMethod = fnName === 'n' ? rougeN : fnName === 'l' ? rougeL : rougeS;
  const score = rougeMethod(outputString, renderedValue, {});
  const threshold = assertion.threshold ?? 0.75;
  const pass = score >= threshold !== inverse;
  return {
    pass,
    score: inverse ? 1 - score : score,
    reason: pass
      ? `${baseType.toUpperCase()} score ${score.toFixed(
          2,
        )} is greater than or equal to threshold ${threshold}`
      : `${baseType.toUpperCase()} score ${score.toFixed(2)} is less than threshold ${threshold}`,
    assertion,
  };
}
