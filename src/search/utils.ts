import { getEnvString } from '../envars';

export function getOpenAIKey(): string | undefined {
  return getEnvString('OPENAI_API_KEY');
}
